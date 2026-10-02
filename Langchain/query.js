import * as dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const History = [];

async function transformQuery(question) {
    History.push({
        role: 'user',
        parts: [{ text: question }]
    });

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: History,
        config: {
            systemInstruction: `You are a query rewriting expert. Based on the provided chat history, rephrase the "Follow Up user Question" into a complete, standalone question that can be understood without the chat history.
    Only output the rewritten question and nothing else.
      `,
        },
    });

    History.pop();

    return response.text;
}

async function askPDF(question) {
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
        embedDocuments: async () => {
            throw new Error("embedDocuments is not used during query execution.");
        }
    };

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const pineconeIndex = pc.index(process.env.PINECONE_INDEX_NAME);

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
    });

    let searchQuery = question;
    if (History.length > 0) {
        console.log(`\nTransforming follow-up query...`);
        searchQuery = await transformQuery(question);
        console.log(`Transformed Query: "${searchQuery}"`);
    }

    console.log(`\nSearching for: "${searchQuery}"...`);
    const results = await vectorStore.similaritySearch(searchQuery, 3);
    const contextText = results.map(doc => doc.pageContent).filter(Boolean).join('\n---\n');

    const prompt = `
You are an expert AI tutor answering questions based on the provided DSA notes.
Use ONLY the context provided below to answer the user's question. If the information isn't directly mentioned, state what the text says regarding the topic.

CONTEXT FROM PDF:
${contextText}

USER QUESTION:
${question}
`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
    });

    console.log("\n=== AI Answer ===");
    console.log(response.text);

    History.push({ role: 'user', parts: [{ text: question }] });
    History.push({ role: 'model', parts: [{ text: response.text }] });
}

export { transformQuery, askPDF, History };

// Try a query that exists in Chapter 4 of your PDF
askPDF("How is a tree represented using an array in a heap?");