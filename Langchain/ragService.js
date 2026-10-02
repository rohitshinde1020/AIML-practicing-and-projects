import * as dotenv from 'dotenv';
dotenv.config();

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import fs from 'fs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to extract embedding values from GoogleGenAI API response
const getValues = (response) => {
    if (response.embedding?.values) return response.embedding.values;
    if (response.embeddings?.[0]?.values) return response.embeddings[0].values;
    throw new Error("Unable to parse embedding values from response");
};

// Initialize Pinecone Client
export function getPineconeClient() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) throw new Error("PINECONE_API_KEY is missing in environment variables.");
    return new Pinecone({ apiKey });
}

// Get Embedding Helper Object for LangChain
export function getEmbeddingsObject(onSingleProgress = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing in environment variables.");
    const ai = new GoogleGenAI({ apiKey });

    return {
        embedQuery: async (text) => {
            const response = await ai.models.embedContent({
                model: 'gemini-embedding-001',
                contents: text,
                config: { outputDimensionality: 768 },
            });
            return getValues(response);
        },
        embedDocuments: async (documents) => {
            const results = [];
            for (let i = 0; i < documents.length; i++) {
                const text = typeof documents[i] === 'string' ? documents[i] : documents[i].pageContent;
                
                const response = await ai.models.embedContent({
                    model: 'gemini-embedding-001',
                    contents: text,
                    config: { outputDimensionality: 768 },
                });

                const values = getValues(response);
                results.push(values);
                
                if (onSingleProgress) {
                    onSingleProgress(i + 1, documents.length);
                }
                
                // Small delay between single requests to avoid hitting rate limits
                await delay(600);
            }
            return results;
        },
    };
}

/**
 * Indexes a PDF file into Pinecone.
 */
export async function indexDocumentTask({ pdfPath = './dsa.pdf', chunkSize = 2500, chunkOverlap = 250, onProgress = null }) {
    const startTime = Date.now();
    const notify = (step, percent, message, details = {}) => {
        if (onProgress) onProgress({ step, percent, message, details });
    };

    notify('START', 5, 'Initializing document indexer...');

    if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found at path: ${pdfPath}`);
    }

    // 1. Load PDF
    notify('LOAD_PDF', 15, `Loading PDF document: ${pdfPath}`);
    const pdfLoader = new PDFLoader(pdfPath);
    const rawDocs = await pdfLoader.load();
    notify('LOAD_PDF_COMPLETE', 25, `Loaded ${rawDocs.length} pages from PDF`);

    // 2. Chunk Documents
    notify('CHUNKING', 35, `Splitting text into chunks (Size: ${chunkSize}, Overlap: ${chunkOverlap})...`);
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });
    const chunkedDocs = await textSplitter.splitDocuments(rawDocs);
    notify('CHUNKING_COMPLETE', 45, `Created ${chunkedDocs.length} chunk(s) from document`);

    // 3. Configure Pinecone
    notify('PINECONE_INIT', 50, 'Connecting to Pinecone index...');
    const pc = getPineconeClient();
    const pineconeIndex = pc.index(process.env.PINECONE_INDEX_NAME);

    // 4. Generate Embeddings & Upsert
    const embeddings = getEmbeddingsObject((current, total) => {
        const pct = 50 + Math.round((current / total) * 40);
        notify('EMBEDDING_PROGRESS', pct, `Generating vectors & embedding: ${current}/${total} chunks...`, { current, total });
    });

    notify('UPSERTING', 90, 'Storing vector embeddings into Pinecone index...');
    await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
        pineconeIndex,
        maxConcurrency: 1,
    });

    const durationMs = Date.now() - startTime;
    notify('COMPLETE', 100, `Successfully indexed ${chunkedDocs.length} chunks into Pinecone in ${(durationMs / 1000).toFixed(1)}s!`, {
        totalChunks: chunkedDocs.length,
        totalPages: rawDocs.length,
        durationMs
    });

    return {
        totalChunks: chunkedDocs.length,
        totalPages: rawDocs.length,
        durationMs
    };
}

/**
 * Executes RAG similarity search and generates an answer using Gemini.
 */
export async function askPDFTask({ question, topK = 4, customPrompt = null }) {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing in environment variables.");
    const ai = new GoogleGenAI({ apiKey });

    const embeddings = getEmbeddingsObject();
    const pc = getPineconeClient();
    const pineconeIndex = pc.index(process.env.PINECONE_INDEX_NAME);

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
    });

    // 1. Vector Search
    const results = await vectorStore.similaritySearch(question, topK);
    const contextText = results.map(doc => doc.pageContent).filter(Boolean).join('\n---\n');

    // 2. Prompt Construction
    const prompt = customPrompt || `
You are an expert AI tutor answering questions based on the provided DSA notes.
Use ONLY the context provided below to answer the user's question. If the information isn't directly mentioned, state what the text says regarding the topic.

CONTEXT FROM PDF:
${contextText}

USER QUESTION:
${question}
`;

    // 3. Answer Generation (try gemini-3.6-flash, fallback to gemini-2.5-flash or gemini-1.5-flash if needed)
    let responseText = "";
    const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastErr = null;

    for (const model of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
            });
            responseText = response.text;
            break;
        } catch (err) {
            lastErr = err;
        }
    }

    if (!responseText && lastErr) {
        throw lastErr;
    }

    const durationMs = Date.now() - startTime;

    return {
        question,
        answer: responseText,
        retrievedDocs: results.map((doc, idx) => ({
            id: idx + 1,
            pageContent: doc.pageContent,
            metadata: doc.metadata || {}
        })),
        durationMs
    };
}

/**
 * Get Pinecone Index Status & System Info
 */
export async function getSystemStatus() {
    try {
        const pc = getPineconeClient();
        const indexName = process.env.PINECONE_INDEX_NAME;
        const index = pc.index(indexName);
        const stats = await index.describeIndexStats();

        return {
            status: 'online',
            indexName,
            dimension: stats.dimension || 768,
            totalRecordCount: stats.totalRecordCount || 0,
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasPineconeKey: !!process.env.PINECONE_API_KEY
        };
    } catch (error) {
        return {
            status: 'error',
            error: error.message,
            indexName: process.env.PINECONE_INDEX_NAME || 'Unknown',
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasPineconeKey: !!process.env.PINECONE_API_KEY
        };
    }
}
