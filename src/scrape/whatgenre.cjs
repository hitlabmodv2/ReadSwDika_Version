'use strict';

const axios = require('axios');

class GemmyGemini {
    constructor() {
        this.authToken  = null;
        this.tokenExpiry = null;
    }

    async getAuthToken() {
        if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
            return this.authToken;
        }

        const { data } = await axios.post(
            'https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ',
            { clientType: 'CLIENT_TYPE_ANDROID' },
            {
                headers: {
                    'accept-encoding':     'gzip',
                    'accept-language':     'in-ID, en-US',
                    'connection':          'Keep-Alive',
                    'content-type':        'application/json',
                    'user-agent':          'Dalvik/2.1.0 (Linux; U; Android 10; SM-J700F Build/QQ3A.200805.001)',
                    'x-android-cert':      '037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2',
                    'x-android-package':   'com.jetkite.gemmy',
                    'x-client-version':    'Android/Fallback/X24000001/FirebaseCore-Android',
                    'x-firebase-appcheck': 'eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==',
                    'x-firebase-client':   'H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA',
                    'x-firebase-gmpid':    '1:652803432695:android:c4341db6033e62814f33f2',
                },
            }
        );

        if (!data.idToken) throw new Error('Gagal mendapatkan Gemmy auth token.');
        this.authToken   = data.idToken;
        this.tokenExpiry = Date.now() + 3600 * 1000;
        return this.authToken;
    }

    async chat({ contents, model = 'gemini-2.5-flash', ...config }) {
        if (!Array.isArray(contents)) throw new Error('Contents harus berupa array.');
        const authToken = await this.getAuthToken();

        const { data } = await axios.post(
            'https://asia-northeast3-gemmy-ai-bdc03.cloudfunctions.net/gemini',
            {
                model,
                stream: false,
                request: {
                    contents,
                    generationConfig: { maxOutputTokens: 8192, ...config },
                },
            },
            {
                headers: {
                    'accept-encoding': 'gzip',
                    'authorization':   `Bearer ${authToken}`,
                    'content-type':    'application/json; charset=UTF-8',
                    'user-agent':      'okhttp/5.3.2',
                },
            }
        );

        return data;
    }

    extractText(response) {
        try {
            const candidates = response?.candidates || response?.response?.candidates || [];
            const parts = candidates[0]?.content?.parts || [];
            return parts.map(p => p.text || '').join('').trim();
        } catch (_) {
            return '';
        }
    }
}

const gemmy = new GemmyGemini();

const PROMPT_ANALYZE_AUDIO = `Kamu adalah analis audio profesional. Dengarkan audio ini dan berikan analisis detail dalam format berikut (gunakan bahasa Indonesia):

╭═══〔 🎵 *ANALISIS AUDIO* 〕═══╮
│
│ 🎼 *Genre*     : [genre utama / sub-genre]
│ 🎭 *Mood*      : [mood / suasana]
│ 🎹 *Instrumen* : [daftar instrumen yang terdengar]
│ 🎤 *Vokal*     : [ada/tidak, jenis vokal]
│ ⏱️ *Tempo*     : [lambat/sedang/cepat - BPM estimasi]
│ 🔊 *Energi*    : [rendah/sedang/tinggi]
│ 📝 *Deskripsi* : [1-2 kalimat ringkas tentang audio ini]
│
╰══════════════════════════════╯

Jawab hanya dengan format di atas, singkat dan akurat.`;

/**
 * Analisis audio menggunakan Gemmy (Gemini Firebase API).
 * @param {Buffer} audioBuffer - buffer audio
 * @param {string} mimeType    - mime type audio (audio/ogg, audio/mpeg, dsb)
 * @returns {Promise<string>}  - teks hasil analisis
 */
async function analyzeAudio(audioBuffer, mimeType = 'audio/ogg') {
    const base64Audio = audioBuffer.toString('base64');

    const safeMime = mimeType.includes('ogg') ? 'audio/ogg'
        : mimeType.includes('mp4') || mimeType.includes('m4a') ? 'audio/mp4'
        : mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'audio/mpeg'
        : mimeType.includes('wav') ? 'audio/wav'
        : mimeType.includes('flac') ? 'audio/flac'
        : 'audio/ogg';

    const response = await gemmy.chat({
        model: 'gemini-2.5-flash',
        contents: [{
            role: 'user',
            parts: [
                { inlineData: { mimeType: safeMime, data: base64Audio } },
                { text: PROMPT_ANALYZE_AUDIO },
            ],
        }],
    });

    const text = gemmy.extractText(response);
    if (!text) throw new Error('Gemmy tidak mengembalikan respons.');
    return text;
}

module.exports = { analyzeAudio };
