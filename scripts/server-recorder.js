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

    console.log(`[${new Date().toLocaleTimeString()}] Starting recording: ${schedule.name}`);

    try {
        const response = await axios({
            method: 'get',
            url: schedule.url,
            responseType: 'arraybuffer', // Use arraybuffer for later upload
            timeout: 10000
        });

        // We use a simplified recording for cloud: 
        // We pulse-check by actually downloading the stream for the duration.
        // Node.js doesn't have MediaRecorder, so we buffer the stream.

        let buffer = Buffer.alloc(0);
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(async () => {
                console.log(`[${new Date().toLocaleTimeString()}] Recording finished: ${schedule.name}`);
                const duration = Math.floor((Date.now() - startTime) / 1000);
                await uploadToSupabase(buffer, filename, schedule, duration);
                resolve();
            }, schedule.duration * 1000);

            // Fetch stream chunks
            axios({
                method: 'get',
                url: schedule.url,
                responseType: 'stream'
            }).then(resp => {
                resp.data.on('data', (chunk) => {
                    buffer = Buffer.concat([buffer, chunk]);
                });
                resp.data.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            }).catch(err => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    } catch (error) {
        console.error(`Error recording ${schedule.name}:`, error.message);
    }
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

    // Check schedules every minute
    setInterval(() => {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentDay = now.getDay();

        // Run cleanup at 3:00 AM
        if (currentH === 3 && currentM === 0) {
            cleanupOldRecordings();
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
