import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// We will import the recorder logic
import { startRecorder } from './scripts/server-recorder.js';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Start the Background Recorder
console.log('--- Starting Background Recorder ---');
startRecorder();

// 2. Keep-Alive Mechanism (Self-Ping)
const APP_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
if (APP_URL.includes('onrender.com')) {
    console.log(`Keep-alive active: Pinging ${APP_URL}/ping every 14 mins`);
    setInterval(async () => {
        try {
            await axios.get(`${APP_URL}/ping`);
            console.log(`[${new Date().toLocaleTimeString()}] Self-Ping successful.`);
        } catch (err) {
            console.warn(`[${new Date().toLocaleTimeString()}] Self-Ping failed: ${err.message}`);
        }
    }, 14 * 60 * 1000); // 14 minutes
}

// 3. Keep-Alive / Health Endpoint
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// 4. Serve static files from the Vite build directory
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // Handle SPA routing - any request that reaches here gets sent to index.html
    app.use((req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.status(200).send('Radio Server is running. (Note: UI files not found - run "npm run build" first)');
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to see the UI`);
});
