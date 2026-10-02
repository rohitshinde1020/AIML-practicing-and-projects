

import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";
import dotenv from "dotenv";

dotenv.config();

// Initialize the SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY, // Replace with your actual API key
});

const history = [];


async function chatwithai() {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite", // Use a valid model name
    contents: history,
  });

  history.push({ role: "model", parts: [{ text: response.text }] });

  console.log(response.text);
}

async function main() {
  while (true) {
    const userInput = readlineSync.question("ask me anything: ");
    history.push({ role: "user", parts: [{ text: userInput }] });
    await chatwithai();
  }
}

main();