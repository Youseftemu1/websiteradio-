import { parseExpression } from 'cron-parser';
import { saveRecording } from './StorageManager';

class SchedulerEngine {
    constructor() {
        this.schedules = this.loadSchedules();
        this.checkInterval = null;
        this.activeRecordings = new Map();
    }

    loadSchedules() {
        const saved = localStorage.getItem('radioSchedules');
        return saved ? JSON.parse(saved) : [];
    }

    saveSchedules() {
        localStorage.setItem('radioSchedules', JSON.stringify(this.schedules));
    }

    addSchedule(schedule) {
        const newSchedule = {
            id: Date.now().toString(),
            ...schedule,
            enabled: true,
            createdAt: new Date().toISOString()
        };
        this.schedules.push(newSchedule);
        this.saveSchedules();
        return newSchedule;
    }

    removeSchedule(id) {
        this.schedules = this.schedules.filter(s => s.id !== id && s.id.toString() !== id.toString());
        this.saveSchedules();
    }

    toggleSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (schedule) {
            schedule.enabled = !schedule.enabled;
            this.saveSchedules();
        }
    }

    getSchedules() {
        return this.schedules;
    }

    // Start monitoring schedules
    start(onRecordingStart, onRecordingStop) {
        this.onRecordingStart = onRecordingStart;
        this.onRecordingStop = onRecordingStop;

        // Check every minute
        this.checkInterval = setInterval(() => {
            this.checkSchedules();
        }, 60000);

        // Check immediately
        this.checkSchedules();
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    checkSchedules() {
        const now = new Date();

        this.schedules.forEach(schedule => {
            if (!schedule.enabled) return;

            const shouldRecord = this.shouldRecordNow(schedule, now);

            if (shouldRecord && !this.activeRecordings.has(schedule.id)) {
                // Start recording
                this.startScheduledRecording(schedule);
            }
        });

        // Check if any active recordings should stop
        this.activeRecordings.forEach((recording, scheduleId) => {
            const elapsed = (now - recording.startTime) / 1000;
            if (elapsed >= recording.duration) {
                this.stopScheduledRecording(scheduleId);
            }
        });
    }

    shouldRecordNow(schedule, now) {
        try {
            if (schedule.cronExpression) {
                // Use cron expression
                const interval = parseExpression(schedule.cronExpression);
                const next = interval.next().toDate();
                const prev = interval.prev().toDate();

                // Check if we're within 1 minute of scheduled time
                const diff = Math.abs(now - prev) / 1000;
                return diff < 60;
            } else if (schedule.time) {
                // Simple daily time with day-of-week support
                const [hours, minutes] = schedule.time.split(':');
                const isCorrectTime = now.getHours() === parseInt(hours) &&
                    now.getMinutes() === parseInt(minutes);

                if (isCorrectTime) {
                    // If schedule.days is missing, assume everyday (for backward compatibility)
                    if (!schedule.days) return true;
                    // now.getDay() returns 0 for Sunday
                    return schedule.days.includes(now.getDay());
                }
                return false;
            }
        } catch (error) {
            console.error('Error checking schedule:', error);
        }
        return false;
    }

    startScheduledRecording(schedule) {
        if (this.onRecordingStart) {
            const recording = {
                startTime: new Date(),
                duration: schedule.duration || 1800, // Default 30 minutes
                stationId: schedule.stationId,
                scheduleId: schedule.id
            };

            this.activeRecordings.set(schedule.id, recording);
            this.onRecordingStart(schedule);
        }
    }

    stopScheduledRecording(scheduleId) {
        const recording = this.activeRecordings.get(scheduleId);
        if (recording && this.onRecordingStop) {
            this.onRecordingStop(recording.stationId);
            this.activeRecordings.delete(scheduleId);
        }
    }
}

export default new SchedulerEngine();
