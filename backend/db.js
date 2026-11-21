// backend/db.js — Unified Database Adapter
// =====================================================================
// Auto-selects SQLite (local dev) or PostgreSQL (production Vercel/Neon)
// based on the DATABASE_URL environment variable.
//
// All server routes SHOULD import from this file going forward:
//   const { db, pgDb, isPostgres } = require('./db');
//
// When DATABASE_URL is set  → PostgreSQL mode (async pgDb.* functions)
// When DATABASE_URL not set → SQLite mode (sync db.prepare().* methods)
//
// Helper: dbRun / dbGet / dbAll — unified async helpers that work in both modes
// =====================================================================

const DATABASE_URL = process.env.DATABASE_URL;
const IS_POSTGRES  = !!DATABASE_URL;

let _sqlite = null;
let _pgDb   = null;

function getSqlite() {
  if (!_sqlite) {
    const { db } = require('./database');
    _sqlite = db;
  }
  return _sqlite;
}

function getPostgres() {
  if (!_pgDb) {
    _pgDb = require('./db-postgres');
  }
  return _pgDb;
}

/**
 * dbAll(sql, params) — returns Promise<row[]>
 * Executes a SELECT in either SQLite or PostgreSQL.
 */
async function dbAll(sql, params = []) {
  if (IS_POSTGRES) {
    return await getPostgres().all(sql, params);
  }
  // SQLite: synchronous, wrap in Promise
  return Promise.resolve(getSqlite().prepare(sql).all(...params));
}

/**
 * dbGet(sql, params) — returns Promise<row|undefined>
 */
async function dbGet(sql, params = []) {
  if (IS_POSTGRES) {
    return await getPostgres().get(sql, params);
  }
  return Promise.resolve(getSqlite().prepare(sql).get(...params));
}

/**
 * dbRun(sql, params) — returns Promise<{ changes, lastInsertRowid }>
 */
async function dbRun(sql, params = []) {
  if (IS_POSTGRES) {
    return await getPostgres().run(sql, params);
  }
  const stmt   = getSqlite().prepare(sql);
  const result = stmt.run(...params);
  return Promise.resolve({ changes: result.changes, lastInsertRowid: result.lastInsertRowid });
}

/**
 * dbExec(sql) — raw DDL, no params
 */
async function dbExec(sql) {
  if (IS_POSTGRES) {
    return await getPostgres().exec(sql);
  }
  getSqlite().exec(sql);
  return Promise.resolve();
}

/**
 * initDb() — initializes schema for whichever backend is active
 */
async function initDb() {
  if (IS_POSTGRES) {
    console.log('[NPDMS DB] Mode: PostgreSQL / Neon Production');
    const pg = getPostgres();
    await pg.testConnection();
    await pg.initPostgresSchema();
  } else {
    console.log('[NPDMS DB] Mode: SQLite (local development)');
    const { initDatabase } = require('./database');
    initDatabase();
  }
}

module.exports = {
  // Low-level access
  get db()   { return IS_POSTGRES ? null : getSqlite(); },
  get pgDb() { return IS_POSTGRES ? getPostgres() : null; },
  isPostgres: IS_POSTGRES,

  // Unified async helpers (use these for new code)
  dbAll,
  dbGet,
  dbRun,
  dbExec,
  initDb,
};
