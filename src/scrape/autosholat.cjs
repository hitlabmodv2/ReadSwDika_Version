/**
 * ───────────────────────────────
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  FITUR   : Auto Notifikasi Sholat
 *  Fungsi  : Kirim jadwal sholat + gambar masjid +
 *            suara adzan ke grup yang terdaftar,
 *            tepat saat waktu sholat tiba (±0 menit).
 *  Sumber  : api.aladhan.com (gratis, tanpa key)
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const FILE_CONFIG = path.join(process.cwd(), 'config.json');

// ─── GAMBAR MASJID PER WAKTU SHOLAT ──────────────────────────────────────────
// File lokal di img/sholat/ — ringan, pasti tampil, tidak bergantung URL eksternal
const IMG_DIR = path.join(process.cwd(), 'img', 'sholat');
const GAMBAR_SHOLAT = {
    Subuh   : path.join(IMG_DIR, 'subuh.jpg'),   // langit fajar masjid
    Zuhur   : path.join(IMG_DIR, 'zuhur.jpg'),   // masjid siang terang
    Ashar   : path.join(IMG_DIR, 'ashar.jpg'),   // golden hour sore
    Maghrib : path.join(IMG_DIR, 'maghrib.jpg'), // sunset langit jingga
    Isya    : path.join(IMG_DIR, 'isya.jpg'),    // masjid malam bercahaya
};

// ─── AUDIO ADZAN ──────────────────────────────────────────────────────────────
// Subuh punya adzan khusus (ada hayya 'alal falah + assholatukhoirum minannaum)
const AUDIO_ADZAN = {
    Subuh   : 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    Zuhur   : 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    Ashar   : 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    Maghrib : 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    Isya    : 'https://www.islamcan.com/audio/adhan/azan1.mp3',
};

// ─── EMOJI WAKTU SHOLAT ───────────────────────────────────────────────────────
const EMOJI_SHOLAT = {
    Subuh   : '🌙',
    Zuhur   : '☀️',
    Ashar   : '🌤️',
    Maghrib : '🌅',
    Isya    : '🌙',
};

// ─── UCAPAN SELAMAT SHOLAT PER WAKTU ─────────────────────────────────────────
const UCAPAN_SHOLAT = {
    Subuh   : 'Bangun & segera sholat Subuh sebelum matahari terbit 🌄',
    Zuhur   : 'Istirahatlah sejenak, jangan lupa sholat Zuhur 🕌',
    Ashar   : 'Jangan tunda, segera tunaikan sholat Ashar 🤲',
    Maghrib : 'Matahari sudah terbenam, waktunya sholat Maghrib 🌇',
    Isya    : 'Tutup hari dengan sholat Isya, semoga berkah 🌙',
};

// ─── CACHE JADWAL HARIAN ──────────────────────────────────────────────────────
let _cacheJadwal  = null;
let _cacheTanggal = '';

// ─── CONFIG HELPER ────────────────────────────────────────────────────────────
function bacaConfig() {
    try {
        if (fs.existsSync(FILE_CONFIG)) {
            return JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf-8'));
        }
    } catch (_) {}
    return {};
}

function simpanConfig(cfg) {
    try {
        fs.writeFileSync(FILE_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (_) {}
}

// ─── GRUP MANAGEMENT ──────────────────────────────────────────────────────────
function addGroup(jid) {
    const cfg = bacaConfig();
    if (!cfg.autoSholat)                    cfg.autoSholat         = { groups: [] };
    if (!Array.isArray(cfg.autoSholat.groups)) cfg.autoSholat.groups = [];
    if (cfg.autoSholat.groups.includes(jid)) return false; // sudah terdaftar
    cfg.autoSholat.groups.push(jid);
    simpanConfig(cfg);
    return true;
}

function removeGroup(jid) {
    const cfg = bacaConfig();
    if (!Array.isArray(cfg.autoSholat?.groups)) return false;
    const before = cfg.autoSholat.groups.length;
    cfg.autoSholat.groups = cfg.autoSholat.groups.filter(g => g !== jid);
    if (cfg.autoSholat.groups.length < before) {
        simpanConfig(cfg);
        return true;
    }
    return false;
}

function isGroupEnabled(jid) {
    const cfg = bacaConfig();
    return Array.isArray(cfg.autoSholat?.groups) && cfg.autoSholat.groups.includes(jid);
}

function getEnabledGroups() {
    const cfg = bacaConfig();
    return Array.isArray(cfg.autoSholat?.groups) ? cfg.autoSholat.groups : [];
}

// ─── AMBIL JADWAL SHOLAT DARI API ─────────────────────────────────────────────
// Sumber: api.myquran.com — ID kota Jakarta = 1301
async function getJadwalHariIni() {
    const now     = new Date();
    const tanggal = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

    if (_cacheJadwal && _cacheTanggal === tanggal) {
        return _cacheJadwal;
    }

    // Format tanggal YYYY-MM-DD untuk URL
    const tglFmt = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // 2026-05-23
    const res = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/1301/${tglFmt}`, {
        timeout: 12000,
    });

    const j = res.data.data.jadwal;
    const jadwal = {
        Subuh   : j.subuh,
        Zuhur   : j.dzuhur,
        Ashar   : j.ashar,
        Maghrib : j.maghrib,
        Isya    : j.isya,
    };

    _cacheJadwal  = jadwal;
    _cacheTanggal = tanggal;
    return jadwal;
}

// ─── CEK APAKAH SEKARANG WAKTU SHOLAT ────────────────────────────────────────
// Kembalikan { nama, waktu } jika jam:menit sekarang (WIB) cocok tepat
async function cekWaktuSholat() {
    const jadwal  = await getJadwalHariIni();
    const nowStr  = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const jamMenit = nowStr.slice(0, 5); // "HH:MM"

    for (const [nama, waktu] of Object.entries(jadwal)) {
        if (waktu === jamMenit) return { nama, waktu };
    }
    return null;
}

// ─── BUAT CAPTION NOTIFIKASI ──────────────────────────────────────────────────
// Format ramah mobile — tiap baris ≤ 32 karakter agar tidak kepotong
function buatCaption(nama, waktu, jadwal) {
    const emoji  = EMOJI_SHOLAT[nama]  || '🕌';
    const ucapan = UCAPAN_SHOLAT[nama] || 'Segera tunaikan sholat 🤲';

    const hari = new Date().toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta', weekday: 'long',
    });
    const tgl = new Date().toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric',
    });

    const baris = Object.entries(jadwal).map(([n, w]) => {
        const aktif = n === nama;
        const dot   = aktif ? '▶' : '·';
        const label = aktif ? `*${n}*` : n;
        return `${dot} ${label.padEnd(7)} ${w} WIB`;
    }).join('\n');

    return (
        `${emoji} *Sholat ${nama}* ${emoji}\n` +
        `📅 ${hari}, ${tgl}\n` +
        `⏰ *${waktu} WIB*\n` +
        `─────────────────\n` +
        `🕌 *Jadwal Jakarta*\n` +
        `${baris}\n` +
        `─────────────────\n` +
        `_${ucapan}_\n` +
        `_Allahu Akbar..._ 🤲`
    );
}

// ─── FUNGSI BANTU THUMBNAIL & AUDIO ──────────────────────────────────────────
// Return Buffer dari file lokal — pasti tampil, tidak bergantung internet
function getGambar(nama) {
    const filePath = GAMBAR_SHOLAT[nama] || GAMBAR_SHOLAT['Zuhur'];
    return fs.readFileSync(filePath);
}

function getAudio(nama) {
    return AUDIO_ADZAN[nama] || AUDIO_ADZAN['Zuhur'];
}

// ─── SIMULASI / TES KIRIM ────────────────────────────────────────────────────
// Simulasi test: kembalikan data notif waktu sholat terdekat
async function simulasi(namaWaktu) {
    const jadwal = await getJadwalHariIni();
    const nama   = namaWaktu
        ? Object.keys(jadwal).find(k => k.toLowerCase() === namaWaktu.toLowerCase()) || 'Zuhur'
        : 'Zuhur';
    const waktu  = jadwal[nama];
    return {
        nama,
        waktu,
        caption  : buatCaption(nama, waktu, jadwal),
        urlGambar: getGambar(nama),
        urlAudio : getAudio(nama),
        jadwal,
    };
}

module.exports = {
    addGroup,
    removeGroup,
    isGroupEnabled,
    getEnabledGroups,
    getJadwalHariIni,
    cekWaktuSholat,
    buatCaption,
    getGambar,
    getAudio,
    simulasi,
};
