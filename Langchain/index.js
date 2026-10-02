import * as dotenv from 'dotenv';
dotenv.config();

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function indexDocument() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const getValues = (response) => {
        if (response.embedding?.values) return response.embedding.values;
        if (response.embeddings?.[0]?.values) return response.embeddings[0].values;
        throw new Error("Unable to parse embedding values from response");
    };

    const embeddings = {
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
            
            // Sequential loop to strictly honor rate limits
            for (let i = 0; i < documents.length; i++) {
                const text = typeof documents[i] === 'string' ? documents[i] : documents[i].pageContent;
                
                const response = await ai.models.embedContent({
                    model: 'gemini-embedding-001',
                    contents: text,
                    config: { outputDimensionality: 768 },
                });

                results.push(getValues(response));
                console.log(`Processed ${i + 1} / ${documents.length} chunks...`);

                // Small delay between single requests to avoid hitting rate limits
                await delay(700); 
            }

            return results;
        },
    };

    // 1. Test Vector Generation
    try {
        const testVector = await embeddings.embedQuery("Hello world");
        console.log("Vector generated successfully. Length:", testVector.length);
    } catch (error) {
        console.error("Failed to generate test vector:", error);
        return;
    }

    // 2. Load PDF
    const PDF_PATH = './dsa.pdf';
    const pdfLoader = new PDFLoader(PDF_PATH);
    const rawDocs = await pdfLoader.load();
    console.log("PDF loaded");

    // 3. Chunk Documents with Larger Size (Fewer total requests)
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2500,
        chunkOverlap: 250,
    });
    const chunkedDocs = await textSplitter.splitDocuments(rawDocs);
    console.log(`Chunking Completed: Total ${chunkedDocs.length} chunks`);

    // 4. Configure Pinecone
    const pc = new Pinecone({ apiKey: process.process ? process.env.PINECONE_API_KEY : process.env.PINECONE_API_KEY });
    const pineconeIndex = pc.index(process.env.PINECONE_INDEX_NAME);
    console.log("Pinecone configured");

    // 5. Store Vectors in Pinecone
    await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
        pineconeIndex,
        maxConcurrency: 1,
    });

    console.log("Data Stored successfully!");
}

indexDocument();