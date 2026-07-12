import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'cosmetics.db');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  brand      TEXT,
  ingredients TEXT,
  category   TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
`;

let _db: Database | null = null;

/**
 * Returns the SQLite database instance (lazy init).
 * Creates the data/ directory and cosmetics.db file on first call.
 */
export function getDb(): Database {
  if (_db) return _db;

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH, { create: true });
  _db.run('PRAGMA journal_mode = WAL');
  _db.exec(SCHEMA_SQL);

  return _db;
}
