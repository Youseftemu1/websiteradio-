import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { startRecorder, recorderStatus } from './scripts/server-recorder.js';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/ping', (req, res) => {
    res.send('pong');
});

// Recorder Debug Endpoint
app.get('/api/recorder-logs', (req, res) => {
    res.json(recorderStatus);
});

// --- CRITICAL DEPLOYMENT SETTING ---
// Handle React routing (SPA fallback). MUST BE LAST.
// WARNING: Do NOT change this to app.get('*') or app.get(/.*/).
// Those will CRASH on Render/Node 22 due to strict Express 5 path-to-regexp rules.
// Using app.use() bypasses the path parser and is 100% stable.
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Start the background recorder
    startRecorder();

    // Keep-alive mechanism: Ping itself every 14 minutes
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    setInterval(async () => {
        try {
            await axios.get(`${url}/ping`);
            console.log('Keep-alive ping sent successfully');
        } catch (err) {
            console.error('Keep-alive ping failed:', err.message);
        }
    }, 14 * 60 * 1000);
});
