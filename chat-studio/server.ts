import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client lazily or safely
function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Streaming Chat Endpoint with automated retry & fallback for model capacity spikes
app.post("/api/chat/stream", async (req: Request, res: Response): Promise<void> => {
  const {
    messages,
    model = "gemini-3.7-flash",
    systemInstruction,
    temperature = 0.7,
    useSearch = false,
  } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Messages array is required." });
    return;
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error:
          "Gemini API key is not configured. Please ensure GEMINI_API_KEY is available.",
      })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    return;
  }

  let isAborted = false;
  req.on("close", () => {
    isAborted = true;
  });

  try {
    const ai = getGeminiClient();

    // Map conversation history to Gemini content parts
    const formattedContents = messages
      .filter((m: { role: string; content: string }) => m && typeof m.content === "string" && m.content.trim().length > 0)
      .map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (formattedContents.length === 0) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: "No valid messages provided.",
        })}\n\n`
      );
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
      return;
    }

    const config: Record<string, unknown> = {
      temperature: Math.max(0, Math.min(2, Number(temperature) || 0.7)),
    };

    if (systemInstruction && typeof systemInstruction === "string" && systemInstruction.trim()) {
      config.systemInstruction = systemInstruction.trim();
    }

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Helper to check if an error is transient (e.g. 503 high demand, 429 quota rate spike, 500/504)
    const isTransientError = (err: unknown): boolean => {
      if (!err) return false;
      const str = String(err instanceof Error ? err.message : err);
      return (
        str.includes("503") ||
        str.includes("UNAVAILABLE") ||
        str.includes("high demand") ||
        str.includes("429") ||
        str.includes("RESOURCE_EXHAUSTED") ||
        str.includes("500") ||
        str.includes("504") ||
        str.includes("overloaded")
      );
    };

    // Candidate fallback sequence
    const fallbackCandidates: string[] = [model];
    const alternates = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.7-flash"];
    for (const alt of alternates) {
      if (!fallbackCandidates.includes(alt)) {
        fallbackCandidates.push(alt);
      }
    }

    let responseStream = null;
    let lastError: unknown = null;

    // Try candidates in sequence
    for (let i = 0; i < fallbackCandidates.length; i++) {
      if (isAborted) break;
      const candidateModel = fallbackCandidates[i];
      const maxRetries = i === 0 ? 2 : 1;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (isAborted) break;
        try {
          responseStream = await ai.models.generateContentStream({
            model: candidateModel,
            contents: formattedContents,
            config,
          });
          // Successfully obtained stream
          break;
        } catch (err: unknown) {
          lastError = err;
          console.warn(`Model [${candidateModel}] attempt ${attempt}/${maxRetries} failed:`, err instanceof Error ? err.message : err);

          if (isTransientError(err) && attempt < maxRetries) {
            // Short backoff before retry
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          } else {
            break;
          }
        }
      }

      if (responseStream) {
        break;
      }
    }

    if (!responseStream) {
      throw lastError || new Error("Failed to initialize AI stream across available models.");
    }

    for await (const chunk of responseStream) {
      if (isAborted) break;

      const text = chunk.text;
      if (text) {
        res.write(
          `data: ${JSON.stringify({
            type: "chunk",
            text,
          })}\n\n`
        );
      }

      // Check for search grounding sources if available
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && Array.isArray(groundingChunks) && groundingChunks.length > 0) {
        const sources = groundingChunks
          .map((gc) => gc.web)
          .filter(Boolean);
        if (sources.length > 0) {
          res.write(
            `data: ${JSON.stringify({
              type: "grounding",
              sources,
            })}\n\n`
          );
        }
      }
    }

    if (!isAborted) {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    }
    res.end();
  } catch (error: unknown) {
    console.error("Gemini streaming error:", error);

    // Clean up error message to prevent showing unescaped nested JSON
    let errorMessage = "An unexpected error occurred during generation.";
    if (error) {
      const rawMsg = error instanceof Error ? error.message : String(error);
      try {
        const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error?.message && typeof parsed.error.message === "string" && parsed.error.message.startsWith("{")) {
            try {
              parsed = JSON.parse(parsed.error.message);
            } catch {}
          }
          const code = parsed?.error?.code || parsed?.code;
          const status = parsed?.error?.status || parsed?.status;
          const innerMsg = parsed?.error?.message || parsed?.message;

          if (code === 503 || status === "UNAVAILABLE" || (innerMsg && innerMsg.includes("high demand"))) {
            errorMessage = "The AI model is currently experiencing high demand on Google's servers. Spikes are temporary—please click Retry in a moment.";
          } else if (code === 429 || status === "RESOURCE_EXHAUSTED") {
            errorMessage = "Rate limit reached. Please wait a brief moment before sending another prompt.";
          } else if (innerMsg && typeof innerMsg === "string") {
            errorMessage = innerMsg;
          }
        } else if (rawMsg.includes("503") || rawMsg.includes("high demand") || rawMsg.includes("UNAVAILABLE")) {
          errorMessage = "The AI model is currently experiencing high demand on Google's servers. Please click Retry in a moment.";
        } else if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
          errorMessage = "Rate limit reached. Please wait a moment and retry.";
        } else {
          errorMessage = rawMsg;
        }
      } catch {
        errorMessage = rawMsg;
      }
    }

    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: errorMessage,
        })}\n\n`
      );
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    }
  }
});

// Vite middleware or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
