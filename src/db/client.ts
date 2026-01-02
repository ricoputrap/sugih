import Database from 'better-sqlite3';
import path from 'path';

// Singleton pattern for database connection
let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'sqlite.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// Raw SQL helpers
export function all<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = getDb().prepare(sql);
  return stmt.all(params) as T[];
}

export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const stmt = getDb().prepare(sql);
  return stmt.get(params) as T | undefined;
}

export function run(sql: string, params: any[] = []): Database.RunResult {
  const stmt = getDb().prepare(sql);
  return stmt.run(params);
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  const tx = db.transaction(fn);
  return tx();
}
