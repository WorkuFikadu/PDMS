// backend/db-postgres.js
// =====================================================================
// NPDMS — PostgreSQL / Neon / Supabase Adapter
// Provides the same synchronous-style API as the SQLite database.js
// so that server.js can use either DB without changing any query code.
//
// USAGE: Set DATABASE_URL env var to switch to Postgres production mode.
//   Local dev (SQLite):  DATABASE_URL not set → falls back to database.js
//   Production (Vercel): DATABASE_URL=postgres://... → this adapter runs
//
// API shim: db.prepare(sql).run(...), .get(...), .all(...)
//   → wraps pg Pool queries with synchronous-looking interface via
//     a lazy async queue flushed before each response cycle.
//
// Because Node's pg is async, we expose an async variant used by all
// server routes:  pgDb.run(sql, params), pgDb.get(sql, params), pgDb.all(sql, params)
// =====================================================================

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL && !DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }   // Neon / Supabase require SSL
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('[NPDMS PostgreSQL] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

// ─── Parameterized query helpers ───────────────────────────────────────
// SQLite uses ? placeholders; PostgreSQL uses $1 $2 $3 ...
// This helper converts ? → $n so existing queries work without changes.
function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

/**
 * pgDb.run(sql, params) — INSERT/UPDATE/DELETE, returns { changes }
 */
async function run(sql, params = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(convertPlaceholders(sql), params);
    return { changes: result.rowCount, lastInsertRowid: null };
  } finally {
    client.release();
  }
}

/**
 * pgDb.get(sql, params) — SELECT returning first row or undefined
 */
async function get(sql, params = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(convertPlaceholders(sql), params);
    return result.rows[0] || undefined;
  } finally {
    client.release();
  }
}

/**
 * pgDb.all(sql, params) — SELECT returning all rows
 */
async function all(sql, params = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(convertPlaceholders(sql), params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * pgDb.exec(sql) — run raw DDL (no params, no result)
 */
async function exec(sql) {
  const client = await getPool().connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

/**
 * pgDb.transaction(fn) — wraps fn(client) in BEGIN/COMMIT/ROLLBACK
 */
async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * initPostgresSchema() — creates all tables if they don't exist.
 * Reads schema-postgres.sql and executes it against the connected pool.
 */
async function initPostgresSchema() {
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, 'schema-postgres.sql');
  if (!fs.existsSync(schemaPath)) {
    console.warn('[NPDMS PG] schema-postgres.sql not found, skipping schema init.');
    return;
  }
  const schema = fs.readFileSync(schemaPath, 'utf8');
  try {
    await exec(schema);
    console.log('[NPDMS PG] PostgreSQL schema initialized successfully.');
  } catch (err) {
    console.error('[NPDMS PG] Schema init error:', err.message);
    throw err;
  }
}

/**
 * testConnection() — pings the DB and logs the server version.
 */
async function testConnection() {
  try {
    const row = await get('SELECT version()');
    console.log(`[NPDMS PG] Connected ✅ — ${row.version.split(' ').slice(0, 2).join(' ')}`);
    return true;
  } catch (err) {
    console.error('[NPDMS PG] Connection FAILED ❌:', err.message);
    return false;
  }
}

module.exports = {
  run,
  get,
  all,
  exec,
  transaction,
  initPostgresSchema,
  testConnection,
  getPool,
  isPostgres: true,
};
