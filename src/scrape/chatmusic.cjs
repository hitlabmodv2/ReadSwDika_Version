'use strict';

const axios = require('axios');

// ─── Gemmy AI (Gemini 2.5 Flash, free via Firebase) ──────────────────────
class GemmyAI {
        constructor() {
                this.authToken = null;
                this.tokenExpiry = null;
        }

        async getAuthToken() {
                if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) return this.authToken;
                const { data } = await axios.post(
                        'https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ',
                        { clientType: 'CLIENT_TYPE_ANDROID' },
                        { headers: {
                                'accept-encoding': 'gzip',
                                'accept-language': 'in-ID, en-US',
                                'connection': 'Keep-Alive',
                                'content-type': 'application/json',
                                'user-agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-J700F Build/QQ3A.200805.001)',
                                'x-android-cert': '037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2',
                                'x-android-package': 'com.jetkite.gemmy',
                                'x-client-version': 'Android/Fallback/X24000001/FirebaseCore-Android',
                                'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==',
                                'x-firebase-client': 'H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA',
                                'x-firebase-gmpid': '1:652803432695:android:c4341db6033e62814f33f2',
                        }}
                );
                if (!data.idToken) throw new Error('Gagal dapat token Gemmy AI');
                this.authToken = data.idToken;
                this.tokenExpiry = Date.now() + 3600 * 1000;
                return this.authToken;
        }

        async chat(prompt) {
                const token = await this.getAuthToken();
                const { data } = await axios.post(
                        'https://asia-northeast3-gemmy-ai-bdc03.cloudfunctions.net/gemini',
                        {
                                model: 'gemini-2.5-flash',
                                stream: false,
                                request: {
                                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                                        generationConfig: { maxOutputTokens: 4096 }
                                }
                        },
                        { headers: {
                                'accept-encoding': 'gzip',
                                'authorization': `Bearer ${token}`,
                                'content-type': 'application/json; charset=UTF-8',
                                'user-agent': 'okhttp/5.3.2',
                        }}
                );
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
}

const _gemmyInstance = new GemmyAI();

// ─── Pool besar untuk auto-generate kombinasi bebas ───────────────────────

const _GENRES = [
        // pop family
        'pop', 'indie pop', 'dream pop', 'synth pop', 'electro pop', 'chamber pop',
        'art pop', 'power pop', 'baroque pop', 'sophisti pop', 'jangle pop',
        // ballad / slow
        'ballad', 'slow ballad', 'piano ballad', 'orchestral ballad', 'r&b ballad',
        // rnb / soul
        'rnb', 'neo soul', 'soul', 'funk soul', 'quiet storm', 'contemporary rnb',
        // jazz
        'jazz', 'smooth jazz', 'jazz fusion', 'bossa nova', 'swing jazz', 'nu jazz',
        // acoustic / folk
        'acoustic', 'folk', 'indie folk', 'folk pop', 'fingerstyle', 'americana',
        'singer songwriter', 'celtic folk', 'bluegrass',
        // electronic
        'electronic', 'ambient electronic', 'chillwave', 'synthwave', 'retrowave',
        'future bass', 'deep house', 'lo-fi electronic', 'downtempo', 'trip hop',
        // dance
        'dance pop', 'edm', 'house', 'dance', 'disco', 'funk', 'dancehall',
        // lofi / chill
        'lofi hiphop', 'lofi beats', 'lofi jazz', 'chill hop', 'bedroom pop',
        // rock
        'rock', 'soft rock', 'indie rock', 'alternative rock', 'post rock',
        'shoegaze', 'math rock', 'blues rock', 'psychedelic rock',
        // classical / cinematic
        'ambient', 'classical', 'neoclassical', 'cinematic', 'orchestral',
        'film score', 'new age',
        // world / regional
        'reggae', 'hip hop', 'country', 'blues', 'latin pop', 'afrobeats',
        'flamenco', 'k-pop style', 'city pop',
];

const _MOODS = [
        // sad side
        'melancholy', 'sad', 'sorrowful', 'heartbroken', 'bittersweet',
        'wistful', 'mournful', 'aching', 'desolate', 'pensive',
        // nostalgic
        'nostalgic', 'reflective', 'reminiscent', 'sentimental', 'longing',
        'yearning', 'homesick',
        // romantic
        'romantic', 'tender', 'intimate', 'passionate', 'loving', 'sweet',
        'infatuated', 'gentle',
        // upbeat / happy
        'upbeat', 'energetic', 'joyful', 'cheerful', 'playful', 'euphoric',
        'excited', 'vibrant', 'lively', 'celebratory',
        // chill / peaceful
        'chill', 'peaceful', 'serene', 'tranquil', 'meditative', 'relaxed',
        'mellow', 'soothing', 'calm',
        // dreamy / mysterious
        'dreamy', 'ethereal', 'mysterious', 'otherworldly', 'hypnotic',
        'surreal', 'mystical', 'enchanting', 'hazy',
        // dark / intense
        'dark', 'tense', 'brooding', 'haunting', 'eerie', 'melancholic',
        'raw', 'intense', 'dramatic', 'epic',
        // hopeful / emotional
        'hopeful', 'emotional', 'moving', 'uplifting', 'inspiring',
        'empowering', 'cathartic',
];

const _VIBES = [
        // time of day
        'midnight vibes', 'late night', '3am feels', 'golden hour', 'sunset vibes',
        'sunrise', 'morning vibes', 'dusk', 'twilight', 'noon sun',
        // weather
        'rainy day', 'stormy night', 'winter cold', 'first snow', 'summer breeze',
        'foggy morning', 'thunder and rain', 'spring rain', 'sunny afternoon',
        // place
        'coffee shop', 'cozy room', 'empty streets', 'rooftop', 'city lights',
        'night club', 'beach sunset', 'ocean waves', 'forest walk', 'mountain top',
        'old bookstore', 'quiet library', 'basement studio', 'train window',
        'highway drive', 'back alley', 'small town', 'skyscraper view',
        'candlelit room', 'empty dance floor', 'late night diner',
        // space
        'starry night', 'moonlight', 'galaxy', 'cosmos', 'floating in space',
        // season / feeling
        'nostalgia trip', 'daydream', 'lost in thought', 'warm memories',
        'cold december', 'summer nostalgia', 'autumn leaves', 'cherry blossom',
];

const _INSTRUMENTS = [
        // strings
        'piano', 'grand piano', 'upright piano', 'electric piano', 'toy piano',
        'acoustic guitar', 'electric guitar', 'fingerstyle guitar', 'nylon guitar',
        'bass guitar', 'violin', 'cello', 'viola', 'double bass', 'harp',
        'banjo', 'mandolin', 'ukulele', 'sitar', 'koto',
        // winds / brass
        'flute', 'alto flute', 'clarinet', 'oboe', 'saxophone', 'alto sax',
        'tenor sax', 'trumpet', 'flugelhorn', 'trombone', 'french horn',
        // synth / electronic
        'synthesizer', 'analog synth', 'mellotron', 'theremin', 'moog synth',
        'pad synth', 'arp synth', 'vocoder',
        // percussion / beats
        'drum machine', 'soft beats', 'lo-fi drums', 'live drums', 'tabla',
        'bongos', 'marimba', 'vibraphone', 'glockenspiel',
        // ensemble
        'orchestral strings', 'string quartet', 'chamber ensemble',
        'choir', 'vocal harmonies',
];

const _TITLE_ADJ = [
        // warna / visual
        'Biru', 'Merah', 'Emas', 'Perak', 'Hitam', 'Putih', 'Abu', 'Ungu',
        'Hijau', 'Jingga', 'Merah Muda', 'Krem', 'Coklat', 'Tembaga',
        // waktu / suasana
        'Malam', 'Pagi', 'Senja', 'Fajar', 'Tengah Malam', 'Subuh', 'Petang',
        // sifat positif
        'Indah', 'Abadi', 'Terang', 'Hangat', 'Lembut', 'Bahagia', 'Nyata',
        'Agung', 'Murni', 'Tulus', 'Setia', 'Damai', 'Manis', 'Mulia',
        // sifat negatif / mellow
        'Sunyi', 'Gelap', 'Sepi', 'Dingin', 'Hilang', 'Pergi', 'Jauh',
        'Kelam', 'Redup', 'Senyap', 'Beku', 'Kosong', 'Rapuh', 'Lelah',
        // aksi / gerakan
        'Pulang', 'Hilang', 'Melayang', 'Terbang', 'Jatuh', 'Berlari',
        'Tenggelam', 'Menghilang', 'Bersinar', 'Berputar',
        // lain
        'Keras', 'Palsu', 'Teduh', 'Dekat', 'Rindu', 'Sungguh', 'Dalam',
        'Asing', 'Ganjil', 'Ajaib', 'Terakhir', 'Pertama', 'Baru', 'Lama',
];

const _TITLE_NOUN = [
        // alam
        'Langit', 'Bintang', 'Lautan', 'Angin', 'Hujan', 'Cahaya', 'Awan',
        'Bulan', 'Matahari', 'Gunung', 'Hutan', 'Sungai', 'Laut', 'Danau',
        'Badai', 'Petir', 'Salju', 'Pasir', 'Tanah', 'Api',
        // abstrak / perasaan
        'Kenangan', 'Mimpi', 'Jiwa', 'Bayangan', 'Hati', 'Cinta', 'Duka',
        'Tawa', 'Rindu', 'Harap', 'Rasa', 'Resah', 'Gundah', 'Amarah',
        'Bahagia', 'Sedih', 'Takut', 'Damai', 'Tenang', 'Hampa',
        // musik
        'Nada', 'Irama', 'Melodi', 'Lagu', 'Suara', 'Dansa', 'Harmoni',
        'Simfoni', 'Kord', 'Notasi', 'Lirik', 'Tempo',
        // tempat / benda
        'Ruang', 'Jalan', 'Pintu', 'Jendela', 'Sayap', 'Cerita', 'Hari',
        'Waktu', 'Momen', 'Saat', 'Jejak', 'Langkah', 'Perjalanan',
        'Rumah', 'Kota', 'Desa', 'Pantai', 'Puncak', 'Lembah',
        // lain
        'Jiwa', 'Raga', 'Nama', 'Wajah', 'Mata', 'Tangan', 'Nafas',
        'Detak', 'Nadi', 'Senyum', 'Air Mata', 'Pelukan',
];

const MODELS = [
        { id: 6, version: 'v5.0' },
        { id: 5, version: 'v4.5-plus' },
        { id: 4, version: 'v4.5' },
        { id: 3, version: 'v4.0' },
        { id: 1, version: 'v3.5' },
];

// ─── Sanitizer lirik: ganti kata sensitif sebelum dikirim ke API ──────────
const _SENSITIVE_MAP = [
        // narkoba
        [/\bsabu\b/gi,       'rindu'],
        [/\bshabu\b/gi,      'rindu'],
        [/\bnarkoba\b/gi,    'cinta'],
        [/\bganja\b/gi,      'cahaya'],
        [/\bheroin\b/gi,     'mimpi'],
        [/\bkokain\b/gi,     'harapan'],
        [/\bmorfin\b/gi,     'perasaan'],
        [/\bekstasi\b/gi,    'bahagia'],
        [/\bputaw\b/gi,      'embun'],
        [/\btramadol\b/gi,   'waktu'],
        [/\bmetamfetamin\b/gi,'semangat'],
        [/\bnarkotika\b/gi,  'kenangan'],
        [/\bopium\b/gi,      'angan'],
        // nama politik / SARA (variasi umum)
        [/\bmulyono\b/gi,    'seseorang'],
        [/\bjokowi\b/gi,     'pemimpin'],
        [/\bprabowo\b/gi,    'pahlawan'],
        [/\banies\b/gi,      'penggagas'],
        // kekerasan eksplisit
        [/\bbunuh\b/gi,      'pergi'],
        [/\bmembunuh\b/gi,   'meninggalkan'],
        [/\bpembunuhan\b/gi, 'kepergian'],
        [/\bmembantai\b/gi,  'melepaskan'],
        [/\bperkosa\b/gi,    'memaksa rasa'],
        // kata kasar keras
        [/\bkontol\b/gi,     'kamu'],
        [/\bbajingan\b/gi,   'orang'],
        [/\bbangsat\b/gi,    'kawan'],
        [/\blasingkan\b/gi,  'jauhkan'],
];

function sanitizeLyrics(text) {
        if (!text) return text;
        let out = text;
        for (const [re, rep] of _SENSITIVE_MAP) out = out.replace(re, rep);
        return out;
}

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
                // Pass 1: sanitize lirik & title sebelum dikirim
                const cleanTitle  = sanitizeLyrics(params.title  || 'My Song');
                const cleanLyrics = sanitizeLyrics(params.lyrics || '');
                const cleanPrompt = sanitizeLyrics(params.prompt || '');

                const body = {
                        music_model_id: params.modelId || 6,
                        title: cleanTitle.slice(0, 80),
                        prompt: cleanPrompt.slice(0, 200),
                        lyrics: cleanLyrics.slice(0, 1000),
                        is_instrumental: params.isInstrumental ? 1 : 0,
                        music_style: params.musicStyle || 'pop',
                        music_style_code: '',
                        gender_type: params.genderType ?? 0,
                };

                const r = await this._req('/music/create-music', body);
                if (r.code === 200) return r.data.create_id;

                // Pass 2: masih sensitive → strip semua non-alfanumerik dari lirik lalu retry
                if (/sensitive words|prohibited/i.test(r.message || '')) {
                        const stripped = cleanLyrics
                                .replace(/[^\w\s,.\-!?]/gi, ' ')
                                .replace(/\s{2,}/g, ' ')
                                .trim();
                        const r2 = await this._req('/music/create-music', {
                                ...body,
                                lyrics: stripped.slice(0, 1000),
                                title:  cleanTitle.replace(/[^\w\s]/gi, ' ').trim().slice(0, 80),
                        });
                        if (r2.code === 200) return r2.data.create_id;
                        throw new Error('Generate gagal: ' + r2.message);
                }

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
                const r = () => Math.random();

                // Genre: kadang ambil 1, kadang 2 (hybrid)
                const genre = r() < 0.25
                        ? `${this._pick(_GENRES)} ${this._pick(_GENRES)}`
                        : this._pick(_GENRES);

                // Mood: 70% 1 mood, 30% 2 mood digabung
                const moods = r() < 0.3
                        ? this._pickN(_MOODS, 2).join(', ')
                        : this._pick(_MOODS);

                // Vibe: 80% 1, 20% 2
                const vibes = r() < 0.2
                        ? this._pickN(_VIBES, 2).join(', ')
                        : this._pick(_VIBES);

                // Instrument: 60% 1, 40% 2
                const instrs = r() < 0.4
                        ? this._pickN(_INSTRUMENTS, 2).join(' and ')
                        : this._pick(_INSTRUMENTS);

                // Pola judul: variatif (6 pola berbeda)
                const noun1 = this._pick(_TITLE_NOUN);
                const noun2 = this._pick(_TITLE_NOUN);
                const adj   = this._pick(_TITLE_ADJ);
                const titlePattern = Math.floor(r() * 6);
                const title = [
                        `${noun1} ${adj}`,             // 0: noun + adj (Kenangan Biru)
                        `${adj} ${noun1}`,             // 1: adj + noun (Sunyi Malam)
                        `${noun1} ${noun2}`,           // 2: noun + noun (Hujan Kenangan)
                        `${noun1}`,                    // 3: noun doang (Bayangan)
                        `${adj} ${noun1} ${noun2}`,    // 4: adj + noun + noun (Sunyi Hujan Malam)
                        `${noun1} di ${noun2}`,        // 5: noun + di + noun (Rindu di Lautan)
                ][titlePattern];

                // Mode: 55% instrumental, 45% vokal
                const isInstrumental = r() < 0.55 ? 1 : 0;

                const prompt = `${genre} indonesia, ${moods}, ${vibes}, ${instrs}`;

                return {
                        title,
                        prompt,
                        musicStyle: genre,
                        lyrics: '',
                        isInstrumental,
                };
        }

        /**
         * Random preset tapi judul + lirik di-generate otomatis oleh Gemmy AI
         * sesuai genre/mood/vibe yang diacak — lebih akurat & lirik panjang
         * @returns {Promise<{title,prompt,musicStyle,genreLabel,lyrics,isInstrumental}>}
         */
        async aiRandomPreset(forceMode = null) {
                // 1. Acak genre/mood/vibe/instrument seperti biasa
                const r = () => Math.random();

                const genre = r() < 0.25
                        ? `${this._pick(_GENRES)} ${this._pick(_GENRES)}`
                        : this._pick(_GENRES);
                const mood = r() < 0.3
                        ? this._pickN(_MOODS, 2).join(' and ')
                        : this._pick(_MOODS);
                const vibe = r() < 0.2
                        ? this._pickN(_VIBES, 2).join(', ')
                        : this._pick(_VIBES);
                const instr = r() < 0.4
                        ? this._pickN(_INSTRUMENTS, 2).join(' and ')
                        : this._pick(_INSTRUMENTS);
                // forceMode: 'vocal' → 0, 'instrumental' → 1, null → acak
                const isInstrumental = forceMode === 'instrumental' ? 1
                        : forceMode === 'vocal' ? 0
                        : (r() < 0.35 ? 1 : 0);

                const prompt = `${genre} indonesia, ${mood}, ${vibe}, ${instr}`;

                // 2. Minta Gemmy AI generate judul + lirik yang sesuai
                const aiPrompt = isInstrumental
                        ? `Kamu adalah penulis lagu profesional Indonesia.
Berdasarkan info berikut:
- Genre: ${genre}
- Mood: ${mood}
- Suasana: ${vibe}
- Instrumen: ${instr}
- Mode: Instrumental (tanpa lirik vokal)

Buatkan judul lagu instrumental yang puitis (1-4 kata, bahasa Indonesia).
Format jawaban persis:
JUDUL: [judul lagu]
GENRE_LABEL: [genre singkat max 30 karakter]`
                        : `Kamu adalah penulis lagu profesional Indonesia.
Berdasarkan info berikut:
- Genre: ${genre}
- Mood: ${mood}
- Suasana/vibe: ${vibe}
- Instrumen: ${instr}

Buatkan:
1. JUDUL lagu (1-4 kata, bahasa Indonesia, puitis, sesuai mood)
2. LIRIK lengkap dengan struktur: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Outro]

Ketentuan lirik:
- Minimal 55 baris total
- Setiap section minimal 4 baris
- Bahasa Indonesia yang puitis dan natural
- Sesuai genre, mood, dan vibe
- JANGAN masukkan kata kasar, SARA, narkoba, atau konten sensitif

Format jawaban HARUS persis seperti ini:
JUDUL: [judul lagu]
GENRE_LABEL: [genre singkat max 30 karakter]
LIRIK:
[seluruh lirik di sini]`;

                const aiResult = await _gemmyInstance.chat(aiPrompt);

                // 3. Parse hasil AI
                const judulMatch = aiResult.match(/JUDUL:\s*(.+)/);
                const genreMatch = aiResult.match(/GENRE_LABEL:\s*(.+)/);
                const lirikMatch = aiResult.match(/LIRIK:\n([\s\S]+)/);

                const title      = sanitizeLyrics(judulMatch?.[1]?.trim() || this._pick(_TITLE_NOUN) + ' ' + this._pick(_TITLE_ADJ));
                const genreLabel = genreMatch?.[1]?.trim() || genre;
                const lyrics     = isInstrumental ? '' : sanitizeLyrics(lirikMatch?.[1]?.trim() || '');

                return {
                        title,
                        prompt,
                        musicStyle: genre,
                        genreLabel,
                        lyrics,
                        isInstrumental,
                        _aiGenerated: true,
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
                params.isInstrumental ? `│ 🎹 *Mode*    : Instrumental` : `│ 🎤 *Mode*    : Dengan Vokal`,
                params.lyrics && !params.isInstrumental ? `│ 📝 *Lirik*   : Ada` : null,
                `│ 🤖 *Model*   : ${modelName}`,
                durStr !== '–' ? `│ ⏱️ *Durasi*  : ${durStr}` : null,
                `│`,
                `│ 🔊 Audio VN dikirim di bawah ↓`,
                `╰──────────────────────────────`,
        ].filter(Boolean);
        return lines.join('\n');
}

module.exports = { ChatMusicAPI, MODELS, formatDuration, buildCaption };
