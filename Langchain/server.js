import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
dotenv.config();

import { indexDocumentTask, askPDFTask, getSystemStatus } from './ragService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Setup CORS & JSON body parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage for PDF files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// API Routes

// 1. Get System Status & Index Stats
app.get('/api/status', async (req, res) => {
    try {
        const info = await getSystemStatus();
        res.json({ success: true, ...info });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Query Endpoint (query.js logic)
app.post('/api/query', async (req, res) => {
    try {
        const { question, topK = 4, customPrompt } = req.body;
        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({ success: false, error: 'Question string is required' });
        }

        console.log(`[API /api/query] Asking question: "${question}" (topK: ${topK})`);
        const result = await askPDFTask({
            question: question.trim(),
            topK: parseInt(topK, 10) || 4,
            customPrompt
        });

        res.json({
            success: true,
            question: result.question,
            answer: result.answer,
            retrievedDocs: result.retrievedDocs,
            durationMs: result.durationMs
        });
    } catch (error) {
        console.error('[API /api/query Error]:', error);
        res.status(500).json({ success: false, error: error.message || 'Error processing query' });
    }
});

// 3. Document Indexing Endpoint with Real-Time Progress SSE (index.js logic)
app.post('/api/index-sse', upload.single('pdfFile'), async (req, res) => {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendSSE = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        let pdfPath = './dsa.pdf';
        let originalName = 'dsa.pdf';

        if (req.file) {
            pdfPath = req.file.path;
            originalName = req.file.originalname;
        } else if (req.body.pdfPath) {
            pdfPath = req.body.pdfPath;
            originalName = path.basename(pdfPath);
        }

        const chunkSize = parseInt(req.body.chunkSize, 10) || 2500;
        const chunkOverlap = parseInt(req.body.chunkOverlap, 10) || 250;

        sendSSE('status', {
            step: 'INIT',
            percent: 0,
            message: `Starting indexing job for ${originalName}...`
        });

        const result = await indexDocumentTask({
            pdfPath,
            chunkSize,
            chunkOverlap,
            onProgress: (progressData) => {
                sendSSE('progress', progressData);
            }
        });

        sendSSE('complete', {
            success: true,
            filename: originalName,
            ...result
        });

        res.end();
    } catch (error) {
        console.error('[API /api/index-sse Error]:', error);
        sendSSE('error', {
            success: false,
            error: error.message || 'Failed to index document'
        });
        res.end();
    }
});

// 4. Standalone Indexing JSON endpoint
app.post('/api/index', upload.single('pdfFile'), async (req, res) => {
    try {
        let pdfPath = './dsa.pdf';
        let originalName = 'dsa.pdf';

        if (req.file) {
            pdfPath = req.file.path;
            originalName = req.file.originalname;
        } else if (req.body.pdfPath) {
            pdfPath = req.body.pdfPath;
            originalName = path.basename(pdfPath);
        }

        const chunkSize = parseInt(req.body.chunkSize, 10) || 2500;
        const chunkOverlap = parseInt(req.body.chunkOverlap, 10) || 250;

        const result = await indexDocumentTask({
            pdfPath,
            chunkSize,
            chunkOverlap
        });

        res.json({
            success: true,
            filename: originalName,
            ...result
        });
    } catch (error) {
        console.error('[API /api/index Error]:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. List available indexed PDFs in system
app.get('/api/documents', (req, res) => {
    try {
        const docs = [];
        if (fs.existsSync('./dsa.pdf')) {
            const stats = fs.statSync('./dsa.pdf');
            docs.push({
                name: 'dsa.pdf (Default Workspace File)',
                path: './dsa.pdf',
                size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                isDefault: true,
                modifiedAt: stats.mtime
            });
        }

        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    const filePath = path.join(uploadsDir, file);
                    const stats = fs.statSync(filePath);
                    docs.push({
                        name: file,
                        path: filePath,
                        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                        isDefault: false,
                        modifiedAt: stats.mtime
                    });
                }
            }
        }

        res.json({ success: true, documents: docs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`\n🚀 RAG Studio Server running at: http://localhost:${PORT}`);
    console.log(`- Indexer Service (index.js): Active`);
    console.log(`- Query Service (query.js): Active`);
});
