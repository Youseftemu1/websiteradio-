import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import process from 'process';
import { systemSchedules } from '../src/data/systemSchedules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration from Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// -- DIAGNOSTICS & STATUS --
export const recorderStatus = {
    startedAt: new Date().toISOString(),
    logs: [],
    lastAction: 'Initializing...',
    supabaseConnected: !!supabase
};

function log(msg) {
    const timestamped = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(timestamped);
    recorderStatus.logs.push(timestamped);
    if (recorderStatus.logs.length > 50) recorderStatus.logs.shift(); // Keep last 50
    recorderStatus.lastAction = msg;
}

// -- CONFIGURATION --
const schedules = [...systemSchedules];

async function uploadToSupabase(buffer, filename, schedule, duration) {
    log(`UPLOAD START: ${filename} (${buffer.length} bytes)`);
    if (!supabase) {
        log('CRITICAL: Supabase client is NULL. Check environment variables.');
        return;
    }

    try {
        const { data: storageData, error: storageError } = await supabase.storage
            .from('recordings')
            .upload(`${filename}`, buffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (storageError) {
            log(`STORAGE UPLOAD ERROR for ${filename}: ${storageError.message}`);
            throw storageError;
        }

        const { data: urlData } = supabase.storage
            .from('recordings')
            .getPublicUrl(filename);

        const publicUrl = urlData.publicUrl;

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

        if (dbError) {
            log(`DB INSERT ERROR for ${filename}: ${dbError.message}`);
            throw dbError;
        }

        log(`ARCHIVE SUCCESS: ${filename}`);
    } catch (error) {
        log(`Supabase Integration Error: ${error.message}`);
    }
}

async function recordStream(schedule) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${schedule.name.replace(/\s+/g, '_')}_${timestamp}.mp3`;

    log(`Starting cloud recording: ${schedule.name}`);
    const startTime = Date.now();

    if (schedule.url.includes('.m3u8')) {
        return recordHlsStream(schedule, startTime, filename);
    }

    return new Promise((resolve) => {
        let buffer = Buffer.alloc(0);
        const timeout = setTimeout(async () => {
            log(`Window complete: ${schedule.name}`);
            const duration = Math.floor((Date.now() - startTime) / 1000);

            if (buffer.length === 0) {
                log(`ERROR: No data collected for ${schedule.name}.`);
            } else {
                log(`Ready to upload ${buffer.length} bytes for ${schedule.name}`);
                await uploadToSupabase(buffer, filename, schedule, duration);
            }
            resolve();
        }, schedule.duration * 1000);

        axios({
            method: 'get',
            url: schedule.url,
            responseType: 'stream',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }).then(resp => {
            log(`Connection established: ${schedule.name}`);
            let isFirstChunk = true;
            let bytesReceived = 0;

            resp.data.on('data', (chunk) => {
                bytesReceived += chunk.length;
                if (isFirstChunk) {
                    isFirstChunk = false;
                    const head = chunk.slice(0, 10).toString();
                    if (head.includes('#EXTM3U')) {
                        log(`HLS detected in stream for ${schedule.name}. Switching...`);
                        clearTimeout(timeout);
                        recordHlsStream(schedule, startTime, filename).then(resolve);
                        resp.data.destroy();
                        return;
                    }
                }
                buffer = Buffer.concat([buffer, chunk]);
            });
            resp.data.on('error', (err) => {
                log(`Stream error ${schedule.name}: ${err.message}`);
            });
            resp.data.on('end', () => {
                log(`Stream ended by server: ${schedule.name}. Bytes: ${bytesReceived}`);
            });
        }).catch(err => {
            log(`Connection failed ${schedule.name}: ${err.message}`);
        });
    });
}

async function recordHlsStream(schedule, startTime, filename) {
    log(`HLS Local Recorder Active: ${schedule.name}`);
    let buffer = Buffer.alloc(0);
    const downloadedSegments = new Set();
    const endTime = startTime + (schedule.duration * 1000);

    while (Date.now() < endTime) {
        try {
            const playlistResp = await axios.get(schedule.url);
            const playlist = playlistResp.data;
            const baseUrl = schedule.url.substring(0, schedule.url.lastIndexOf('/') + 1);

            const lines = playlist.split('\n');
            const segments = lines.filter(line => line.trim() && !line.startsWith('#'));

            for (const segment of segments) {
                if (downloadedSegments.has(segment)) continue;
                if (Date.now() >= endTime) break;

                const segmentUrl = segment.startsWith('http') ? segment : baseUrl + segment;
                try {
                    const segResp = await axios({
                        method: 'get',
                        url: segmentUrl,
                        responseType: 'arraybuffer',
                        timeout: 5000
                    });
                    buffer = Buffer.concat([buffer, Buffer.from(segResp.data)]);
                    downloadedSegments.add(segment);
                } catch (segErr) {
                    // Fail silent, retry next pass
                }
            }
        } catch (err) {
            log(`HLS fetch error ${schedule.name}: ${err.message}`);
        }

        if (Date.now() < endTime) {
            await new Promise(r => setTimeout(r, 4000));
        }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    if (buffer.length > 0) {
        log(`HLS Complete: ${schedule.name}. Bytes: ${buffer.length}`);
        await uploadToSupabase(buffer, filename, schedule, duration);
    } else {
        log(`HLS FAILED: ${schedule.name} - 0 bytes.`);
    }
}

async function cleanupOldRecordings() {
    if (!supabase) return;
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: oldRecords } = await supabase.from('recordings').select('id, url').lt('created_at', thirtyDaysAgo);
        if (oldRecords && oldRecords.length > 0) {
            const filenames = oldRecords.map(r => r.url.split('/').pop());
            await supabase.storage.from('recordings').remove(filenames);
            await supabase.from('recordings').delete().in('id', oldRecords.map(r => r.id));
            log(`Cleaned up ${oldRecords.length} old recordings.`);
        }
    } catch (e) { }
}

export function startRecorder() {
    log('--- Radio Cloud Recorder v2.1 ---');
    log(`SUPABASE_URL present: ${!!supabaseUrl}`);
    log(`Active Schedules: ${schedules.length}`);

    cleanupOldRecordings();

    let lastTriggerTime = null;
    setInterval(() => {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentDay = now.getDay();
        const timeKey = `${currentH}:${currentM}`;

        if (lastTriggerTime === timeKey) return;
        lastTriggerTime = timeKey;

        if (currentH === 3 && currentM === 0) cleanupOldRecordings();

        schedules.forEach(schedule => {
            const [h, m] = schedule.time.split(':').map(Number);
            if (currentH === h && currentM === m && schedule.days.includes(currentDay)) {
                recordStream(schedule);
            }
        });
    }, 30000);
}
