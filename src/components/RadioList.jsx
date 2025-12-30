import React, { useState } from 'react';
import './RadioList.css';

const RadioList = ({ stations, onSelectStation, currentStation, onRecord, activeRecordings = {} }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStations = stations.filter(station =>
        station.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="radio-list">
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="🔍 Search radio stations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="stations-grid">
                {filteredStations.map((station) => (
                    <div
                        key={station.id}
                        className={`station-card ${currentStation?.id === station.id ? 'active' : ''}`}
                        onClick={() => onSelectStation(station)}
                    >
                        <div className="station-image">
                            <img
                                src={station.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJJbnRlciIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SYWRpbzwvdGV4dD48L3N2Zz4='}
                                alt={station.title}
                                onError={(e) => {
                                    if (!e.target.src.startsWith('data:')) {
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTUwIiBmaWxsPSIjNjY3ZWVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJJbnRlciIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SYWRpbzwvdGV4dD48L3N2Zz4=';
                                    }
                                }}
                            />
                            {currentStation?.id === station.id && (
                                <div className="playing-indicator">
                                    <div className="sound-wave">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="station-info">
                            <h3 className="station-title">{station.title}</h3>
                            <p className="station-artist">{station.artist}</p>
                        </div>

                        <button
                            className={`record-btn ${activeRecordings[station.id] !== undefined ? 'recording' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRecord(station);
                            }}
                            title="Record this station"
                        >
                            {activeRecordings[station.id] !== undefined ? '⏹️' : '⏺️'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RadioList;
