'use strict';

import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const OLD_KV_DIR = path.join(DATA_DIR, 'kv');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function kvPath(key) {
    const parts = String(key).split('/').map(p => p.replace(/[^a-zA-Z0-9_-]/g, '_'));
    const filename = parts.pop() + '.json';
    const dir = parts.length > 0 ? path.join(DATA_DIR, ...parts) : DATA_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, filename);
}

function kvPathOld(key) {
    return path.join(OLD_KV_DIR, String(key).replace(/[^a-zA-Z0-9_-]/g, '_') + '.json');
}

export function kvGet(key, fallback = null) {
    try {
        const p = kvPath(key);
        if (!fs.existsSync(p)) return fallback;
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch { return fallback; }
}

export function kvSet(key, value) {
    try {
        fs.writeFileSync(kvPath(key), JSON.stringify(value, null, 2), 'utf-8');
    } catch {}
}

export function kvMigrateFromJSON(key, jsonPath, transform = null) {
    try {
        const p = kvPath(key);
        if (fs.existsSync(p)) return;
        if (!fs.existsSync(jsonPath)) return;
        const raw  = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const data = transform ? transform(raw) : raw;
        kvSet(key, data);
        console.log(`\x1b[32m[DataDB]\x1b[39m Migrasi ${path.basename(jsonPath)} → data/${key}.json`);
    } catch {}
}

export function kvMigrateKey(oldKey, newKey) {
    try {
        const newPath = kvPath(newKey);
        if (fs.existsSync(newPath)) return;
        const oldPath = kvPathOld(oldKey);
        if (!fs.existsSync(oldPath)) return;
        const data = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));
        kvSet(newKey, data);
        fs.unlinkSync(oldPath);
        console.log(`\x1b[32m[DataDB]\x1b[39m Pindah: kv/${oldKey}.json → data/${newKey}.json`);
    } catch {}
}

function migrateFromKvDir() {
    try {
        if (!fs.existsSync(OLD_KV_DIR)) return;
        const walk = (dir, base) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const fullPath = path.join(dir, entry.name);
                const relKey   = base ? `${base}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    walk(fullPath, relKey);
                } else if (entry.name.endsWith('.json')) {
                    const key     = (base ? `${base}/` : '') + entry.name.replace(/\.json$/, '');
                    const newPath = kvPath(key);
                    if (!fs.existsSync(newPath)) {
                        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                        kvSet(key, data);
                        console.log(`\x1b[32m[DataDB]\x1b[39m Pindah: kv/${key}.json → data/${key}.json`);
                    }
                    fs.unlinkSync(fullPath);
                }
            }
            try { fs.rmdirSync(dir); } catch {}
        };
        walk(OLD_KV_DIR, '');
    } catch {}
}

migrateFromKvDir();
