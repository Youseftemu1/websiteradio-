/**
 * Standalone Radio Recorder for Server Hosting
 * 
 * This script allows you to record radio stations automatically on a server
 * without keeping a browser tab open.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use relative path since this might be run from root or from scripts folder
const RECORDINGS_DIR = path.join(__dirname, '../recordings-server');

// -- CONFIGURATION --
const schedules = [
    {
        name: 'Hala FM Tech News',
        stationId: '2',
        url: 'https://hala-alrayamedia.radioca.st/;',
        time: '13:00', // 24h format
        days: [0, 1, 2, 3, 4, 5, 6], // Everyday
        duration: 1800 // 30 minutes in seconds
    }
];

async function recordStream(schedule) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${schedule.name.replace(/\s+/g, '_')}_${timestamp}.mp3`;
    const filePath = path.join(RECORDINGS_DIR, filename);

    console.log(`[${new Date().toLocaleTimeString()}] Starting recording: ${schedule.name}`);

    try {
        const response = await axios({
            method: 'get',
            url: schedule.url,
            responseType: 'stream',
            timeout: 10000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log(`[${new Date().toLocaleTimeString()}] Recording finished: ${schedule.name}`);
                response.data.unpipe(writer);
                writer.end();
                resolve();
            }, schedule.duration * 1000);

            writer.on('finish', () => clearTimeout(timeout));
            writer.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    } catch (error) {
        console.error(`Error recording ${schedule.name}:`, error.message);
    }
}

export function startRecorder() {
    if (!fs.existsSync(RECORDINGS_DIR)) {
        fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }

    console.log('--- Radio Server Recorder Initialized ---');
    console.log(`Recordings will be saved to: ${RECORDINGS_DIR}`);

    // Check schedules every minute
    setInterval(() => {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentDay = now.getDay();

        schedules.forEach(schedule => {
            const [h, m] = schedule.time.split(':').map(Number);

            if (currentH === h && currentM === m && schedule.days.includes(currentDay)) {
                recordStream(schedule);
            }
        });
    }, 60000);

    console.log('Recorder Scheduler is active. Standing by...');
}
