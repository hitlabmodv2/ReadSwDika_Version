'use strict';

/**
 * ─────────────────────────────────────────────────────────
 *  aiStickerStory.js
 *  Recode By : Bang Wilykun
 *
 *  Simpan sejarah + pola stiker yang dikirim AI ke data.db
 *  Tabel : ai_sticker_story   → log per pengiriman
 *          ai_sticker_pattern → agregat per URL stiker
 *
 *  Dipakai oleh:
 *    • aiTools.js  → logStickerSent() setelah stiker berhasil kirim
 *    • aiPrompt.js → buildStickerStoryHint() untuk konteks AI
 * ─────────────────────────────────────────────────────────
 */

import db from '../db/datadb.js';

// ── Prepared statements ────────────────────────────────────

const stmtInsertStory = db.prepare(`
    INSERT INTO ai_sticker_story (session_key, sticker_url, mood, context, was_fallback, sent_at)
    VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
`);

const stmtUpsertPattern = db.prepare(`
    INSERT INTO ai_sticker_pattern (sticker_url, total_sent, moods_json, last_sent)
    VALUES (?, 1, ?, strftime('%s','now'))
    ON CONFLICT(sticker_url) DO UPDATE SET
        total_sent = ai_sticker_pattern.total_sent + 1,
        moods_json = excluded.moods_json,
        last_sent  = strftime('%s','now')
`);

const stmtGetPattern  = db.prepare('SELECT * FROM ai_sticker_pattern WHERE sticker_url = ?');
const stmtTopPatterns = db.prepare('SELECT sticker_url, total_sent, moods_json FROM ai_sticker_pattern ORDER BY total_sent DESC LIMIT ?');
const stmtMoodPattern = db.prepare(`
    SELECT sticker_url, total_sent FROM ai_sticker_pattern
    WHERE moods_json LIKE ?
    ORDER BY total_sent DESC LIMIT ?
`);

const stmtSessionHistory = db.prepare(`
    SELECT sticker_url, mood, context, was_fallback, sent_at
    FROM ai_sticker_story
    WHERE session_key = ?
    ORDER BY sent_at DESC LIMIT ?
`);

const stmtCountStory   = db.prepare('SELECT COUNT(*) as c FROM ai_sticker_story');
const stmtCountPattern = db.prepare('SELECT COUNT(*) as c FROM ai_sticker_pattern');
const stmtTotalSent    = db.prepare('SELECT SUM(total_sent) as t FROM ai_sticker_pattern');

// ── Helpers ───────────────────────────────────────────────

function urlLabel(url = '') {
    const m = url.match(/([^/]+)-HONOLULU\.webp$/) || url.match(/([^/]+)-FIORA\.webp$/);
    return m ? m[0].substring(0, 40) : url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 40);
}

function getCharacter(url = '') {
    if (url.includes('-HONOLULU.webp')) return 'honolulu';
    if (url.includes('-FIORA.webp'))    return 'fiora';
    return 'unknown';
}

// ── Public API ────────────────────────────────────────────

/**
 * Catat pengiriman stiker ke db — dipanggil setelah stiker berhasil kirim.
 *
 * @param {object} p
 * @param {string} p.sessionKey   - ID sesi percakapan (nomor WA / group JID)
 * @param {string} p.stickerUrl   - URL stiker CDN yang dikirim
 * @param {string} [p.mood]       - Mood yang terdeteksi
 * @param {string} [p.context]    - Cuplikan teks percakapan (max 200 karakter)
 * @param {boolean} [p.wasFallback] - true jika dipilih oleh mood selector (bukan AI sendiri)
 */
export function logStickerSent({ sessionKey = '', stickerUrl = '', mood = '', context = '', wasFallback = false } = {}) {
    try {
        const ctx = String(context || '').replace(/\s+/g, ' ').trim().substring(0, 200);

        // 1. Log ke ai_sticker_story
        stmtInsertStory.run(
            String(sessionKey).substring(0, 100),
            stickerUrl,
            String(mood).substring(0, 60),
            ctx,
            wasFallback ? 1 : 0,
        );

        // 2. Update ai_sticker_pattern — update moods_json setelah baca existing
        const existing = stmtGetPattern.get(stickerUrl);
        let moodsMap = {};
        if (existing) {
            try { moodsMap = JSON.parse(existing.moods_json); } catch {}
        }
        if (mood) moodsMap[mood] = (moodsMap[mood] || 0) + 1;
        stmtUpsertPattern.run(stickerUrl, JSON.stringify(moodsMap));
    } catch (e) {
        console.error('[StickerStory] logStickerSent error:', e.message);
    }
}

/**
 * Ambil stiker terpopuler untuk mood tertentu berdasarkan data historis.
 * Bisa dipakai sebagai alternatif/penyeimbang selectStickerByMood() dari stickerMap.js
 *
 * @param {string} mood
 * @param {number} limit
 * @returns {Array<{url:string, count:number}>}
 */
export function getTopStickersForMood(mood, limit = 3) {
    try {
        const rows = stmtMoodPattern.all(`%"${mood}"%`, limit);
        return rows.map(r => ({ url: r.sticker_url, count: r.total_sent }));
    } catch {
        return [];
    }
}

/**
 * Ambil pola keseluruhan — stiker apa yang paling sering dikirim.
 * @param {number} limit
 * @returns {Array}
 */
export function getTopPatterns(limit = 10) {
    try {
        return stmtTopPatterns.all(limit).map(r => ({
            url:      r.sticker_url,
            label:    urlLabel(r.sticker_url),
            char:     getCharacter(r.sticker_url),
            total:    r.total_sent,
            moods:    (() => { try { return JSON.parse(r.moods_json); } catch { return {}; } })(),
        }));
    } catch {
        return [];
    }
}

/**
 * Ambil riwayat stiker untuk 1 sesi (user/group tertentu).
 * @param {string} sessionKey
 * @param {number} limit
 * @returns {Array}
 */
export function getSessionStickerHistory(sessionKey, limit = 10) {
    try {
        return stmtSessionHistory.all(String(sessionKey), limit);
    } catch {
        return [];
    }
}

/**
 * Statistik ringkas untuk logging/debug.
 */
export function getStickerStoryStats() {
    try {
        const story   = stmtCountStory.get().c   || 0;
        const pattern = stmtCountPattern.get().c  || 0;
        const total   = stmtTotalSent.get().t     || 0;
        return { totalLogs: story, uniqueStickers: pattern, totalSent: total };
    } catch {
        return { totalLogs: 0, uniqueStickers: 0, totalSent: 0 };
    }
}

/**
 * Generate hint singkat tentang pola stiker — untuk dimasukkan ke prompt AI.
 * Memberi tahu AI stiker mana yang paling sering dipakai & untuk mood apa,
 * dan stiker apa yang baru saja dikirim ke user ini (agar tidak repetitif).
 *
 * @param {string} sessionKey
 * @returns {string}
 */
export function buildStickerStoryHint(sessionKey = '') {
    try {
        const lines = [];

        // Riwayat 3 stiker terakhir ke user ini
        const recent = getSessionStickerHistory(sessionKey, 3);
        if (recent.length > 0) {
            lines.push('📖 Stiker yang baru-baru ini aku kirim ke user ini:');
            for (const r of recent) {
                const fb  = r.was_fallback ? ' *(fallback)*' : '';
                const ctx = r.context ? ` — konteks: "${r.context.substring(0, 60)}"` : '';
                lines.push(`  • [${r.mood || 'unknown'}] ${urlLabel(r.sticker_url)}${fb}${ctx}`);
            }
            lines.push('  → Hindari kirim stiker yang sama terlalu sering, variasikan.');
        }

        // Top 5 stiker global yang paling sering aku pakai
        const top = getTopPatterns(5);
        if (top.length > 0) {
            lines.push('');
            lines.push('📊 Stiker yang paling sering aku pakai (global):');
            for (const t of top) {
                const moods = Object.keys(t.moods).slice(0, 3).join(', ');
                lines.push(`  • ${t.label} (${t.total}× — mood: ${moods || '-'})`);
            }
            lines.push('  → Boleh dipakai lagi jika mood cocok, tapi jangan terlalu monoton.');
        }

        return lines.length > 0 ? lines.join('\n') : '';
    } catch {
        return '';
    }
}
