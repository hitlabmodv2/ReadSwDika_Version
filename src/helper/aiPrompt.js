/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *  Support dari kalian bikin saya
 *  makin semangat update fitur,
 *  fix bug, dan rawat script ini.
 *
 *  Dilarang menjual ulang script ini
 *  Tanpa izin resmi dari developer.
 *  Jika ketahuan = NO UPDATE / NO FIX
 *
 *  Hargai karya, gunakan dengan bijak.
 *  Terima kasih sudah support.
 * ───────────────────────────────
 */
'use strict';

import { buildReactPromptRules, buildPersonalityBoost } from './aiReact.js';
import { formatMemoryForPrompt } from './userMemory.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AI_PROMPT_TXT = join(__dirname, 'aiPrompt.txt');

function loadPromptTemplate() {
    return readFileSync(AI_PROMPT_TXT, 'utf8');
}

/**
 * Prompt untuk ekstrak analisis stiker menjadi JSON terstruktur
 * Dipakai background job saat bot pertama kali lihat stiker baru
 */
export function buildStickerAnalysisExtractionPrompt() {
    return `Analisis stiker/gambar ini dan berikan hasil dalam format JSON murni tanpa markdown.

Format JSON yang HARUS dikembalikan (semua field wajib):
{
  "emotion": "emosi dominan dalam 1-3 kata (contoh: senang, sedih, marah, bingung, malu, awkward, cool, lucu, dll)",
  "category": "kategori stiker dalam 1-2 kata (contoh: meme, anime, karakter, ekspresi, hewan, teks, lucu, dll)",
  "description": "deskripsi singkat isi stiker maksimal 1 kalimat",
  "tags": ["tag1", "tag2", "tag3"]
}

Aturan WAJIB:
- Kembalikan JSON murni saja, tanpa kode blok, tanpa penjelasan
- tags maksimal 5 kata kunci relevan
- Semua teks dalam bahasa Indonesia
- Jika ada teks di stiker, sertakan di description`;
}

export function buildWilyFallbackUserPrompt(mediaType = '') {
    if (mediaType.includes('sticker')) return 'Pengguna mengirim sticker. Analisis ekspresi, emosi, gestur, dan maksud sticker ini, lalu balas dengan santai dan natural seperti merespons reaksi sticker tersebut.';
    if (mediaType.includes('video')) return 'Pengguna mengirim video. Berikan respons yang natural, minta mereka menjelaskan isi videonya atau tanyakan konteksnya dengan ramah.';
    if (mediaType.includes('audio')) return 'Pengguna mengirim voice note';
    if (mediaType.includes('document')) return 'Pengguna mengirim dokumen';
    return 'Halo!';
}

export function buildVideoDownloadCaptionPrompt({ platform = '', title = '', author = '', duration = '', description = '', views = '', likes = '', comments = '' } = {}) {
    const parts = [];
    if (title) parts.push(`Judul: "${title}"`);
    if (author) parts.push(`Channel/Author: ${author}`);
    if (duration) parts.push(`Durasi: ${duration}`);
    if (views) parts.push(`Views: ${views}`);
    if (likes) parts.push(`Likes: ${likes}`);
    if (comments) parts.push(`Comments: ${comments}`);
    if (description) parts.push(`Deskripsi/Caption asli: ${description.substring(0, 400)}`);

    const emojiHint = platform === 'TikTok' ? '📱' : platform === 'Instagram' ? '📸' : platform === 'YouTube' ? '🎵' : '🎬';

    return `Kamu adalah asisten bot WhatsApp yang cerdas dan natural.
Tugasmu: buat caption WhatsApp yang menarik, akurat, dan informatif untuk ${platform === 'YouTube Audio' ? 'audio/musik' : 'video'} yang baru diunduh dari ${platform}.

Informasi konten:
${parts.join('\n')}

Aturan WAJIB:
1. Mulai dengan emoji relevan (${emojiHint}) dan judul dalam *bold*
2. Tambahkan 1-2 kalimat komentar/deskripsi singkat yang akurat tentang konten ini
3. Jika ada info musik (judul lagu/artis), sebut dengan tepat
4. Bahasa Indonesia santai dan natural, tidak kaku atau template
5. Jangan buat info palsu di luar data yang diberikan
6. Maksimal 4-5 baris total — ringkas tapi berisi
7. Jangan sertakan URL atau link apapun
8. Jangan bilang kamu AI

Caption:`
}

export function buildWilyMediaUserPrompt({
    mediaLabel = 'media',
    hasSticker = false,
    isStickerReply = false,
    isImageReply = false,
    isDocumentMode = false,
    mode = 'default',
} = {}) {
    if (isDocumentMode && mediaLabel === 'PDF') {
        return 'Tolong rangkum dan jelaskan isi dokumen PDF ini secara lengkap dan terstruktur.';
    }

    if (hasSticker) {
        if (isStickerReply) {
            return 'User balas pesan bot pakai sticker ini. Tangkap emosi/maksud sticker, lalu balas 1-3 kalimat natural yang nyambung dengan konteks percakapan sebelumnya. JANGAN buat analisis formal atau breakdown.';
        }

        if (mode === 'short') {
            return 'Tangkap emosi/vibe sticker ini dan balas 1-2 kalimat santai yang nyambung. JANGAN buat analisis panjang.';
        }

        return 'User kirim sticker ini. Tangkap emosi/vibe-nya dan balas dengan 1-3 kalimat natural yang nyambung seperti orang ngobrol biasa. JANGAN buat analisis formal, heading, atau bullet point.';
    }

    if (isImageReply) {
        return 'Analisis gambar yang aku kirim ini dan jawab apa yang aku inginkan sesuai konteks percakapan kita.';
    }

    if (mode === 'command') {
        return `Tolong analisis ${mediaLabel} ini secara lengkap dan detail. Sebutkan: judul anime/film/series jika ada, nama karakter atau orang jika ada, semua teks yang tertulis, dan deskripsi konten secara akurat.`;
    }

    if (mode === 'identify') {
        return `Tolong identifikasi dan analisis ${mediaLabel} ini secara lengkap. Jika ada objek, tanaman, hewan, makanan, atau benda di dalamnya — sebut namanya secara spesifik, jelaskan ciri khas dan informasi menariknya.`;
    }

    if (mode === 'private') {
        return `Tolong analisis ${mediaLabel} ini secara lengkap dan detail.`;
    }

    return `Tolong analisis ${mediaLabel} ini secara lengkap dan akurat.`;
}

export function buildWilyVisionContextPrompt({
    isImageReply = false,
    isStickerReply = false,
    quotedBotText = '',
    hasSticker = false,
    mediaLabel = 'gambar',
    userMessage = '',
} = {}) {
    if ((isImageReply || isStickerReply) && quotedBotText) {
        return `[Konteks — pesanmu sebelumnya yang dibalas user]:\n"${quotedBotText.substring(0, 800)}"\n\n[Media user]: ${hasSticker ? 'sticker/reaction sticker' : mediaLabel || 'gambar'}\n\n[Pertanyaan/permintaan user]:\n${userMessage}`;
    }

    return userMessage;
}

export function buildSmartImageWaitPrompt({ userName, userQuestion, query, count }) {
    return `Buat pesan tunggu WhatsApp untuk Wily Bot saat sedang mencari gambar.

Konteks:
- Nama user: ${userName}
- Pesan asli user: "${userQuestion || query}"
- Query gambar: "${query}"
- Jumlah gambar yang akan dicari: ${count}
- Jika jumlah lebih dari 1, hasil akan dikirim sebagai album WhatsApp, bukan kolase.

Aturan:
1. Bahasa Indonesia santai, natural, dan terasa cerdas.
2. Jangan pakai template kaku seperti "Siap ..., aku cariin ... dulu ya" terus-menerus.
3. Harus nyambung dengan permintaan user.
4. Sebut jumlah gambar jika lebih dari 1.
5. Kalau lebih dari 1 gambar, boleh sebut akan dikirim sebagai album/paket.
6. Maksimal 1 kalimat pendek.
7. Jangan janji terlalu berlebihan soal akurasi; cukup bilang akan dipilih yang paling cocok.
8. Jangan bilang kamu AI.
9. Boleh pakai 1 emoji yang relevan.

Pesan tunggu:`;
}

export function buildSmartAlbumCaptionPrompt({ userQuestion, query, index, total }) {
    const displayIndex = index + 1;
    return `Kamu adalah AI caption WhatsApp yang cerdas dan akurat.
Tugasmu: baca gambar ini, lalu buat caption untuk gambar nomor ${displayIndex} dari total ${total} gambar.

Permintaan asli user:
"${userQuestion}"

Query pencarian:
"${query}"

Aturan wajib:
1. Caption harus diawali persis dengan: 🖼️ *${displayIndex} dari ${total}*
2. Jelaskan isi gambar ini saja, jangan bahas gambar lain.
3. Kalau gambar berisi karakter/anime/game, sebutkan nama karakter dan franchise jika terlihat/terdeteksi.
4. Kalau tidak yakin nama karakternya, tulis "Kemungkinan ..." atau deskripsi visual singkat. Jangan mengarang terlalu yakin.
5. Ikuti permintaan user. Kalau user minta "karakter loli 3 saja", caption harus fokus ke karakter/anime style, bukan caption umum.
6. Jangan sertakan URL/link.
7. Bahasa Indonesia santai, rapi, maksimal 3 baris.
8. Jangan bilang "saya tidak bisa", jangan bilang kamu AI.

Contoh format:
🖼️ *${displayIndex} dari ${total}*
Nama/kemungkinan karakter — keterangan singkat yang sesuai gambar.`;
}

export function buildSmartImageHistoryPrompt({ userQuestion, query, count, captionContext }) {
    return `Buat satu balasan singkat natural untuk disimpan sebagai history percakapan Wily Bot.

Konteks:
- User meminta: "${userQuestion}"
- Query gambar: "${query}"
- Jumlah gambar terkirim: ${count}
- Caption gambar yang dikirim:
${captionContext || '-'}

Aturan:
1. Bahasa Indonesia santai, nyambung, tidak kaku.
2. Jangan pakai template tetap seperti "Ini X gambar..." terus-menerus.
3. Boleh variasikan kata-kata, tapi tetap jelas bahwa gambar sudah dikirim.
4. Kalau ada nama karakter/franchise di caption, sebut seperlunya.
5. Maksimal 1 kalimat pendek.
6. Jangan sertakan URL.
7. Jangan bilang kamu AI.

Balasan history:`;
}

/**
 * ══════════════════════════════════════════════════════════
 *  DYNAMIC AI BOOSTER — Auto-prompt enhancer
 *  Dipanggil otomatis oleh buildWilyAICommandPrompt()
 *
 *  Cara kerja:
 *    1. Baca pesan user + konteks (history, media, dsb.)
 *    2. Auto-deteksi: topik, bahasa, intent, sentimen, kompleksitas
 *    3. Inject persona ahli + framework reasoning + self-verification
 *       yang relevan, tanpa perlu prompt manual setiap kali.
 *
 *  Hasil: prompt jadi auto-expand sesuai pertanyaan → AI lebih cerdas,
 *  jawaban lebih dalam, format lebih konsisten.
 * ══════════════════════════════════════════════════════════
 */

const TOPIC_KEYWORDS = {
    coding: ['code', 'kode', 'script', 'function', 'fungsi', 'bug', 'error', 'debug', 'compile', 'syntax', 'javascript', 'python', 'java', 'php', 'sql', 'html', 'css', 'react', 'node', 'api', 'database', 'algoritma', 'array', 'object', 'class', 'method', 'variable', 'loop', 'regex', 'git', 'docker', 'linux', 'terminal', 'npm', 'package', 'library', 'framework'],
    math: ['hitung', 'rumus', 'matematika', 'aljabar', 'kalkulus', 'integral', 'turunan', 'persamaan', 'fungsi', 'matrix', 'matriks', 'statistik', 'probabilitas', 'geometri', 'trigonometri', 'limit', 'logaritma', 'eksponen', 'akar', 'pangkat', 'persen', 'rumus', '+', '-', '×', '÷', '='],
    science: ['fisika', 'kimia', 'biologi', 'sains', 'molekul', 'atom', 'sel', 'dna', 'gen', 'evolusi', 'gravitasi', 'energi', 'reaksi', 'unsur', 'senyawa', 'organisme', 'ekosistem', 'astronomi', 'planet', 'galaksi', 'tata surya', 'bintang'],
    history: ['sejarah', 'perang', 'kerajaan', 'raja', 'sultan', 'kemerdekaan', 'kolonial', 'belanda', 'jepang', 'soekarno', 'orde baru', 'reformasi', 'majapahit', 'sriwijaya', 'mataram', 'voc'],
    medical: ['sakit', 'penyakit', 'gejala', 'obat', 'dokter', 'rumah sakit', 'kesehatan', 'medis', 'demam', 'flu', 'batuk', 'pusing', 'mual', 'pingsan', 'darah', 'jantung', 'paru', 'ginjal', 'liver', 'diabetes', 'hipertensi', 'kanker', 'virus', 'bakteri', 'infeksi', 'alergi', 'operasi', 'terapi'],
    psych: ['curhat', 'sedih', 'galau', 'stres', 'depresi', 'cemas', 'anxiety', 'trauma', 'panik', 'putus', 'patah hati', 'kecewa', 'lelah', 'capek', 'kesepian', 'kosong', 'hampa', 'overthinking', 'insecure', 'minder', 'self-love', 'mental', 'jiwa', 'perasaan'],
    finance: ['uang', 'gaji', 'bisnis', 'investasi', 'saham', 'kripto', 'crypto', 'bitcoin', 'ethereum', 'reksadana', 'deposito', 'tabungan', 'kredit', 'pinjam', 'utang', 'cicilan', 'bunga', 'inflasi', 'ekonomi', 'modal', 'omset', 'profit', 'rugi', 'pajak', 'bank'],
    creative: ['tulis', 'buat', 'rangkai', 'puisi', 'cerpen', 'novel', 'cerita', 'lirik', 'lagu', 'caption', 'desain', 'logo', 'brand', 'kreatif', 'ide', 'brainstorm', 'inspirasi', 'konten', 'tiktok', 'instagram', 'youtube', 'reels', 'shorts'],
    anime: ['anime', 'manga', 'manhwa', 'manhua', 'webtoon', 'otaku', 'waifu', 'husbando', 'isekai', 'shonen', 'shojo', 'seinen', 'josei', 'hentai', 'doujin', 'character', 'karakter', 'episode', 'chapter', 'arc'],
    game: ['game', 'main', 'mabar', 'rank', 'tier', 'build', 'meta', 'patch', 'mobile legend', 'ml', 'pubg', 'ff', 'free fire', 'genshin', 'honkai', 'valorant', 'lol', 'dota', 'cod', 'roblox', 'minecraft', 'gacha'],
    music: ['lagu', 'musik', 'lirik', 'chord', 'gitar', 'piano', 'kunci', 'nada', 'genre', 'band', 'penyanyi', 'rapper', 'kpop', 'jpop', 'spotify', 'youtube music'],
    food: ['masak', 'resep', 'makanan', 'minuman', 'kue', 'masakan', 'bumbu', 'rempah', 'kuliner', 'cafe', 'restoran', 'warung', 'bakso', 'mie', 'nasi', 'sambal', 'soto', 'sate'],
    travel: ['wisata', 'liburan', 'jalan-jalan', 'traveling', 'destinasi', 'pantai', 'gunung', 'hotel', 'penginapan', 'tiket', 'pesawat', 'kereta', 'bandara', 'visa', 'paspor'],
    language: ['arti', 'translate', 'translasi', 'terjemah', 'bahasa', 'inggris', 'jepang', 'korea', 'mandarin', 'arab', 'spanyol', 'jerman', 'prancis'],
    nsfw: ['ngentot', 'sex', 'sex.', 'seks', 'memek', 'kontol', 'penis', 'vagina', 'tetek', 'toket', 'pepek', 'hentai', 'porn', 'porno', 'bokep', 'masturbasi', 'onani', 'crot', 'orgasme'],
    debate: ['menurut kamu', 'menurutmu', 'pendapat', 'opini', 'setuju', 'tidak setuju', 'argumen', 'debat', 'diskusi', 'pro kontra', 'sudut pandang'],
    identify: ['siapa', 'apa ini', 'ini apa', 'judul', 'nama', 'identifikasi', 'kenali', 'kenalin', 'tau gak'],
    summarize: ['rangkum', 'rangkuman', 'ringkas', 'simpulin', 'kesimpulan', 'tldr', 'tl;dr', 'inti'],
    howto: ['cara', 'gimana', 'bagaimana', 'tutorial', 'langkah', 'step', 'panduan'],
    compare: ['vs', 'versus', 'banding', 'bedanya', 'perbedaan', 'lebih baik', 'lebih bagus', 'pilih mana'],
};

const PERSONA_MODULES = {
    coding: `\n🧑‍💻 *EXPERT MODE: Coding & Programming*
   • Pikirkan: bahasa apa, framework apa, runtime/lingkungan, edge case
   • Kalau debug: identifikasi *root cause* — bukan cuma symptom
   • Kalau buat kode: tulis lengkap, runnable, dengan error handling
   • Selalu sertakan komentar kunci di kode kompleks
   • Sebut versi/kompatibilitas jika relevan (Node 20+, Python 3.10+, dll)
   • Kalau ada >1 cara, sebut singkat trade-off-nya`,
    math: `\n📐 *EXPERT MODE: Matematika*
   • WAJIB tunjukkan langkah-per-langkah perhitungan, bukan hanya hasil
   • Pakai \`\`\`backtick\`\`\` untuk rumus dan angka
   • Verifikasi hasil dengan substitusi balik kalau memungkinkan
   • Sebut satuan dengan benar (kg, m/s, dll)
   • Pakai notasi standar: pangkat dengan ², ³, akar dengan √, dll`,
    science: `\n🔬 *EXPERT MODE: Sains*
   • Jawab berbasis konsensus ilmiah terkini, bukan mitos atau pseudosains
   • Sebut nama hukum/teori jika relevan (Hukum Newton, Teori Relativitas, dll)
   • Kalau ada angka/data, sebut sumbernya secara umum (NASA, WHO, jurnal, dll)
   • Bedakan tegas antara fakta vs hipotesis vs spekulasi`,
    history: `\n📜 *EXPERT MODE: Sejarah*
   • Sebut tahun/periode dengan akurat
   • Berikan konteks: penyebab → kejadian → dampak
   • Hindari bias narasi tunggal — sebut perspektif yang berbeda jika ada
   • Untuk sejarah Indonesia: sebut tokoh, lokasi, dan pengaruhnya`,
    medical: `\n⚕️ *EXPERT MODE: Kesehatan*
   • Berikan info edukatif berbasis sumber medis kredibel (WHO, KEMENKES, jurnal)
   • Sebut gejala umum, kemungkinan penyebab, dan kapan WAJIB ke dokter
   • DILARANG diagnosis pasti / resep obat tanpa pemeriksaan
   • Selalu akhiri: "Kalau gejala berlanjut atau berat, segera ke dokter ya"`,
    psych: `\n💙 *EMPATHY MODE: Curhat & Mental Health*
   • PRIORITAS: validasi perasaan dulu, baru solusi
   • Format: dengarkan → akui perasaan → eksplorasi singkat → opsi langkah kecil
   • Jangan langsung kasih nasehat berderet — itu terkesan menggurui
   • Jangan toxic positivity ("yang sabar ya", "semua akan baik-baik saja")
   • Kalau ada tanda krisis (self-harm, suicidal): arahkan ke 119 ext 8 / Into The Light dengan empati
   • Bahasa: hangat, hadir, manusiawi`,
    finance: `\n💰 *EXPERT MODE: Keuangan*
   • Berikan info edukatif, BUKAN nasehat investasi spesifik
   • Sebut risiko, return realistis, dan time horizon
   • Jelaskan istilah teknis (APR, ROI, NAV, dll) dengan analogi sederhana
   • Selalu reminder: "DYOR (do your own research) sebelum invest"`,
    creative: `\n✨ *CREATIVE MODE: Tulisan & Konten*
   • Tanyakan dulu (atau asumsikan): tone, panjang, target audience
   • Kasih variasi opsi kalau diminta brainstorm (3-5 ide)
   • Hindari kalimat klise dan pembuka generik
   • Pakai showing not telling untuk fiksi`,
    anime: `\n🎌 *EXPERT MODE: Anime/Manga/Manhwa*
   • Sebut judul lengkap (romaji + arti), studio/author, tahun rilis, jumlah ep/chapter
   • Genre, demographic, plot singkat tanpa spoiler besar
   • Kalau ada season/arc, sebut urutan terbaik untuk nonton/baca
   • Untuk karakter: nama lengkap, voice actor (jika anime), peran, ciri khas
   • NSFW/18+: jawab faktual, sebut kategori (vanilla, NTR, yuri, yaoi, dll) tanpa sensor hipokrit`,
    game: `\n🎮 *EXPERT MODE: Game*
   • Sebut platform, developer, genre, tahun rilis
   • Untuk build/meta: sebut versi/patch terkini yang kamu tahu
   • Kalau soal tier list: sebut S/A/B/C dengan alasan singkat
   • Tips & trick: konkret, langsung praktis`,
    music: `\n🎵 *EXPERT MODE: Musik*
   • Lirik: tulis akurat, sertakan terjemahan jika lagu non-Indonesia
   • Chord: format \`\`\`Intro: G D Em C ...\`\`\` lalu lirik dengan chord di atasnya
   • Sebut artis, album, tahun rilis, genre`,
    food: `\n🍳 *EXPERT MODE: Kuliner & Resep*
   • Format resep: *Bahan* (dengan takaran) → *Cara Membuat* (langkah bernomor) → *Tips*
   • Sebut waktu masak, porsi, level kesulitan
   • Sebutkan substitusi bahan jika sulit dicari di Indonesia`,
    travel: `\n✈️ *EXPERT MODE: Travel*
   • Sebut: lokasi, akses, biaya estimasi, waktu terbaik berkunjung
   • Tips lokal: makanan khas, transportasi, etika lokal, hal yang harus dihindari`,
    language: `\n🌐 *EXPERT MODE: Bahasa & Terjemahan*
   • Terjemahkan natural, bukan literal — tangkap nuansa & konteks budaya
   • Untuk frasa idiom: sebut arti harfiah + arti maksud + padanan Indonesia
   • Kalau bahasa asing: sertakan romanisasi/cara baca`,
    nsfw: `\n🔞 *NSFW MODE: Konten Dewasa*
   • Jawab faktual, edukatif, tanpa sensor hipokrit / moralisasi berlebihan
   • Untuk istilah seksual/anatomi: jelaskan dengan benar dan informatif
   • Hindari vulgar tanpa konteks; tetap respect ke user
   • Kalau referensi karya 18+: sebut judul, genre, kategori dengan jelas`,
    debate: `\n⚖️ *DEBATE MODE: Opini & Diskusi*
   • Berikan minimal 2 sudut pandang berbeda dengan argumen logis
   • Sebut bukti/contoh konkret, bukan klaim kosong
   • Akhiri dengan refleksi atau pertanyaan terbuka, bukan kesimpulan dogmatis`,
    identify: `\n🔍 *IDENTIFY MODE: Identifikasi*
   • Sebut nama spesifik (bukan "kayaknya itu...") dengan tingkat keyakinan
   • Kalau yakin: sebut langsung. Kalau ragu: "Kemungkinan besar X, ciri-ciri yang cocok: ..."
   • Sertakan info pendukung: ciri khas, asal, fakta menarik`,
    summarize: `\n📝 *SUMMARIZE MODE*
   • Format: *Inti* (1 kalimat) → *Poin Kunci* (3-5 bullet) → *Kesimpulan* (1 kalimat \`> \` quote)
   • Pertahankan akurasi — jangan tambah info yang tidak ada di sumber
   • Pakai bahasa user, jangan ganti tone aslinya`,
    howto: `\n🛠️ *TUTORIAL MODE*
   • Format: *Tujuan* → *Yang Disiapkan* → *Langkah 1, 2, 3...* → *Verifikasi Hasil* → *Tips Tambahan*
   • Setiap langkah: 1 aksi konkret + ekspektasi hasil
   • Antisipasi error umum dan cara mengatasinya`,
    compare: `\n⚖️ *COMPARISON MODE*
   • Format paralel: untuk tiap kriteria, bandingkan A vs B side-by-side
   • Akhiri dengan rekomendasi: "Pilih *A* kalau ..., pilih *B* kalau ..."
   • Hindari bias — sebut kelebihan & kekurangan masing-masing`,
};

function detectTopics(text = '') {
    const lower = String(text).toLowerCase();
    const detected = [];
    for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
        if (kws.some(kw => lower.includes(kw))) detected.push(topic);
    }
    return detected.slice(0, 4);
}

function detectComplexity(text = '') {
    const len = text.length;
    const hasMultiQuestion = (text.match(/\?/g) || []).length > 1;
    const hasMultiSentence = (text.match(/[.!?]/g) || []).length >= 3;
    const hasComplexWord = /jelaskan|bandingkan|analisis|rangkum|tutorial|cara|kenapa|mengapa|gimana|bagaimana/i.test(text);
    if (len > 200 || hasMultiQuestion || (hasMultiSentence && hasComplexWord)) return 'kompleks';
    if (len > 60 || hasComplexWord) return 'sedang';
    return 'simpel';
}

function detectLanguage(text = '') {
    const lower = String(text).toLowerCase();
    const enWords = /\b(the|is|are|what|how|why|when|where|please|could|would|hello|hi|thanks)\b/g;
    const idWords = /\b(yang|dan|itu|ini|gimana|kenapa|tolong|bisa|mau|gak|nggak|aja|sih|dong|kak)\b/g;
    const enCount = (lower.match(enWords) || []).length;
    const idCount = (lower.match(idWords) || []).length;
    if (enCount > idCount && enCount > 1) return 'en';
    if (enCount > 0 && idCount > 0) return 'mix';
    return 'id';
}

function detectSentiment(text = '') {
    const lower = String(text).toLowerCase();
    if (/sedih|galau|kecewa|capek|lelah|stres|down|nangis|patah hati|hampa|kosong/.test(lower)) return 'sedih';
    if (/marah|kesal|emosi|sebel|jengkel|bangsat|anjing|fuck/.test(lower)) return 'marah';
    if (/seneng|senang|bahagia|happy|gembira|haha|wkwk|asik|mantap/.test(lower)) return 'senang';
    if (/takut|cemas|khawatir|panik|deg-degan|nervous/.test(lower)) return 'cemas';
    if (/bingung|gak ngerti|nggak paham|pusing|mumet/.test(lower)) return 'bingung';
    return 'netral';
}

export function buildDynamicAIBoost({
    userMessage = '',
    hasImage = false,
    hasSticker = false,
    isStickerOnly = false,
    hasVideo = false,
    isDocumentMode = false,
    history = [],
} = {}) {
    if (!userMessage && !hasImage && !hasSticker && !hasVideo && !isDocumentMode) return '';

    // Sticker tanpa teks user → JANGAN inject reasoning/bullet, cukup info history
    if (isStickerOnly) {
        return history.length
            ? `\n\n📌 KONTEKS: ${history.length} pesan sebelumnya tersedia — lanjutkan obrolan dari sana, jangan mulai ulang. Balas sticker dengan 1-3 kalimat natural SAJA.`
            : `\n\n📌 Percakapan baru. Balas sticker dengan 1-3 kalimat natural SAJA.`;
    }

    const topics = detectTopics(userMessage);
    const complexity = detectComplexity(userMessage);
    const language = detectLanguage(userMessage);
    const sentiment = detectSentiment(userMessage);

    const personaSnippets = topics.map(t => PERSONA_MODULES[t]).filter(Boolean).join('\n');

    const reasoning = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 AUTO-INJECTED REASONING FRAMEWORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sebelum menjawab, *PIKIR PELAN-PELAN* dengan urutan ini (di kepala saja, jangan ditulis):
   1. *Apa intent user sebenarnya?* → tanya/curhat/minta solusi/identifikasi/diskusi/perintah
   2. *Info apa yang dibutuhkan?* → faktual/opini/teknis/empati/kreatif
   3. *Apakah ada ambiguitas?* → kalau YA, tetap jawab dengan asumsi paling masuk akal + sebut asumsinya
   4. *Format apa yang paling cocok?* → singkat/bullet/blok kode/tabel/quote highlight
   5. *Apakah aku punya info cukup?* → kalau tidak yakin, sebut keterbatasan TANPA kabur dari pertanyaan

🔎 *SELF-VERIFICATION (sebelum kirim respons)*:
   ✓ Faktual? — Apakah klaim utamaku benar dan terverifikasi?
   ✓ Lengkap? — Apakah semua aspek pertanyaan dijawab?
   ✓ Format WhatsApp? — Bold/italic/backtick/quote dipakai dengan tepat?
   ✓ Tone cocok? — Sesuai konteks user (santai/serius/empati/teknis)?
   ✓ Tidak overthinking? — Tidak terlalu panjang untuk pertanyaan simpel?
   ✓ Tidak hallucinasi? — Tidak mengarang nama/angka/fakta yang tidak yakin?

🚫 *ANTI-HALLUCINATION GUARDRAIL*:
   • Kalau tidak tahu → bilang tidak tahu, jangan ngarang
   • Kalau ragu → tunjukkan ketidakpastian ("kemungkinan", "kalau tidak salah", "based on info terbatas")
   • Angka/tanggal/nama spesifik → kalau ragu, kasih range atau perkiraan, jangan asal sebut
   • JANGAN buat referensi ke sumber/link yang tidak benar-benar ada`;

    const ctx = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AUTO-DETECTED CONTEXT (analisis otomatis dari pesan user)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Topik utama   : ${topics.length ? topics.join(', ') : '(general/casual)'}
• Kompleksitas  : ${complexity} → ${complexity === 'simpel' ? 'jawab singkat 1-3 kalimat' : complexity === 'sedang' ? 'jawab 1 paragraf + bullet jika perlu' : 'jawab terstruktur per bagian dengan header & quote highlight'}
• Bahasa user   : ${language} → ${language === 'en' ? 'jawab dalam English natural' : language === 'mix' ? 'ikuti gaya code-mixing user' : 'jawab dalam Bahasa Indonesia santai'}
• Sentimen      : ${sentiment}${sentiment === 'sedih' || sentiment === 'cemas' ? ' → utamakan empati & validasi sebelum solusi' : sentiment === 'marah' ? ' → respons tenang, jangan defensif, jangan judge' : sentiment === 'bingung' ? ' → pelan-pelan jelaskan dengan analogi sederhana' : ''}
• Media         : ${hasImage ? 'gambar ' : ''}${hasSticker ? 'sticker ' : ''}${hasVideo ? 'video ' : ''}${isDocumentMode ? 'dokumen ' : ''}${(!hasImage && !hasSticker && !hasVideo && !isDocumentMode) ? 'teks saja' : ''}
• Riwayat chat  : ${history.length ? `${history.length} pesan sebelumnya — WAJIB lanjutkan konteks` : 'percakapan baru'}`;

    const expertSection = personaSnippets
        ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 AUTO-ACTIVATED EXPERT PERSONA (sesuai topik terdeteksi)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${personaSnippets}`
        : '';

    return ctx + expertSection + reasoning;
}

/**
 * ══════════════════════════════════════════════════════════
 *  buildWilyAICommandPrompt()
 *  Prompt utama Wily Bot AI — dipakai oleh:
 *    • Perintah .wily / .ai / .tanya
 *    • Auto AI (respon tanpa perintah) di grup & private
 * ══════════════════════════════════════════════════════════
 */
export function buildWilyAICommandPrompt({
    userName,
    currentTime,
    currentDate,
    timeOfDay,
    hasHistory = false,
    quotedBotText = '',
    chatContext = '',
    isPrivate = false,
    isOwner = false,
    hasImage = false,
    isImageReply = false,
    hasSticker = false,
    isStickerReply = false,
    userMessage = '',
    hasVideo = false,
    isDocumentMode = false,
    history = [],
    userMemory = null,
}) {
    const historyNote = hasHistory
        ? `\n⚡ KONTEKS AKTIF: Kamu sedang MELANJUTKAN percakapan dengan ${userName}.

📍 STRUKTUR PESAN YANG KAMU TERIMA (PENTING — BACA INI DULU):
  1. Pertama → instruksi/identitas kamu (yang sedang kamu baca sekarang)
  2. Lalu → riwayat percakapan LAMA (urut dari paling lama → paling baru)
  3. PALING BAWAH → blok "━━━ 💬 PESAN BARU DARI USER — JAWAB INI SEKARANG ━━━"
     ⬆️ INI SAJA yang harus kamu jawab. History cuma untuk konteks, JANGAN dijawab ulang.

⛔ ATURAN ANTI-NGAWUR:
  • JANGAN aduk-aduk topik dari pesan lama ke pesan baru kecuali user secara eksplisit nyambungin
  • JANGAN buat-buat fakta dari pesan lama yang sudah lewat ("tadi kan kita ngomong X" — kalau X tidak ada di history, JANGAN bilang gitu)
  • Jika user nanya hal baru yang tidak nyambung dengan history → langsung jawab pertanyaan barunya, abaikan history
  • Jika user pakai kata "itu/tadi/yang barusan/lanjutkan" → BARU rujuk history, dan rujuk yang PALING DEKAT dengan pesan baru

📑 FORMAT META HISTORY:
Setiap pesan history diawali baris meta dalam kurung siku [ ... ] berisi:
  • ⏰ <jam tanggal WIB>  → waktu pesan dikirim
  • ↩️ BALAS PESAN BOT: "<kutipan>"  → user lagi balas pesan bot itu
  • 📎 <jenis media>  → user kirim gambar/sticker/dll
  • 👤 <nama user>  → identitas pengirim
JANGAN echo/ulang baris meta ini di balasanmu. Pakai HANYA untuk pahami konteks waktu & topik.` 
        : '';

    let quotedNote = '';
    if (quotedBotText && isStickerReply) {
        quotedNote = `\n\n🎭 SITUASI SAAT INI — STICKER REPLY:\nUser membalas pesan kamu berikut ini:\n"${quotedBotText.substring(0, 1000)}"\n...dan user mengirim sebuah STICKER sebagai reaksinya.\n→ TUGAS UTAMAMU:\n  1. Baca ekspresi/emosi sticker dengan teliti: wajah, mata, mulut, pose tubuh, gestur, simbol, teks, dan suasana visual\n  2. Tafsirkan maksud reaksinya terhadap pesan kamu: setuju, bingung, kaget, sedih, malu, bercanda, mengejek halus, marah, senang, sarkas, atau emosi lain yang paling mungkin\n  3. Hubungkan tafsir sticker dengan pesan kamu yang di-reply agar jawaban terasa nyambung\n  4. Balas seperti manusia yang peka konteks: singkat, natural, santai, dan akurat\n  5. Jangan cuma mendeskripsikan sticker; tanggapi emosinya. Contoh: kalau sticker terlihat kaget → jawab seolah user terkejut; kalau malu → goda halus; kalau sedih → empati; kalau ngakak → ikut bercanda\n  6. Kalau ekspresi tidak jelas, sebut kemungkinan terbaik dengan bahasa yakin tapi tidak mengada-ada`;
    } else if (quotedBotText && isImageReply) {
        quotedNote = `\n\n🖼️ SITUASI SAAT INI — IMAGE REPLY:\nUser membalas pesan kamu berikut ini:\n"${quotedBotText.substring(0, 1000)}"\n...dan user juga mengirim sebuah GAMBAR bersamaan.\n→ TUGASMU:\n  1. Analisis gambar yang dikirim user secara detail\n  2. Pahami apa yang user tanyakan/inginkan dari gambar tersebut\n  3. Hubungkan dengan konteks pesan kamu sebelumnya jika relevan\n  4. Jawab dengan tepat, spesifik, dan berguna`;
    } else if (quotedBotText) {
        quotedNote = `\n\n💬 REPLY CONTEXT: User membalas pesan kamu ini:\n"${quotedBotText.substring(0, 1000)}"\n→ WAJIB jawab langsung mengacu pada isi pesan di atas. Lanjutkan pembahasan yang sama, jangan abaikan konteks ini.`;
    }

    const imageNote = (hasImage && !isImageReply && !hasSticker)
        ? `\n\n🖼️ GAMBAR AKTIF: User mengirim gambar. Analisis SELURUH konten visual gambar tersebut — identifikasi objek, teks, orang, tempat, atau apapun yang ada. Berikan informasi yang akurat dan lengkap.`
        : '';

    const stickerNote = (hasSticker && !isStickerReply)
        ? `\n\n🎭 STICKER AKTIF: User mengirim sticker dalam percakapan ini. Tangkap emosi/vibe sticker dan balas seperti orang ngobrol — natural, singkat, nyambung dengan context history. WAJIB: maksimal 3 kalimat. DILARANG KERAS: heading (🎨/📝/dll), bullet point, breakdown formal, sub-judul, atau analisis panjang. Baca sticker → rasakan emosinya → balas santai.`
        : '';

    const chatCtxNote = chatContext ? `\n${chatContext}` : '';

    const chatTypeNote = isPrivate
        ? `\n📱 MODE: Percakapan PRIVATE (1-on-1). Jadilah lebih personal, hangat, dan responsif.`
        : `\n👥 MODE: Percakapan GRUP. Sebut nama user jika diperlukan. Jawab sesuai konteks grup.`;

    const ownerNote = isOwner
        ? `\n👑 USER INI ADALAH OWNER BOT. Berikan respons teknis detail jika diminta. Boleh akses info internal bot jika relevan.`
        : '';

    const template = loadPromptTemplate();

    return template
        .replace(/\{\{USER_NAME\}\}/g, userName)
        .replace(/\{\{CURRENT_TIME\}\}/g, currentTime)
        .replace(/\{\{CURRENT_DATE\}\}/g, currentDate)
        .replace(/\{\{TIME_OF_DAY\}\}/g, timeOfDay)
        .replace('{{CHAT_TYPE_NOTE}}', chatTypeNote)
        .replace('{{OWNER_NOTE}}', ownerNote)
        .replace('{{HISTORY_NOTE}}', historyNote)
        .replace('{{QUOTED_NOTE}}', quotedNote)
        .replace('{{IMAGE_NOTE}}', imageNote)
        .replace('{{STICKER_NOTE}}', stickerNote)
        .replace('{{CHAT_CTX_NOTE}}', chatCtxNote)
        .replace('{{OWNER_INFO_DETAIL}}', isOwner ? 'jawab detail teknis karena ini owner' : 'jelaskan info umum bot dengan singkat')
        .replace('{{REACT_PROMPT_RULES}}', buildReactPromptRules())
        .replace('{{PERSONALITY_BOOST}}', buildPersonalityBoost(userName))
        .replace('{{USER_MEMORY}}', userMemory ? formatMemoryForPrompt(userMemory, userName) : '')
        .replace('{{DYNAMIC_AI_BOOST}}', buildDynamicAIBoost({ userMessage, hasImage, hasSticker, isStickerOnly: hasSticker && !hasImage, hasVideo, isDocumentMode, history }));
}
