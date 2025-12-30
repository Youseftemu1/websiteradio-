import React, { useState, useEffect } from 'react';
import { getAllRecordings, deleteRecording, getStorageUsage } from '../utils/StorageManager';
import { formatBytes, formatDuration, formatDate, getDownloadFilename } from '../utils/formatters';
import { saveAs } from 'file-saver';
import './RecordingsList.css';

const RecordingsList = ({ refreshTrigger }) => {
    const [recordings, setRecordings] = useState([]);
    const [storageUsed, setStorageUsed] = useState(0);
    const [playingId, setPlayingId] = useState(null);

    useEffect(() => {
        loadRecordings();
    }, [refreshTrigger]);

    const loadRecordings = async () => {
        const recs = await getAllRecordings();
        setRecordings(recs.sort((a, b) => new Date(b.date) - new Date(a.date)));

        const usage = await getStorageUsage();
        setStorageUsed(usage);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this recording?')) {
            try {
                await deleteRecording(Number(id)); // Ensure ID is a number for IndexedDB
                loadRecordings();
            } catch (error) {
                console.error('Failed to delete recording:', error);
                // Try as string if number fails
                await deleteRecording(id);
                loadRecordings();
            }
        }
    };

    const handleDownload = (recording) => {
        const filename = getDownloadFilename(recording.stationName, recording.date);
        saveAs(recording.blob, filename);
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
                                        src={URL.createObjectURL(recording.blob)}
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
                                    onClick={() => handleDelete(recording.id)}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="recording-size">
                                {formatBytes(recording.size)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecordingsList;
