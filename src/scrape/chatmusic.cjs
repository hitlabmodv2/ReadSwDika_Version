'use strict';

const axios = require('axios');

// ─── Pool untuk auto-generate random preset ───────────────────────────────

const _GENRES = [
        'pop', 'ballad', 'indie pop', 'rnb', 'jazz', 'acoustic', 'folk',
        'lofi hiphop', 'electronic', 'dance pop', 'rock', 'soul', 'funk',
        'reggae', 'bossa nova', 'ambient', 'hip hop', 'country', 'blues',
];

const _MOODS = [
        'melancholy', 'nostalgic', 'romantic', 'upbeat', 'energetic', 'chill',
        'dreamy', 'peaceful', 'sad', 'happy', 'mysterious', 'epic',
        'emotional', 'dark', 'hopeful', 'longing', 'joyful', 'tense',
];

const _VIBES = [
        'midnight vibes', 'sunset vibes', 'morning vibes', 'rainy day',
        'night club', 'coffee shop', 'beach sunset', 'city lights',
        'starry night', 'golden hour', 'cozy room', 'empty streets',
        'summer breeze', 'winter cold', 'forest walk', 'rooftop',
];

const _INSTRUMENTS = [
        'piano', 'soft guitar', 'electric guitar', 'violin', 'cello',
        'fingerstyle guitar', 'synthesizer', 'saxophone', 'trumpet',
        'acoustic guitar', 'drum machine', 'bass guitar', 'flute',
        'soft beats', 'orchestral strings', 'ukulele',
];

const _TITLE_ADJ = [
        'Indah', 'Sunyi', 'Malam', 'Pagi', 'Senja', 'Abadi', 'Gelap',
        'Terang', 'Jauh', 'Dekat', 'Hilang', 'Pulang', 'Pergi', 'Rindu',
        'Sepi', 'Bahagia', 'Biru', 'Merah', 'Emas', 'Perak', 'Lembut',
        'Keras', 'Sungguh', 'Nyata', 'Palsu', 'Hangat', 'Dingin', 'Teduh',
];

const _TITLE_NOUN = [
        'Kenangan', 'Mimpi', 'Jiwa', 'Langit', 'Bintang', 'Lautan', 'Angin',
        'Hujan', 'Cahaya', 'Bayangan', 'Hati', 'Cinta', 'Duka', 'Tawa',
        'Suara', 'Dansa', 'Nada', 'Irama', 'Melodi', 'Lagu', 'Cerita',
        'Hari', 'Waktu', 'Ruang', 'Jalan', 'Pintu', 'Jendela', 'Sayap',
];

const MODELS = [
        { id: 6, version: 'v5.0' },
        { id: 5, version: 'v4.5-plus' },
        { id: 4, version: 'v4.5' },
        { id: 3, version: 'v4.0' },
        { id: 1, version: 'v3.5' },
];

class ChatMusicAPI {
        constructor() {
                this.baseUrl = 'https://api.chatmusicpro.com';
                this.identityId = this._uuid();
                this.token = null;
        }

        _uuid() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                        const r = Math.random() * 16 | 0;
                        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
                });
        }

        async _req(endpoint, data = {}) {
                const headers = {
                        'User-Agent': 'android',
                        'Accept-Encoding': 'gzip',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'region-code': 'ID',
                        'user-type': 'android',
                        'version': '1.0.3',
                        'app-type': '1',
                        'language': 'EN',
                        'identity-id': this.identityId,
                        'app-market': 'google_play',
                };
                if (this.token) headers['token'] = this.token;
                const res = await axios.post(
                        this.baseUrl + endpoint,
                        new URLSearchParams(data).toString(),
                        { headers, timeout: 15000 }
                );
                return res.data;
        }

        async login() {
                const r = await this._req('/v1/user/device_login', {
                        source_site: 'google_play',
                        identity_id: this.identityId,
                });
                if (r.code === 200) {
                        this.token = r.data.token;
                        return true;
                }
                throw new Error('Login gagal: ' + r.message);
        }

        async generate(params) {
                const r = await this._req('/music/create-music', {
                        music_model_id: params.modelId || 6,
                        title: (params.title || 'My Song').slice(0, 80),
                        prompt: (params.prompt || '').slice(0, 200),
                        lyrics: (params.lyrics || '').slice(0, 1000),
                        is_instrumental: params.isInstrumental ? 1 : 0,
                        music_style: params.musicStyle || 'pop',
                        music_style_code: '',
                        gender_type: params.genderType ?? 0,
                });
                if (r.code === 200) return r.data.create_id;
                throw new Error('Generate gagal: ' + r.message);
        }

        async getProgress(id) {
                const r = await this._req('/music/get-music-progress', { id });
                if (r.code === 200) return r.data;
                throw new Error(`Progress check gagal ID ${id}: ` + r.message);
        }

        async waitAll(ids, onProgress, timeoutMs = 150000) {
                const done = new Map();
                const start = Date.now();
                let pollCount = 0;

                while (done.size < ids.length) {
                        if (Date.now() - start > timeoutMs) {
                                throw new Error('Timeout: musik tidak selesai dalam 2.5 menit');
                        }
                        await new Promise(r => setTimeout(r, 4000));
                        pollCount++;

                        for (const id of ids) {
                                if (done.has(id)) continue;
                                try {
                                        const d = await this.getProgress(id);
                                        if (d.music_file) {
                                                done.set(id, d);
                                                if (onProgress) onProgress(done.size, ids.length);
                                        }
                                } catch (_) {}
                        }
                }
                return ids.map(id => done.get(id));
        }

        async downloadBuffer(url) {
                const res = await axios.get(url, {
                        responseType: 'arraybuffer',
                        timeout: 45000,
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                });
                return Buffer.from(res.data);
        }

        _pick(arr) {
                return arr[Math.floor(Math.random() * arr.length)];
        }

        _pickN(arr, n) {
                const shuffled = [...arr].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, n);
        }

        getRandomPreset() {
                const genre    = this._pick(_GENRES);
                const mood     = this._pick(_MOODS);
                const vibe     = this._pick(_VIBES);
                const instr    = this._pick(_INSTRUMENTS);
                const noun     = this._pick(_TITLE_NOUN);
                const adj      = this._pick(_TITLE_ADJ);

                const title      = `${noun} ${adj}`;
                const prompt     = `${genre} indonesia, ${mood}, ${vibe}, ${instr}`;
                const musicStyle = genre;

                return {
                        title,
                        prompt,
                        musicStyle,
                        lyrics: '',
                        isInstrumental: 1,
                };
        }
}

function formatDuration(sec) {
        if (!sec || sec <= 0) return '–';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function buildCaption(track, index, total, params) {
        const durStr = formatDuration(track.duration);
        const modelName = MODELS.find(m => m.id === (params.modelId || 6))?.version || 'v5.0';
        const lines = [
                `╭──『 🎵 *MUSIK AI* — Variasi ${index} dari ${total} 』`,
                `│`,
                `│ 🎼 *Judul*   : ${track.title || params.title || '–'}`,
                params.musicStyle ? `│ 🎸 *Genre*   : ${params.musicStyle}` : null,
                params.lyrics && !params.isInstrumental ? `│ 📝 *Lirik*   : Ada` : `│ 🎹 *Mode*    : Instrumental`,
                `│ 🤖 *Model*   : ${modelName}`,
                durStr !== '–' ? `│ ⏱️ *Durasi*  : ${durStr}` : null,
                `│`,
                `│ 🔊 Audio VN dikirim di bawah ↓`,
                `╰──────────────────────────────`,
        ].filter(Boolean);
        return lines.join('\n');
}

module.exports = { ChatMusicAPI, MODELS, formatDuration, buildCaption };
