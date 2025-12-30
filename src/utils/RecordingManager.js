import { encodeToMp3 } from './Mp3Encoder';

class RecordingManager {
    constructor() {
        this.sessions = new Map(); // Map<stationId, sessionData>
        this.audioContext = null;
    }

    async initAudioContext() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        return this.audioContext;
    }

    async startRecording(station) {
        if (this.sessions.has(station.id)) {
            console.warn(`Recording already in progress for station: ${station.title}`);
            return { success: false, error: 'Already recording this station' };
        }

        const ctx = await this.initAudioContext();
        const session = {
            stationInfo: station,
            audioChunks: [],
            startTime: Date.now(),
            internalAudio: null,
            mediaRecorder: null,
            sourceNode: null,
            silenceGain: null
        };

        try {
            // 1. Setup hidden audio element
            session.internalAudio = new Audio();
            session.internalAudio.style.display = 'none';
            document.body.appendChild(session.internalAudio);
            session.internalAudio.crossOrigin = "anonymous";
            session.internalAudio.src = station.audioUrl;
            session.internalAudio.volume = 1.0;
            session.internalAudio.muted = false;

            // 2. Setup Audio Graph
            session.sourceNode = ctx.createMediaElementSource(session.internalAudio);
            const destination = ctx.createMediaStreamDestination();

            // Connect to recorder stream
            session.sourceNode.connect(destination);

            // Connect to output but keep it silent
            session.silenceGain = ctx.createGain();
            session.silenceGain.gain.value = 0;
            session.sourceNode.connect(session.silenceGain);
            session.silenceGain.connect(ctx.destination);

            // 3. Setup MediaRecorder
            const options = { mimeType: 'audio/webm', audioBitsPerSecond: 128000 };
            session.mediaRecorder = new MediaRecorder(destination.stream, options);

            session.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    session.audioChunks.push(event.data);
                }
            };

            // 4. Start
            await session.internalAudio.play();
            session.mediaRecorder.start(1000);

            this.sessions.set(station.id, session);
            console.log(`Parallel recording started for: ${station.title}`);
            return { success: true, station };
        } catch (error) {
            console.error(`Error starting recording for ${station.title}:`, error);
            this.cleanupSession(station.id);
            throw error;
        }
    }

    async stopRecording(stationId) {
        const session = this.sessions.get(stationId);
        if (!session) {
            throw new Error(`No active recording for station ID: ${stationId}`);
        }

        return new Promise((resolve, reject) => {
            session.mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(session.audioChunks, { type: 'audio/webm' });
                    const duration = Math.floor((Date.now() - session.startTime) / 1000);

                    console.log(`[Session ${stationId}] WebM size: ${audioBlob.size}`);
                    console.log(`[Session ${stationId}] Starting MP3 encoding...`);

                    const mp3Blob = await encodeToMp3(audioBlob);

                    const result = {
                        blob: mp3Blob,
                        duration,
                        size: mp3Blob.size,
                        stationInfo: session.stationInfo
                    };

                    this.cleanupSession(stationId);
                    resolve(result);
                } catch (error) {
                    console.error(`Error in stopRecording for ${stationId}:`, error);
                    this.cleanupSession(stationId);
                    reject(error);
                }
            };

            session.mediaRecorder.stop();
            if (session.internalAudio) {
                session.internalAudio.pause();
            }
        });
    }

    cleanupSession(stationId) {
        const session = this.sessions.get(stationId);
        if (!session) return;

        if (session.internalAudio) {
            session.internalAudio.pause();
            session.internalAudio.src = '';
            if (session.internalAudio.parentNode) {
                session.internalAudio.parentNode.removeChild(session.internalAudio);
            }
        }

        // Disconnect nodes to free memory
        if (session.sourceNode) session.sourceNode.disconnect();
        if (session.silenceGain) session.silenceGain.disconnect();

        this.sessions.delete(stationId);
    }

    getDuration(stationId) {
        const session = this.sessions.get(stationId);
        if (!session) return 0;
        return Math.floor((Date.now() - session.startTime) / 1000);
    }

    isStationRecording(stationId) {
        return this.sessions.has(stationId);
    }

    getActiveSessions() {
        const active = {};
        this.sessions.forEach((session, stationId) => {
            active[stationId] = {
                stationTitle: session.stationInfo.title,
                duration: this.getDuration(stationId)
            };
        });
        return active;
    }
}

export default new RecordingManager();
