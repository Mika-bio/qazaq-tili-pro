'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'qazaq.db');

let db;
let useSqlJs = false;
let SQL = null;
let sqlJsDb = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initSchema(run) {
  run(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade INTEGER NOT NULL,
      name TEXT NOT NULL,
      teacher_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','teacher')),
      class_id INTEGER,
      FOREIGN KEY(class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade INTEGER NOT NULL,
      title TEXT NOT NULL,
      section TEXT,
      lesson_json TEXT,
      theory_text TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      type TEXT NOT NULL,
      options_json TEXT,
      correct_json TEXT,
      explanation TEXT,
      level TEXT NOT NULL DEFAULT 'easy' CHECK(level IN ('easy','medium','hard')),
      FOREIGN KEY(topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      grade INTEGER NOT NULL,
      topic_id INTEGER,
      type TEXT NOT NULL DEFAULT 'quiz',
      questions_json TEXT,
      time_limit INTEGER DEFAULT 15,
      max_score INTEGER DEFAULT 100,
      FOREIGN KEY(topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      ref_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      due_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(teacher_id) REFERENCES users(id),
      FOREIGN KEY(class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      ref_id INTEGER NOT NULL,
      answer_json TEXT,
      score REAL DEFAULT 0,
      max_score REAL DEFAULT 0,
      auto_graded INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      assignment_id INTEGER,
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      task_id INTEGER,
      topic_id INTEGER,
      student_answer TEXT,
      correct_answer TEXT,
      explanation TEXT,
      resolved INTEGER DEFAULT 0,
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      result_id INTEGER,
      score REAL,
      grade TEXT,
      comment TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY(teacher_id) REFERENCES users(id),
      FOREIGN KEY(student_id) REFERENCES users(id)
    );
  `);
}

function wrapBetterSqlite(database) {
  return {
    exec(sql) { database.exec(sql); },
    prepare(sql) {
      const stmt = database.prepare(sql);
      return {
        run(...params) {
          const info = stmt.run(...params);
          return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
        },
        get(...params) { return stmt.get(...params); },
        all(...params) { return stmt.all(...params); }
      };
    },
    transaction(fn) {
      return database.transaction(fn)();
    },
    persist() {}
  };
}

function wrapSqlJs(database) {
  function persist() {
    const data = database.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
  return {
    exec(sql) { database.run(sql); persist(); },
    prepare(sql) {
      return {
        run(...params) {
          database.run(sql, params);
          const changes = database.getRowsModified();
          let lastInsertRowid = 0;
          try {
            const r = database.exec('SELECT last_insert_rowid() as id');
            if (r[0] && r[0].values[0]) lastInsertRowid = r[0].values[0][0];
          } catch (_) {}
          persist();
          return { changes, lastInsertRowid };
        },
        get(...params) {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        }
      };
    },
    transaction(fn) {
      database.run('BEGIN');
      try {
        const result = fn();
        database.run('COMMIT');
        persist();
        return result;
      } catch (e) {
        database.run('ROLLBACK');
        throw e;
      }
    },
    persist
  };
}

async function openDatabase() {
  ensureDir();
  try {
    const Database = require('better-sqlite3');
    const raw = new Database(DB_PATH);
    raw.pragma('journal_mode = WAL');
    raw.pragma('foreign_keys = ON');
    db = wrapBetterSqlite(raw);
    useSqlJs = false;
    initSchema((sql) => raw.exec(sql));
    console.log('[db] better-sqlite3:', DB_PATH);
    return db;
  } catch (err) {
    console.warn('[db] better-sqlite3 unavailable, using sql.js:', err.message);
    const initSqlJs = require('sql.js');
    SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      sqlJsDb = new SQL.Database(buf);
    } else {
      sqlJsDb = new SQL.Database();
    }
    db = wrapSqlJs(sqlJsDb);
    useSqlJs = true;
    initSchema((sql) => sqlJsDb.run(sql));
    db.persist();
    console.log('[db] sql.js:', DB_PATH);
    return db;
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function isSeeded() {
  try {
    const row = getDb().prepare('SELECT COUNT(*) AS c FROM users WHERE role = ?').get('teacher');
    return row && row.c > 0;
  } catch (_) {
    return false;
  }
}

module.exports = { openDatabase, getDb, isSeeded, DB_PATH };
