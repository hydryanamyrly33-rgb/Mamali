/**
 * Mamali Orbit 3.7.0 — single-session lock (one Google email = one live device).
 *
 * Persistence:
 *  1) Vercel KV / Upstash REST if KV_REST_API_URL + KV_REST_API_TOKEN exist
 *  2) /tmp JSON on the current instance (survives warm invocations)
 *  3) in-memory Map
 *
 * A live lock lasts until explicit release (قفل و خروج / حذف حساب)
 * or 14 days of silence — not a 15-minute heartbeat timeout.
 *
 * Contract (POST JSON):
 *  { action: 'claim'|'heartbeat'|'release'|'status', email, subject, deviceId, deviceLabel }
 *
 * GET /api/session → live health for the Google/session test panel
 */
import { readFileSync, writeFileSync } from 'node:fs';

const APP_VERSION = '3.7.0';
const LOCK_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TMP_PATH = '/tmp/mamali-session-locks.json';
const ALLOWED_ORIGINS = [
  'https://mamali-orbit.vercel.app',
  'https://hydryanamyrly33-rgb.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const memory = globalThis.__mamaliSessionLocks || new Map();
globalThis.__mamaliSessionLocks = memory;

function hydrateFromTmp() {
  try {
    const parsed = JSON.parse(readFileSync(TMP_PATH, 'utf8'));
    for (const [email, record] of Object.entries(parsed || {})) {
      if (!memory.has(email)) memory.set(email, record);
    }
  } catch {}
}

function persistToTmp() {
  try {
    writeFileSync(TMP_PATH, JSON.stringify(Object.fromEntries(memory)));
  } catch {}
}

hydrateFromTmp();

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
}

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app');
  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function now() {
  return Date.now();
}

function isFresh(record) {
  return Boolean(record && Number.isFinite(record.lastSeen) && now() - record.lastSeen < LOCK_TTL_MS);
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function storeName() {
  return kvConfigured() ? 'kv' : 'memory+tmp';
}

async function kvCommand(command) {
  const response = await fetch(`${process.env.KV_REST_API_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`kv ${response.status}`);
  return response.json();
}

async function readLock(email) {
  hydrateFromTmp();
  if (kvConfigured()) {
    try {
      const result = await kvCommand(['GET', `mamali:lock:${email}`]);
      if (result?.result) return JSON.parse(result.result);
    } catch {}
  }
  return memory.get(email) || null;
}

async function writeLock(email, record) {
  memory.set(email, record);
  persistToTmp();
  if (kvConfigured()) {
    try {
      await kvCommand(['SET', `mamali:lock:${email}`, JSON.stringify(record), 'PX', String(LOCK_TTL_MS)]);
    } catch {}
  }
}

async function deleteLock(email) {
  memory.delete(email);
  persistToTmp();
  if (kvConfigured()) {
    try { await kvCommand(['DEL', `mamali:lock:${email}`]); } catch {}
  }
}

function publicRecord(record) {
  if (!record) return null;
  return {
    deviceId: record.deviceId,
    deviceLabel: record.deviceLabel || '',
    claimedAt: record.claimedAt,
    lastSeen: record.lastSeen,
    expiresAt: record.lastSeen + LOCK_TTL_MS,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 20000) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    json(res, 200, {
      ok: true,
      service: 'mamali-session-lock',
      version: APP_VERSION,
      store: storeName(),
      ttlMs: LOCK_TTL_MS,
      time: now(),
    });
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }

  let payload;
  try { payload = await readBody(req); }
  catch {
    json(res, 400, { ok: false, error: 'invalid_json' });
    return;
  }

  const action = String(payload.action || '').toLowerCase();
  const email = normalizeEmail(payload.email);
  const subject = String(payload.subject || '').slice(0, 128);
  const deviceId = String(payload.deviceId || '').slice(0, 80);
  const deviceLabel = String(payload.deviceLabel || '').slice(0, 160);

  if (!['claim', 'heartbeat', 'release', 'status'].includes(action)) {
    json(res, 400, { ok: false, error: 'unknown_action' });
    return;
  }
  if (!email || !email.includes('@') || !deviceId) {
    json(res, 400, { ok: false, error: 'missing_identity' });
    return;
  }

  const existing = await readLock(email);
  const fresh = isFresh(existing);

  if (action === 'status') {
    json(res, 200, {
      ok: true,
      locked: fresh,
      sameDevice: Boolean(fresh && existing.deviceId === deviceId),
      holder: fresh ? publicRecord(existing) : null,
      store: storeName(),
    });
    return;
  }

  if (action === 'release') {
    if (!existing || existing.deviceId === deviceId) await deleteLock(email);
    json(res, 200, { ok: true, released: true });
    return;
  }

  if (action === 'heartbeat') {
    // Keep the same trusted browser alive. Recreate an expired lock instead of
    // kicking the user out mid-session. Claim remains the only hard conflict.
    if (!fresh) {
      const revived = {
        email,
        subject: subject || existing?.subject || '',
        deviceId,
        deviceLabel: deviceLabel || existing?.deviceLabel || '',
        claimedAt: existing?.claimedAt || now(),
        lastSeen: now(),
        sessionId: existing?.sessionId || `${now().toString(36)}-${deviceId.slice(0, 8)}`,
      };
      await writeLock(email, revived);
      json(res, 200, { ok: true, revived: true, holder: publicRecord(revived), store: storeName() });
      return;
    }
    if (existing.deviceId !== deviceId) {
      json(res, 409, { ok: false, error: 'held_by_other_device', holder: publicRecord(existing) });
      return;
    }
    const next = { ...existing, lastSeen: now(), deviceLabel: deviceLabel || existing.deviceLabel };
    await writeLock(email, next);
    json(res, 200, { ok: true, holder: publicRecord(next), store: storeName() });
    return;
  }

  if (fresh && existing.deviceId !== deviceId) {
    json(res, 409, {
      ok: false,
      error: 'held_by_other_device',
      holder: publicRecord(existing),
    });
    return;
  }

  const record = {
    email,
    subject: subject || existing?.subject || '',
    deviceId,
    deviceLabel,
    claimedAt: fresh && existing.deviceId === deviceId ? existing.claimedAt : now(),
    lastSeen: now(),
    sessionId: fresh && existing.deviceId === deviceId ? existing.sessionId : `${now().toString(36)}-${deviceId.slice(0, 8)}`,
  };
  await writeLock(email, record);
  json(res, 200, { ok: true, claimed: true, holder: publicRecord(record), store: storeName() });
}
