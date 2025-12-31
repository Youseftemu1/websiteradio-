import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import process from 'process';
import { systemSchedules } from '../src/data/systemSchedules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration from Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role is needed for server-side uploads bypassing RLS

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// -- CONFIGURATION --
const schedules = [...systemSchedules];

async function uploadToSupabase(buffer, filename, schedule, duration) {
    if (!supabase) {
        console.error('Supabase client not initialized. Cannot upload.');
        return;
    }

    try {
        console.log(`[${new Date().toLocaleTimeString()}] Uploading to Supabase Storage...`);

        // 1. Upload to Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('recordings')
            .upload(`${filename}`, buffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (storageError) throw storageError;

        // 2. Get Public URL
        const { data: urlData } = supabase.storage
            .from('recordings')
            .getPublicUrl(filename);

        const publicUrl = urlData.publicUrl;

        // 3. Save Metadata to DB
        const { error: dbError } = await supabase
            .from('recordings')
            .insert({
                station_id: schedule.stationId,
                station_name: schedule.name,
                duration: duration,
                size: buffer.length,
                url: publicUrl,
                created_at: new Date().toISOString()
            });

        if (dbError) throw dbError;

        console.log(`[${new Date().toLocaleTimeString()}] Successfully archived: ${filename}`);
    } catch (error) {
        console.error('Supabase Integration Error:', error.message);
    }
}

async function recordStream(schedule) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${schedule.name.replace(/\s+/g, '_')}_${timestamp}.mp3`;

    console.log(`[${new Date().toLocaleTimeString()}] Starting cloud recording: ${schedule.name}`);

    let buffer = Buffer.alloc(0);
    const startTime = Date.now();

    return new Promise((resolve) => {
        const timeout = setTimeout(async () => {
            console.log(`[${new Date().toLocaleTimeString()}] Recording window complete: ${schedule.name}`);
            const duration = Math.floor((Date.now() - startTime) / 1000);

            if (buffer.length === 0) {
                console.error(`ERROR: Recording ${schedule.name} failed - no data collected in buffer.`);
            } else {
                console.log(`[${new Date().toLocaleTimeString()}] Collected ${buffer.length} bytes for ${schedule.name}. Starting upload...`);
                await uploadToSupabase(buffer, filename, schedule, duration);
            }
            resolve();
        }, schedule.duration * 1000);

        // Fetch stream chunks
        axios({
            method: 'get',
            url: schedule.url,
            responseType: 'stream',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }).then(resp => {
            console.log(`[${new Date().toLocaleTimeString()}] Stream connection established for ${schedule.name}`);
            let isFirstChunk = true;
            resp.data.on('data', (chunk) => {
                if (isFirstChunk) {
                    isFirstChunk = false;
                    const head = chunk.slice(0, 10).toString();
                    if (head.includes('#EXTM3U')) {
                        console.error(`CRITICAL: ${schedule.name} URL is an M3U8 playlist, not an audio stream. This will fail.`);
                    }
                }
                buffer = Buffer.concat([buffer, chunk]);
            });
            resp.data.on('error', (err) => {
                console.error(`[${new Date().toLocaleTimeString()}] Stream error for ${schedule.name}:`, err.message);
            });
            resp.data.on('end', () => {
                console.log(`[${new Date().toLocaleTimeString()}] Stream ended by server for ${schedule.name}`);
            });
        }).catch(err => {
            console.error(`[${new Date().toLocaleTimeString()}] Connection failed for ${schedule.name}:`, err.message);
        });
    });
}

async function cleanupOldRecordings() {
    if (!supabase) return;

    console.log(`[${new Date().toLocaleTimeString()}] Running Supabase cleanup (30-day retention)...`);
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Find old records in DB
        const { data: oldRecords, error: fetchError } = await supabase
            .from('recordings')
            .select('id, url')
            .lt('created_at', thirtyDaysAgo);

        if (fetchError) throw fetchError;

        if (oldRecords.length > 0) {
            // 2. Extract filenames from URLs
            const filenames = oldRecords.map(r => {
                const parts = r.url.split('/');
                return parts[parts.length - 1];
            });

            // 3. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('recordings')
                .remove(filenames);

            if (storageError) throw storageError;

            // 4. Delete from DB
            const { error: dbError } = await supabase
                .from('recordings')
                .delete()
                .in('id', oldRecords.map(r => r.id));

            if (dbError) throw dbError;

            console.log(`Successfully deleted ${oldRecords.length} expired recordings.`);
        }
    } catch (error) {
        console.error('Cleanup Error:', error.message);
    }
}

export function startRecorder() {
    console.log('--- Radio Cloud Recorder Initialized ---');
    if (!supabase) {
        console.warn('WARNING: Supabase variables missing. Recordings will not be saved.');
    }

    // Initial cleanup
    cleanupOldRecordings();

    console.log(`[${new Date().toLocaleString()}] Server Timezone Check: Server thinks it is currently ${new Date().toLocaleTimeString()}`);

    let lastTriggerTime = null;

    // Check schedules every 30 seconds for better precision
    setInterval(() => {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentDay = now.getDay();
        const timeKey = `${currentH}:${currentM}`;

        if (lastTriggerTime === timeKey) return; // Already triggered this minute
        lastTriggerTime = timeKey;

        // Run cleanup at 3:00 AM
        if (currentH === 3 && currentM === 0) {
            cleanupOldRecordings();
        }

        // Log time every hour at minute 0
        if (currentM === 0 && currentH !== 3) {
            console.log(`[${now.toLocaleTimeString()}] System Pulse: Checking schedules...`);
        }

        schedules.forEach(schedule => {
            const [h, m] = schedule.time.split(':').map(Number);
            if (currentH === h && currentM === m && schedule.days.includes(currentDay)) {
                recordStream(schedule);
            }
        });
    }, 60000);

    console.log('Cloud Recorder Scheduler is active.');
}
