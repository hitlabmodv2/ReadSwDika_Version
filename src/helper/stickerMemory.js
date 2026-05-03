'use strict';

/**
 * stickerMemory.js
 * Simpan dan ambil analisis stiker dari data.db
 * — Bot makin cerdas setiap kali lihat stiker baru
 */

import { createHash } from 'crypto';
import db from '../db/datadb.js';

// ── Pastikan tabel ada ──
db.exec(`
    CREATE TABLE IF NOT EXISTS sticker_memory (
        hash        TEXT PRIMARY KEY,
        emotion     TEXT NOT NULL DEFAULT '',
        category    TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        tags        TEXT NOT NULL DEFAULT '[]',
        seen_count  INTEGER NOT NULL DEFAULT 1,
        last_seen   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sticker_last_seen ON sticker_memory (last_seen DESC);
`);

const stmtGet = db.prepare('SELECT * FROM sticker_memory WHERE hash = ?');

const stmtUpsert = db.prepare(`
    INSERT INTO sticker_memory (hash, emotion, category, description, tags, seen_count, last_seen)
    VALUES (?, ?, ?, ?, ?, 1, strftime('%s','now'))
    ON CONFLICT(hash) DO UPDATE SET
        seen_count  = sticker_memory.seen_count + 1,
        last_seen   = strftime('%s','now'),
        emotion     = CASE WHEN excluded.emotion != '' THEN excluded.emotion ELSE sticker_memory.emotion END,
        category    = CASE WHEN excluded.category != '' THEN excluded.category ELSE sticker_memory.category END,
        description = CASE WHEN excluded.description != '' THEN excluded.description ELSE sticker_memory.description END,
        tags        = CASE WHEN excluded.tags != '[]' THEN excluded.tags ELSE sticker_memory.tags END
`);

const stmtInc = db.prepare(`
    UPDATE sticker_memory SET seen_count = seen_count + 1, last_seen = strftime('%s','now') WHERE hash = ?
`);

const stmtCount = db.prepare('SELECT COUNT(*) as c FROM sticker_memory');
const stmtRecent = db.prepare('SELECT hash, emotion, category, description, seen_count FROM sticker_memory ORDER BY last_seen DESC LIMIT ?');

/**
 * Hash buffer stiker → hex sha256 (64 karakter)
 */
export function hashSticker(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Cari stiker di DB berdasarkan hash
 * @returns {object|null} row atau null jika belum dikenal
 */
export function lookupSticker(hash) {
    const row = stmtGet.get(hash);
    if (!row) return null;
    try { row.tags = JSON.parse(row.tags); } catch { row.tags = []; }
    return row;
}

/**
 * Simpan/update analisis stiker ke DB
 */
export function saveSticker(hash, { emotion = '', category = '', description = '', tags = [] } = {}) {
    stmtUpsert.run(
        hash,
        emotion.substring(0, 100),
        category.substring(0, 100),
        description.substring(0, 300),
        JSON.stringify(Array.isArray(tags) ? tags.slice(0, 8) : [])
    );
}

/**
 * Hanya naikkan counter seen tanpa ubah analisis
 */
export function incrementStickerSeen(hash) {
    stmtInc.run(hash);
}

/**
 * Statistik memori stiker
 */
export function getStickerMemoryStats() {
    const row = stmtCount.get();
    return row?.c || 0;
}

/**
 * Ambil stiker yang baru-baru ini dilihat
 */
export function getRecentStickers(limit = 10) {
    return stmtRecent.all(limit);
}

/**
 * Build hint teks untuk diinjeksikan ke prompt AI
 * agar AI tahu kalau stiker ini pernah dilihat sebelumnya
 */
export function buildStickerContextHint(known) {
    if (!known) return '';
    const parts = [];
    if (known.emotion) parts.push(`Emosi: ${known.emotion}`);
    if (known.category) parts.push(`Kategori: ${known.category}`);
    if (known.description) parts.push(`Deskripsi: ${known.description}`);
    if (Array.isArray(known.tags) && known.tags.length) parts.push(`Tag: ${known.tags.join(', ')}`);
    if (known.seen_count > 1) parts.push(`Sudah dilihat bot ${known.seen_count}x`);
    if (!parts.length) return '';
    return `[Memori Stiker — Bot pernah menganalisis stiker ini sebelumnya]\n${parts.join('\n')}`;
}
