import { openDB } from 'idb';

const DB_NAME = 'RadioRecordings';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

// Initialize database
export const initDB = async () => {
    return await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('date', 'date');
                store.createIndex('stationId', 'stationId');
            }
        },
    });
};

// Save recording
export const saveRecording = async (recording) => {
    const db = await initDB();
    return await db.add(STORE_NAME, recording);
};

// Get all recordings
export const getAllRecordings = async () => {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
};

// Delete recording
export const deleteRecording = async (id) => {
    const db = await initDB();
    return await db.delete(STORE_NAME, id);
};

// Get recordings older than days
export const getOldRecordings = async (days) => {
    const db = await initDB();
    const allRecordings = await db.getAll(STORE_NAME);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allRecordings.filter(rec => new Date(rec.date) < cutoffDate);
};

// Delete old recordings
export const deleteOldRecordings = async (days = 30) => {
    const oldRecordings = await getOldRecordings(days);
    const db = await initDB();

    for (const recording of oldRecordings) {
        await db.delete(STORE_NAME, recording.id);
    }

    return oldRecordings.length;
};

// Get storage usage
export const getStorageUsage = async () => {
    const recordings = await getAllRecordings();
    const totalBytes = recordings.reduce((sum, rec) => sum + (rec.size || 0), 0);
    return totalBytes;
};

// Get available storage (estimate)
export const getAvailableStorage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
            available: (estimate.quota || 0) - (estimate.usage || 0)
        };
    }
    return null;
};
