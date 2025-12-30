import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// We will import the recorder logic
import { startRecorder } from './scripts/server-recorder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Start the Background Recorder
console.log('--- Starting Background Recorder ---');
startRecorder();

// 2. Serve static files from the Vite build directory
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // Handle SPA routing - send all requests to index.html
    app.get('/:any*', (req, res) => {
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
