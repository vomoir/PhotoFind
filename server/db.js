import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../photos.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filepath TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    location_name TEXT,
    subject TEXT,
    people TEXT,
    tags TEXT,
    description TEXT,
    date_taken TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS geocoding_cache (
    lat_rounded REAL NOT NULL,
    lon_rounded REAL NOT NULL,
    location_name TEXT NOT NULL,
    PRIMARY KEY (lat_rounded, lon_rounded)
  );
`);

export default db;
