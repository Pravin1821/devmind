import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export interface DevmindStore {
    db: Database.Database;
    addFile: (filePath: string, language:string, summary: string) => void;
    addTask: (prompt: string, result: string, status: string) => void
    addDecision: (decision: string, reason: string) => void
    addDuplicate: (fileA: string, fileB: string, similarity: number) => void
    getFiles: () => any[]
    getTasks: () => any[]
    getDecisions: () => any[]
    getDuplicates: () => any[]
}

export function initializeStore(projectPath: string): DevmindStore {
    const devmindDir = path.join(projectPath, '.devmind');
    if (!fs.existsSync(devmindDir)) {
        fs.mkdirSync(devmindDir,{recursive: true});
        console.log(`Created .devmind directory at ${devmindDir}`);
    }

    const dbPath = path.join(devmindDir, 'memory.db')
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            language TEXT NOT NULL,
            summary TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt      TEXT NOT NULL,
            result      TEXT,
            status      TEXT DEFAULT 'pending',
            created_at  TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS decisions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            decision    TEXT NOT NULL,
            reason      TEXT NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS duplicates (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            file_a      TEXT NOT NULL,
            file_b      TEXT NOT NULL,
            similarity  REAL NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        );
    `);

    const insertFile = db.prepare(`
        INSERT INTO files (path, language, summary)
        VALUES (@path, @language, @summary)
    `);
    const insertTask = db.prepare(`
        INSERT INTO tasks (prompt, result, status)
        VALUES (@prompt, @result, @status)
    `);
    const insertDecision = db.prepare(`
        INSERT INTO decisions (decision, reason)
        VALUES (@decision, @reason)
    `);
    const insertDuplicate = db.prepare(`
        INSERT INTO duplicates (file_a, file_b, similarity)
        VALUES (@file_a, @file_b, @similarity)
    `);

    return {
        db,
        addFile: (filePath: string, language: string, summary: string) => {
            insertFile.run({path: filePath, language, summary});
        },
        addTask: (prompt: string, result: string, status: string) => {
            insertTask.run({prompt, result, status});
        },
        addDecision: (decision: string, reason: string) => {
            insertDecision.run({decision, reason});
        },
        addDuplicate: (fileA: string, fileB: string, similarity: number) => {
            insertDuplicate.run({file_a: fileA, file_b: fileB, similarity});
        },
        getFiles: () => {
            return db.prepare('SELECT * FROM files').all();
        },
        getTasks: () => {
            return db.prepare('SELECT * FROM tasks').all();
        },
        getDecisions: () => {
            return db.prepare('SELECT * FROM decisions').all();
        },
        getDuplicates: () => {
            return db.prepare('SELECT * FROM duplicates').all();
        }
    };

}