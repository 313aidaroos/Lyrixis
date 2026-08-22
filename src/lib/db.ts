import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "lyrixis.db");

let db: Database.Database | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const uploadsDir = path.join(DATA_DIR, "uploads");
  const exportsDir = path.join(DATA_DIR, "exports");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
}

export function getDb(): Database.Database {
  if (!db) {
    ensureDataDir();
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      title TEXT,
      artist TEXT,
      duration_seconds REAL,
      original_filename TEXT,
      audio_path TEXT,
      audio_sha256 TEXT,
      status TEXT NOT NULL DEFAULT 'uploaded',
      language TEXT,
      language_confidence REAL,
      dialect TEXT,
      dialect_confidence REAL,
      explicit_status TEXT NOT NULL DEFAULT 'unknown',
      transcription_confidence REAL,
      confidence_band TEXT,
      account_type TEXT NOT NULL DEFAULT 'individual',
      notify_email TEXT,
      rights_confirmed INTEGER NOT NULL DEFAULT 0,
      rights_confirmed_at TEXT,
      paid INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      metadata_json TEXT,
      result_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
    CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at DESC);

    CREATE TABLE IF NOT EXISTS processing_jobs (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      step TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exports (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      format TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      bytes INTEGER,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      min_songs INTEGER NOT NULL,
      max_songs INTEGER,
      rate_cents INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    INSERT OR IGNORE INTO pricing_tiers (id, min_songs, max_songs, rate_cents) VALUES
      (1, 1, 99, 299),
      (2, 100, 999, 149),
      (3, 1000, 9999, 75),
      (4, 10000, 99999, 40),
      (5, 100000, 999999, 20),
      (6, 1000000, NULL, 20);
  `);
}

export function getDataDir() {
  ensureDataDir();
  return DATA_DIR;
}

export function getUploadsDir() {
  return path.join(getDataDir(), "uploads");
}

export function getExportsDir() {
  return path.join(getDataDir(), "exports");
}
