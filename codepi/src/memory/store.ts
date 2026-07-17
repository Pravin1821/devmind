import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export interface CodePiStore {
    db: Database.Database;
    addFile: (filePath: string, language:string, summary: string) => void;
    addTask: (prompt: string, result: string, status: string) => void
    addDecision: (decision: string, reason: string) => void
    addDuplicate: (fileA: string, fileB: string, similarity: number) => void
    getFiles: () => any[]
    getTasks: () => any[]
    getDecisions: () => any[]
    getDuplicates: () => any[]
    clearFiles: () => void
    updateEmbedding: (filePath: string, embedding: number[]) => void
    addTokenLog: (command: string, promptTokens: number, savedTokens: number) => void
    getTokenLogs: () => any[]
}

export function initializeStore(projectPath: string): CodePiStore {
    const codepiDir = path.join(projectPath, '.codepi');
    if (!fs.existsSync(codepiDir)) {
        fs.mkdirSync(codepiDir,{recursive: true});
        console.log(`Created .codepi directory at ${codepiDir}`);
    }

    const dbPath = path.join(codepiDir, 'memory.db')
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            language TEXT NOT NULL,
            summary TEXT NOT NULL,
            embedding TEXT, 
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
        CREATE TABLE IF NOT EXISTS token_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            command     TEXT NOT NULL,
            prompt_tokens   INTEGER DEFAULT 0,
            saved_tokens    INTEGER DEFAULT 0,
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
        },
        clearFiles: () => {
             db.prepare('DELETE FROM files').run()
        },
        updateEmbedding: (filePath: string, embedding: number[]) => {
            const embeddingJson = JSON.stringify(embedding);
            db.prepare(`UPDATE files SET embedding = @embedding WHERE path = @path`).run({embedding: embeddingJson, path: filePath});
        },
        addTokenLog: (command: string, promptTokens: number, savedTokens: number) => {
        db.prepare(`
            INSERT INTO token_logs (command, prompt_tokens, saved_tokens)
            VALUES (@command, @promptTokens, @savedTokens)
            `).run({ command, promptTokens, savedTokens })
        },
        getTokenLogs: () => {
            return db.prepare('SELECT * FROM token_logs ORDER BY created_at DESC').all()
        }
    };

}