import React, { useState, useEffect } from 'react';
import { getAllRecordings, deleteRecording, getStorageUsage, deleteAllLocalRecordings } from '../utils/StorageManager';
import { formatBytes, formatDuration, formatDate, getDownloadFilename } from '../utils/formatters';
import { saveAs } from 'file-saver';
import { supabase } from '../utils/supabaseClient';
import './RecordingsList.css';

const RecordingsList = ({ refreshTrigger }) => {
    const [recordings, setRecordings] = useState([]);
    const [storageUsed, setStorageUsed] = useState(0);
    const [playingId, setPlayingId] = useState(null);

    useEffect(() => {
        loadRecordings();
    }, [refreshTrigger]);

    const loadRecordings = async () => {
        // 1. Load Local Recordings (IndexedDB)
        const localRecs = await getAllRecordings();
        const formattedLocal = localRecs.map(rec => ({
            ...rec,
            isCloud: false,
            displayDate: rec.date
        }));

        // 2. Load Cloud Recordings (Supabase)
        let cloudRecs = [];
        try {
            const { data, error } = await supabase
                .from('recordings')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                cloudRecs = data.map(rec => ({
                    id: rec.id,
                    stationName: rec.station_name,
                    date: rec.created_at,
                    displayDate: rec.created_at,
                    duration: rec.duration,
                    size: rec.size,
                    url: rec.url,
                    isCloud: true
                }));
            }
        } catch (err) {
            console.error('Supabase fetch error:', err);
        }

        const allRecs = [...formattedLocal, ...cloudRecs].sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecordings(allRecs);

        const usage = await getStorageUsage();
        setStorageUsed(usage);
    };

    const handleDelete = async (recording) => {
        if (confirm('Delete this recording?')) {
            try {
                if (recording.isCloud) {
                    // Delete from Supabase
                    const filename = recording.url.split('/').pop();
                    await supabase.storage.from('recordings').remove([filename]);
                    await supabase.from('recordings').delete().eq('id', recording.id);
                } else {
                    // Delete from IndexedDB
                    await deleteRecording(Number(recording.id));
                }
                loadRecordings();
            } catch (error) {
                console.error('Failed to delete recording:', error.message || error);
                alert(`Delete failed: ${error.message || 'Unknown error'}. Check Supabase RLS policies.`);
                loadRecordings();
            }
        }
    };

    const handleDeleteAll = async () => {
        if (confirm('Are you ABSOLUTELY sure? This will delete ALL local and cloud recordings forever.')) {
            try {
                // 1. Delete all local
                await deleteAllLocalRecordings();

                // 2. Delete all cloud
                const { data: cloudFiles } = await supabase.storage.from('recordings').list();
                if (cloudFiles && cloudFiles.length > 0) {
                    const names = cloudFiles.map(f => f.name);
                    await supabase.storage.from('recordings').remove(names);
                }
                // Delete metadata from DB
                await supabase.from('recordings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

                loadRecordings();
            } catch (error) {
                console.error('Failed to delete all:', error);
                loadRecordings();
            }
        }
    };

    const handleDownload = (recording) => {
        const filename = getDownloadFilename(recording.stationName, recording.date);
        if (recording.isCloud) {
            saveAs(recording.url, filename);
        } else {
            saveAs(recording.blob, filename);
        }
    };

    const handlePlay = (id) => {
        setPlayingId(playingId === id ? null : id);
    };

    return (
        <div className="recordings-list">
            <div className="storage-info">
                <div className="storage-bar">
                    <div className="storage-used" style={{ width: '30%' }}></div>
                </div>
                <p className="storage-text">
                    Storage Used: <strong>{formatBytes(storageUsed)}</strong>
                </p>
                {recordings.length > 0 && (
                    <button className="delete-all-btn" onClick={handleDeleteAll}>
                        Clear All
                    </button>
                )}
            </div>

            {recordings.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📻</div>
                    <h3>No Recordings Yet</h3>
                    <p>Start recording your favorite radio stations!</p>
                </div>
            ) : (
                <div className="recordings-grid">
                    {recordings.map((recording) => (
                        <div key={recording.id} className="recording-card">
                            <div className="recording-header">
                                <div className="recording-station">
                                    <h3>{recording.stationName}</h3>
                                    <p className="recording-date">{formatDate(recording.date)}</p>
                                </div>
                                <div className="recording-duration">
                                    {formatDuration(recording.duration)}
                                </div>
                            </div>

                            {playingId === recording.id && (
                                <div className="recording-player">
                                    <audio
                                        controls
                                        autoPlay
                                        src={recording.isCloud ? recording.url : URL.createObjectURL(recording.blob)}
                                        className="audio-element"
                                    />
                                </div>
                            )}

                            <div className="recording-actions">
                                <button
                                    className="action-btn play-btn"
                                    onClick={() => handlePlay(recording.id)}
                                    title="Play/Pause"
                                >
                                    {playingId === recording.id ? '⏸️' : '▶️'}
                                </button>
                                <button
                                    className="action-btn download-btn"
                                    onClick={() => handleDownload(recording)}
                                    title="Download MP3"
                                >
                                    💾
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDelete(recording)}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="recording-meta-footer">
                                <span className={`source-tag ${recording.isCloud ? 'cloud' : 'local'}`}>
                                    {recording.isCloud ? '☁️ Cloud' : '💻 Local'}
                                </span>
                                <span className="recording-size">
                                    {formatBytes(recording.size)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecordingsList;
