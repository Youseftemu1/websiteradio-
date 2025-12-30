import React, { useState, useEffect, useRef } from 'react';
import RadioList from './components/RadioList';
import RecordingsList from './components/RecordingsList';
import Scheduler from './components/Scheduler';
import { radioStations } from './data/radioStations';
import RecordingManager from './utils/RecordingManager';
import { saveRecording } from './utils/StorageManager';
import SchedulerEngine from './utils/SchedulerEngine';
import useAutoCleanup from './hooks/useAutoCleanup';
import './App.css';

function App() {
    const [currentStation, setCurrentStation] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeRecordings, setActiveRecordings] = useState({}); // { stationId: duration }
    const [activeTab, setActiveTab] = useState('radio');
    const [refreshRecordings, setRefreshRecordings] = useState(0);
    const [volume, setVolume] = useState(0.7);

    const audioRef = useRef(null);
    const recordingIntervalRef = useRef(null);

    // Auto cleanup old recordings (30 days)
    useAutoCleanup((deletedCount) => {
        if (deletedCount > 0) {
            console.log(`Auto-cleanup: Deleted ${deletedCount} old recordings`);
        }
    });

    // Initialize scheduler and recover active recording
    useEffect(() => {
        // Check for active recording in localStorage
        const recoveredRecording = localStorage.getItem('activeRecording');
        if (recoveredRecording) {
            const data = JSON.parse(recoveredRecording);
            const station = radioStations.find(s => s.id === data.stationId);
            if (station && (Date.now() < data.expectedEndTime)) {
                setCurrentStation(station);
                setIsPlaying(true);
                // Restart recording if it was a schedule
                setTimeout(() => {
                    startRecording(data.scheduled);
                }, 2000);
            }
            localStorage.removeItem('activeRecording');
        }

        SchedulerEngine.start(
            (schedule) => {
                const station = radioStations.find(s => s.id === schedule.stationId);
                if (station) {
                    console.log(`Starting scheduled background recording for: ${station.title}`);
                    startRecording(station);
                }
            },
            async (stationId) => {
                console.log(`Stopping scheduled background recording for station: ${stationId}`);
                await stopRecording(stationId);
            }
        );

        return () => {
            SchedulerEngine.stop();
        };
    }, []);

    // Persist active recording state before unload (simplified for multi-session)
    useEffect(() => {
        const handleUnload = () => {
            const ids = Object.keys(activeRecordings);
            if (ids.length > 0) {
                // We'll just store that we were recording something to warn on restore
                localStorage.setItem('wasRecording', JSON.stringify(ids));
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [activeRecordings]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (currentStation && audioRef.current) {
            audioRef.current.load();
            if (isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        if (error.name === 'AbortError') {
                            console.log('Playback was aborted due to new request. This is normal during fast switching.');
                        } else {
                            console.error('Playback error:', error);
                            setIsPlaying(false);
                        }
                    });
                }
            }
        }
    }, [currentStation]);

    const handleSelectStation = (station) => {
        setCurrentStation(station);
        setIsPlaying(true);
    };

    const togglePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const startRecording = async (stationToRecord = currentStation) => {
        if (!stationToRecord) {
            console.error('No station to record');
            return;
        }

        try {
            // Ensure AudioContext is resumed
            await RecordingManager.initAudioContext();

            console.log(`Starting parallel recording for: ${stationToRecord.title}`);
            const result = await RecordingManager.startRecording(stationToRecord);

            if (result.success) {
                setActiveRecordings(prev => ({
                    ...prev,
                    [stationToRecord.id]: 0
                }));

                // If no interval is running, start one to poll durations
                if (!recordingIntervalRef.current) {
                    recordingIntervalRef.current = setInterval(() => {
                        const sessions = RecordingManager.getActiveSessions();
                        const newDurations = {};
                        Object.keys(sessions).forEach(id => {
                            newDurations[id] = sessions[id].duration;
                        });
                        setActiveRecordings(newDurations);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Failed to start parallel recording:', error);
            alert('Failed to start recording: ' + error.message);
        }
    };

    const stopRecording = async (stationId = currentStation?.id) => {
        if (!stationId) return;

        try {
            console.log(`Stopping recording for station ${stationId} and encoding MP3...`);
            const result = await RecordingManager.stopRecording(stationId);

            console.log(`Recording stopped for ${stationId}, size: ${result.size}`);

            // Save recording to IndexedDB
            const recording = {
                stationId: result.stationInfo.id,
                stationName: result.stationInfo.title,
                date: new Date().toISOString(),
                duration: result.duration,
                size: result.size,
                blob: result.blob
            };

            await saveRecording(recording);
            setRefreshRecordings(prev => prev + 1);

            // Update active recordings state
            setActiveRecordings(prev => {
                const next = { ...prev };
                delete next[stationId];

                // If no more recordings, stop the interval
                if (Object.keys(next).length === 0 && recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                    recordingIntervalRef.current = null;
                }

                return next;
            });
        } catch (error) {
            console.error(`Failed to stop or save recording for ${stationId}:`, error);
            setActiveRecordings(prev => {
                const next = { ...prev };
                delete next[stationId];
                return next;
            });
            alert('Failed to save recording: ' + error.message);
        }
    };

    const handleRecord = (station = currentStation) => {
        if (!station) return;
        if (activeRecordings[station.id]) {
            stopRecording(station.id);
        } else {
            startRecording(station);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-content">
                    <h1 className="app-title">
                        <span className="icon">📻</span>
                        Radio Player
                    </h1>
                    <div className="header-subtitle">
                        31 Jordanian Radio Stations
                    </div>
                </div>
            </header>

            <nav className="app-nav">
                <button
                    className={`nav-btn ${activeTab === 'radio' ? 'active' : ''}`}
                    onClick={() => setActiveTab('radio')}
                >
                    🎵 Live Radio
                </button>
                <button
                    className={`nav-btn ${activeTab === 'recordings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recordings')}
                >
                    💾 Recordings
                </button>
                <button
                    className={`nav-btn ${activeTab === 'schedule' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schedule')}
                >
                    📅 Schedule
                </button>
            </nav>

            <main className="app-main">
                {activeTab === 'radio' && (
                    <RadioList
                        stations={radioStations}
                        currentStation={currentStation}
                        onSelectStation={handleSelectStation}
                        onRecord={handleRecord}
                        activeRecordings={activeRecordings}
                    />
                )}

                {activeTab === 'recordings' && (
                    <RecordingsList refreshTrigger={refreshRecordings} />
                )}

                {activeTab === 'schedule' && (
                    <Scheduler />
                )}
            </main>

            {currentStation && (
                <div className="player-bar">
                    <div className="player-info">
                        <img
                            src={currentStation.imageUrl}
                            alt={currentStation.title}
                            className="player-image"
                            onError={(e) => {
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY3ZWVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJJbnRlciIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SYWRpbzwvdGV4dD48L3N2Zz4=';
                            }}
                        />
                        <div className="player-details">
                            <div className="player-title">{currentStation.title}</div>
                            <div className="player-artist">{currentStation.artist}</div>
                        </div>
                    </div>

                    <div className="player-controls">
                        <button
                            className="control-btn"
                            onClick={togglePlayPause}
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? '⏸️' : '▶️'}
                        </button>

                        <button
                            className={`control-btn record-control ${activeRecordings[currentStation.id] !== undefined ? 'recording' : ''}`}
                            onClick={() => handleRecord(currentStation)}
                            title={activeRecordings[currentStation.id] !== undefined ? 'Stop Recording' : 'Start Recording'}
                        >
                            {activeRecordings[currentStation.id] !== undefined ? '⏹️' : '⏺️'}
                        </button>

                        {activeRecordings[currentStation.id] !== undefined && (
                            <div className="recording-timer">
                                🔴 {formatTime(activeRecordings[currentStation.id])}
                            </div>
                        )}
                    </div>

                    <div className="player-volume">
                        <span className="volume-icon">🔊</span>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="volume-slider"
                            />
                        </div>
                    </div>
                </div>
            )}

            <audio
                ref={audioRef}
                crossOrigin="anonymous"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            >
                {currentStation && <source src={currentStation.audioUrl} />}
            </audio>
        </div>
    );
}

export default App;
