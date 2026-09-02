import { timingSafeEqual } from 'node:crypto';

// === MODULE_BUILD ===
// id: interdependency_handoff_store
//   purpose: Hold short-lived human-to-agent handoffs in process memory for session-scoped remote MCP delivery.
//   entrypoint: imported by server/mcp-server.mjs
//   tests: tests/mcp-server.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_handoff_store_boundary
//   storage: volatile process memory only; no disk, database, analytics, or cross-restart persistence
//   user_data: bounded human request text plus selected public skill/provenance payload
//   operational_effects: create, replace, read, expire, and delete one opaque-session handoff record
//   authority: possession of the separate write key permits only handoff publication/deletion, never repository mutation
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: handoff_store_is_bounded_and_ephemeral
//   given: human handoffs are published
//   then: records expire after a bounded TTL, total live records are capped, and expired/oldest records are pruned
//   class: privacy
//
// id: handoff_read_token_cannot_write
//   given: a remote MCP client knows only the session id embedded in its MCP URL
//   then: it can read a ready handoff through MCP but cannot replace or delete it without the distinct write key
//   class: security
// === END CONTRACTS ===

export const DEFAULT_HANDOFF_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_HANDOFF_MAX_ENTRIES = 256;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export function validHandoffToken(value) {
  return TOKEN_PATTERN.test(String(value || ''));
}

function sameSecret(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateHandoff(handoff) {
  if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) {
    throw new Error('handoff must be an object');
  }
  if (handoff.ready !== true) throw new Error('handoff.ready must be true');
  if (!handoff.skill || typeof handoff.skill.name !== 'string' || !handoff.skill.name.trim()) {
    throw new Error('handoff.skill.name is required');
  }
  if (!Array.isArray(handoff.required_skills)) throw new Error('handoff.required_skills must be an array');
  if (!handoff.registry || typeof handoff.registry !== 'object') throw new Error('handoff.registry is required');
  if (typeof handoff.human_request !== 'string' || !handoff.human_request.trim()) {
    throw new Error('handoff.human_request is required');
  }
  if (handoff.human_request.length > 4000) throw new Error('handoff.human_request exceeds 4000 characters');
}

export function createHandoffStore({
  ttlMs = DEFAULT_HANDOFF_TTL_MS,
  maxEntries = DEFAULT_HANDOFF_MAX_ENTRIES,
  now = () => Date.now()
} = {}) {
  const records = new Map();

  const prune = () => {
    const timestamp = now();
    for (const [session, record] of records) {
      if (record.expiresAt <= timestamp) records.delete(session);
    }
    while (records.size > maxEntries) {
      const oldest = records.keys().next().value;
      if (oldest === undefined) break;
      records.delete(oldest);
    }
  };

  const put = (session, writeKey, handoff) => {
    if (!validHandoffToken(session)) throw new Error('invalid handoff session');
    if (!validHandoffToken(writeKey)) throw new Error('invalid handoff write key');
    validateHandoff(handoff);
    prune();

    const existing = records.get(session);
    if (existing && !sameSecret(existing.writeKey, writeKey)) {
      const error = new Error('handoff write key rejected');
      error.code = 'HANDOFF_WRITE_KEY_REJECTED';
      throw error;
    }

    const createdAt = now();
    const expiresAt = createdAt + ttlMs;
    const version = (existing?.version || 0) + 1;
    records.delete(session);
    records.set(session, {
      writeKey,
      handoff: cloneJson(handoff),
      createdAt,
      expiresAt,
      version
    });
    prune();
    return { version, createdAt, expiresAt };
  };

  const get = session => {
    if (!validHandoffToken(session)) return null;
    prune();
    const record = records.get(session);
    if (!record) return null;
    return {
      ...cloneJson(record.handoff),
      remote_session: {
        transport: 'streamable-http-mcp',
        session,
        version: record.version,
        published_at: new Date(record.createdAt).toISOString(),
        expires_at: new Date(record.expiresAt).toISOString(),
        persistence: 'volatile process memory only'
      }
    };
  };

  const remove = (session, writeKey) => {
    if (!validHandoffToken(session)) return false;
    prune();
    const record = records.get(session);
    if (!record) return false;
    if (!sameSecret(record.writeKey, writeKey)) {
      const error = new Error('handoff write key rejected');
      error.code = 'HANDOFF_WRITE_KEY_REJECTED';
      throw error;
    }
    return records.delete(session);
  };

  const size = () => {
    prune();
    return records.size;
  };

  return { put, get, remove, size, prune, ttlMs, maxEntries };
}
