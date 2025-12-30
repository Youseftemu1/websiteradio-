import React, { useState, useEffect } from 'react';
import SchedulerEngine from '../utils/SchedulerEngine';
import { radioStations } from '../data/radioStations';
import './Scheduler.css';

const Scheduler = () => {
    const [schedules, setSchedules] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        stationId: '',
        time: '13:00', // Default 1pm
        duration: 1800, // 30 minutes in seconds
        name: 'Tech News',
        days: [0, 1, 2, 3, 4, 5, 6] // 0=Sunday, 6=Saturday
    });

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = () => {
        setSchedules(SchedulerEngine.getSchedules());
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const station = radioStations.find(s => s.id === formData.stationId);
        if (!station) return;

        const schedule = {
            ...formData,
            stationName: station.title,
            cronExpression: null, // Simple daily time for now
        };

        SchedulerEngine.addSchedule(schedule);
        loadSchedules();
        setShowForm(false);
        setFormData({
            stationId: '',
            time: '13:00',
            duration: 1800,
            name: 'Tech News',
            days: [0, 1, 2, 3, 4, 5, 6]
        });
    };

    const handleDelete = (id) => {
        console.log('Attempting to delete schedule with ID:', id);
        if (confirm('Delete this schedule?')) {
            SchedulerEngine.removeSchedule(id);
            console.log('Schedule removed from engine');
            loadSchedules();
        }
    };

    const handleToggle = (id) => {
        SchedulerEngine.toggleSchedule(id);
        loadSchedules();
    };

    const formatDurationHelper = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} min`;
    };

    return (
        <div className="scheduler">
            <div className="scheduler-header">
                <h2>📅 Scheduled Recordings</h2>
                <button
                    className="add-schedule-btn"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancel' : '➕ Add Schedule'}
                </button>
            </div>

            {showForm && (
                <form className="schedule-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Schedule Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Tech News"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Radio Station</label>
                        <select
                            value={formData.stationId}
                            onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                            required
                        >
                            <option value="">Select a station...</option>
                            {radioStations.map(station => (
                                <option key={station.id} value={station.id}>
                                    {station.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Time (Daily)</label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Duration (minutes)</label>
                            <input
                                type="number"
                                value={formData.duration / 60}
                                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) * 60 })}
                                min="1"
                                max="180"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Repeat on Days</label>
                        <div className="days-picker">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={`day-btn ${formData.days.includes(index) ? 'selected' : ''}`}
                                    onClick={() => {
                                        const newDays = formData.days.includes(index)
                                            ? formData.days.filter(d => d !== index)
                                            : [...formData.days, index];
                                        setFormData({ ...formData, days: newDays });
                                    }}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="submit-btn">
                        Create Schedule
                    </button>
                </form>
            )}

            <div className="schedules-list">
                {schedules.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">⏰</div>
                        <h3>No Schedules Yet</h3>
                        <p>Create a schedule to automatically record your favorite shows!</p>
                    </div>
                ) : (
                    schedules.map(schedule => (
                        <div key={schedule.id} className={`schedule-card ${!schedule.enabled ? 'disabled' : ''}`}>
                            <div className="schedule-info">
                                <h3>{schedule.name}</h3>
                                <p className="schedule-station">{schedule.stationName}</p>
                                <div className="schedule-details">
                                    <span className="schedule-time">🕐 {schedule.time}</span>
                                    <span className="schedule-duration">⏱️ {formatDurationHelper(schedule.duration)}</span>
                                    <div className="schedule-days-display">
                                        {[0, 1, 2, 3, 4, 5, 6].map(d => (
                                            <span key={d} className={`day-tag ${schedule.days?.includes(d) ? 'active' : ''}`}>
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'][d]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="schedule-actions">
                                <button
                                    className={`toggle-btn ${schedule.enabled ? 'enabled' : ''}`}
                                    onClick={() => handleToggle(schedule.id)}
                                    title={schedule.enabled ? 'Disable' : 'Enable'}
                                >
                                    {schedule.enabled ? '🔔' : '🔕'}
                                </button>
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDelete(schedule.id)}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Scheduler;
