'use strict';

const { openDatabase, getDb, isSeeded } = require('./db');
const { hashPassword } = require('./auth');
const { TOPICS, readingPassages, pisaItems, olympiadSets } = require('./curriculum');

const PARALLELS = ['А', 'Б', 'В', 'Г'];

async function seed(force = false) {
  await openDatabase();
  const db = getDb();

  if (isSeeded() && !force) {
    console.log('[seed] already seeded, skip');
    return;
  }

  if (force) {
    db.exec(`
      DELETE FROM feedback;
      DELETE FROM mistakes;
      DELETE FROM results;
      DELETE FROM assignments;
      DELETE FROM tests;
      DELETE FROM tasks;
      DELETE FROM topics;
      DELETE FROM users;
      DELETE FROM classes;
    `);
  }

  // Classes 5-А .. 9-Г
  const classIds = {};
  for (let grade = 5; grade <= 9; grade++) {
    for (const p of PARALLELS) {
      const name = `${grade}-${p}`;
      const r = db.prepare('INSERT INTO classes (grade, name, teacher_id) VALUES (?, ?, NULL)').run(grade, name);
      classIds[name] = r.lastInsertRowid;
    }
  }
  console.log('[seed] classes:', Object.keys(classIds).length);

  // Teacher
  const teacherHash = hashPassword('Teacher140!');
  const tr = db.prepare(
    'INSERT INTO users (name, login, password_hash, role, class_id) VALUES (?, ?, ?, ?, NULL)'
  ).run('Мұғалім 140', 'teacher140', teacherHash, 'teacher');
  const teacherId = tr.lastInsertRowid;

  // Assign teacher to all classes
  db.prepare('UPDATE classes SET teacher_id = ?').run(teacherId);
  console.log('[seed] teacher140 created');

  // Topics + tasks + quizzes
  for (const topic of TOPICS) {
    const r = db.prepare(
      'INSERT INTO topics (grade, title, section, lesson_json, theory_text) VALUES (?, ?, ?, ?, ?)'
    ).run(topic.grade, topic.title, topic.section, topic.lesson, topic.theory);
    const topicId = r.lastInsertRowid;

    for (const task of topic.tasks) {
      db.prepare(
        'INSERT INTO tasks (topic_id, question, type, options_json, correct_json, explanation, level) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(topicId, task.question, task.type, task.options_json, task.correct_json, task.explanation, task.level);
    }

    // Short quiz from first 5 closed tasks
    const closed = topic.tasks.filter((x) => !['open', 'creative'].includes(x.type)).slice(0, 5);
    const questions = closed.map((x, i) => ({
      id: i + 1,
      question: x.question,
      type: x.type,
      options: x.options_json ? JSON.parse(x.options_json) : null,
      correct: JSON.parse(x.correct_json),
      explanation: x.explanation
    }));
    db.prepare(
      'INSERT INTO tests (title, grade, topic_id, type, questions_json, time_limit, max_score) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(`Тест: ${topic.title}`, topic.grade, topicId, 'quiz', JSON.stringify(questions), 15, questions.length * 10);
  }
  console.log('[seed] topics:', TOPICS.length);

  // Reading literacy tests
  for (const r of readingPassages()) {
    const questions = r.questions.map((q, i) => ({
      id: i + 1,
      question: q.q,
      type: 'single',
      options: q.options,
      correct: q.correct,
      passage: r.text
    }));
    db.prepare(
      'INSERT INTO tests (title, grade, topic_id, type, questions_json, time_limit, max_score) VALUES (?, ?, NULL, ?, ?, ?, ?)'
    ).run(r.title, r.grade, 'reading', JSON.stringify(questions), 20, questions.length * 10);
  }

  // PISA
  for (const p of pisaItems()) {
    const questions = p.questions.map((q, i) => ({
      id: i + 1,
      question: q.q,
      type: q.type || 'single',
      options: q.options,
      correct: q.correct,
      stimulus: p.stimulus
    }));
    db.prepare(
      'INSERT INTO tests (title, grade, topic_id, type, questions_json, time_limit, max_score) VALUES (?, ?, NULL, ?, ?, ?, ?)'
    ).run(p.title, p.grade, 'pisa', JSON.stringify(questions), 25, questions.length * 10);
  }

  // Olympiad
  for (const o of olympiadSets()) {
    const questions = o.qs.map((q, i) => ({
      id: i + 1,
      question: q.q,
      type: 'single',
      options: q.options,
      correct: q.correct,
      olympiad_level: o.level
    }));
    db.prepare(
      'INSERT INTO tests (title, grade, topic_id, type, questions_json, time_limit, max_score) VALUES (?, ?, NULL, ?, ?, ?, ?)'
    ).run(o.title, o.grade, 'olympiad', JSON.stringify({ level: o.level, questions }), 40, questions.length * 20);
  }

  console.log('[seed] done');
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seed(force).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { seed };
