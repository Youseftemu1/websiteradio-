import lamejs from 'lamejs';

// Deep import internal modules to shim the global scope that lamejs internals expect
// In Vite/ESM environments, the CommonJS closure of lamejs often breaks, 
// so we must provide these globals manually.
import Lame from 'lamejs/src/js/Lame.js';
import Presets from 'lamejs/src/js/Presets.js';
import GainAnalysis from 'lamejs/src/js/GainAnalysis.js';
import QuantizePVT from 'lamejs/src/js/QuantizePVT.js';
import Quantize from 'lamejs/src/js/Quantize.js';
import Takehiro from 'lamejs/src/js/Takehiro.js';
import Reservoir from 'lamejs/src/js/Reservoir.js';
import MPEGMode from 'lamejs/src/js/MPEGMode.js';
import BitStream from 'lamejs/src/js/BitStream.js';
import Encoder from 'lamejs/src/js/Encoder.js';
import Version from 'lamejs/src/js/Version.js';
import VBRTag from 'lamejs/src/js/VBRTag.js';

if (typeof window !== 'undefined') {
    window.Lame = Lame;
    window.Presets = Presets;
    window.GainAnalysis = GainAnalysis;
    window.QuantizePVT = QuantizePVT;
    window.Quantize = Quantize;
    window.Takehiro = Takehiro;
    window.Reservoir = Reservoir;
    window.MPEGMode = MPEGMode;
    window.BitStream = BitStream;
    window.Encoder = Encoder;
    window.Version = Version;
    window.VBRTag = VBRTag;
}


export const encodeToMp3 = async (audioBlob) => {
    console.log('encodeToMp3 called with blob size:', audioBlob.size);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                console.log('Reader loaded, decoding audio data...');
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(reader.result);
                console.log('Audio data decoded. Duration:', audioBuffer.duration);

                // Use lamejs to encode
                // Note: lamejs might be a default export or require specific access
                console.log('lamejs object:', lamejs);
                const Mp3Encoder = lamejs.Mp3Encoder || (lamejs.mp3 && lamejs.mp3.Mp3Encoder);

                if (!Mp3Encoder) {
                    console.error('Lamejs structure:', Object.keys(lamejs));
                    throw new Error('Lamejs Mp3Encoder not found. Check import.');
                }

                // Initialize encoder
                // channels, samplerate, kbps
                const mp3encoder = new Mp3Encoder(1, audioBuffer.sampleRate, 128);
                const samples = audioBuffer.getChannelData(0); // mono

                // Silence detection/CORS warning
                let hasData = false;
                for (let i = 0; i < Math.min(samples.length, 1000); i++) {
                    if (Math.abs(samples[i]) > 0.0001) {
                        hasData = true;
                        break;
                    }
                }
                if (!hasData) {
                    console.warn('The captured audio buffer appears to be SILENT. This is often caused by CORS restrictions on the radio stream.');
                }

                const sampleBlockSize = 1152;
                const mp3Data = [];

                console.log('Starting encoding loops...');
                // Convert float32 to int16
                const Int16Samples = new Int16Array(samples.length);
                for (let i = 0; i < samples.length; i++) {
                    Int16Samples[i] = samples[i] < 0 ? samples[i] * 0x8000 : samples[i] * 0x7FFF;
                }

                for (let i = 0; i < Int16Samples.length; i += sampleBlockSize) {
                    const sampleChunk = Int16Samples.subarray(i, i + sampleBlockSize);
                    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                }

                const mp3buf = mp3encoder.flush();
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }

                console.log('Encoding finished, creating blob...');
                const blob = new Blob(mp3Data, { type: 'audio/mp3' });
                console.log('MP3 Blob created. Size:', blob.size);
                resolve(blob);
            } catch (err) {
                console.error('Error in encodeToMp3:', err);
                reject(err);
            }
        };
        reader.onerror = (e) => {
            console.error('FileReader error:', e);
            reject(e);
        };
        reader.readAsArrayBuffer(audioBlob);
    });
};
