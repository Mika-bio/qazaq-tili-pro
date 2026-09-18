'use strict';

const express = require('express');
const { getDb } = require('./db');
const {
  hashPassword,
  signToken,
  authMiddleware,
  requireRole,
  publicUser,
  SCHOOL_CODE
} = require('./auth');
const { gradeAnswer } = require('./grade');

const router = express.Router();

function nowISO() {
  return new Date().toISOString();
}

// ---------- Auth ----------
router.post('/auth/register-student', (req, res) => {
  const { name, login, password, classId, grade, parallel } = req.body || {};
  if (!name || !login || !password) {
    return res.status(400).json({ error: 'Аты, логин және құпиясөз қажет' });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: 'Құпиясөз кемінде 4 таңба' });
  }
  const db = getDb();
  let cid = classId ? Number(classId) : null;
  if (!cid && grade && parallel) {
    const cls = db.prepare('SELECT id FROM classes WHERE grade = ? AND name = ?').get(
      Number(grade),
      `${grade}-${parallel}`
    );
    if (!cls) return res.status(400).json({ error: 'Сынып табылмады' });
    cid = cls.id;
  }
  if (!cid) return res.status(400).json({ error: 'Сыныпты таңдаңыз' });
  const exists = db.prepare('SELECT id FROM users WHERE login = ?').get(String(login).trim());
  if (exists) return res.status(409).json({ error: 'Бұл логин бос емес' });

  const r = db.prepare(
    'INSERT INTO users (name, login, password_hash, role, class_id) VALUES (?, ?, ?, ?, ?)'
  ).run(String(name).trim(), String(login).trim(), hashPassword(password), 'student', cid);
  const user = db.prepare('SELECT id, name, login, role, class_id FROM users WHERE id = ?').get(r.lastInsertRowid);
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.post('/auth/login-student', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Логин және құпиясөз қажет' });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE login = ? AND role = ?').get(String(login).trim(), 'student');
  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Логин немесе құпиясөз қате' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/auth/login-teacher', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Логин және құпиясөз қажет' });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE login = ? AND role = ?').get(String(login).trim(), 'teacher');
  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Логин немесе құпиясөз қате' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/auth/register-teacher', (req, res) => {
  const { login, password, schoolCode, name } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Логин және құпиясөз қажет' });
  if (schoolCode !== SCHOOL_CODE) {
    return res.status(403).json({ error: 'Мектеп коды қате' });
  }
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE login = ?').get(String(login).trim());
  if (exists) return res.status(409).json({ error: 'Бұл логин бос емес' });
  const r = db.prepare(
    'INSERT INTO users (name, login, password_hash, role, class_id) VALUES (?, ?, ?, ?, NULL)'
  ).run(String(name || 'Мұғалім').trim(), String(login).trim(), hashPassword(password), 'teacher');
  const user = db.prepare('SELECT id, name, login, role, class_id FROM users WHERE id = ?').get(r.lastInsertRowid);
  // assign to all classes without teacher
  db.prepare('UPDATE classes SET teacher_id = ? WHERE teacher_id IS NULL').run(user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/auth/logout', authMiddleware, (req, res) => {
  res.json({ ok: true });
});

// ---------- Meta ----------
router.get('/classes', (req, res) => {
  const rows = getDb().prepare('SELECT id, grade, name, teacher_id FROM classes ORDER BY grade, name').all();
  res.json({ classes: rows });
});

router.get('/topics', authMiddleware, (req, res) => {
  const grade = req.query.grade ? Number(req.query.grade) : null;
  let rows;
  if (grade) {
    rows = getDb().prepare('SELECT id, grade, title, section FROM topics WHERE grade = ? ORDER BY id').all(grade);
  } else {
    rows = getDb().prepare('SELECT id, grade, title, section FROM topics ORDER BY grade, id').all();
  }
  res.json({ topics: rows });
});

router.get('/topics/:id', authMiddleware, (req, res) => {
  const topic = getDb().prepare('SELECT * FROM topics WHERE id = ?').get(Number(req.params.id));
  if (!topic) return res.status(404).json({ error: 'Тақырып табылмады' });
  let lesson = {};
  try { lesson = JSON.parse(topic.lesson_json || '{}'); } catch (_) {}
  const tasks = getDb().prepare(
    'SELECT id, topic_id, question, type, options_json, level FROM tasks WHERE topic_id = ? ORDER BY id'
  ).all(topic.id);
  const quiz = getDb().prepare(
    'SELECT id, title, time_limit, max_score FROM tests WHERE topic_id = ? AND type = ?'
  ).get(topic.id, 'quiz');
  res.json({
    topic: {
      id: topic.id,
      grade: topic.grade,
      title: topic.title,
      section: topic.section,
      theory_text: topic.theory_text,
      lesson
    },
    tasks: tasks.map((t) => ({
      ...t,
      options: t.options_json ? JSON.parse(t.options_json) : null,
      options_json: undefined
    })),
    quiz
  });
});

router.get('/tasks/:id', authMiddleware, (req, res) => {
  const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Тапсырма табылмады' });
  res.json({
    task: {
      id: task.id,
      topic_id: task.topic_id,
      question: task.question,
      type: task.type,
      options: task.options_json ? JSON.parse(task.options_json) : null,
      level: task.level
    }
  });
});

// Submit single task
router.post('/tasks/:id/submit', authMiddleware, requireRole('student'), (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Тапсырма табылмады' });
  const answer = req.body && req.body.answer;
  const graded = gradeAnswer(task, answer);
  const date = nowISO();

  const result = db.prepare(
    `INSERT INTO results (student_id, kind, ref_id, answer_json, score, max_score, auto_graded, date, assignment_id)
     VALUES (?, 'task', ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.user.id,
    task.id,
    JSON.stringify(answer),
    graded.score,
    graded.max,
    graded.auto ? 1 : 0,
    date,
    req.body.assignment_id || null
  );

  let mistake = null;
  if (graded.auto && !graded.correct) {
    const mr = db.prepare(
      `INSERT INTO mistakes (student_id, task_id, topic_id, student_answer, correct_answer, explanation, resolved)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(
      req.user.id,
      task.id,
      task.topic_id,
      JSON.stringify(answer),
      JSON.stringify(graded.correctAnswer),
      task.explanation || ''
    );
    mistake = { id: mr.lastInsertRowid };
  }

  res.json({
    resultId: result.lastInsertRowid,
    auto: graded.auto,
    correct: graded.correct,
    score: graded.score,
    max: graded.max,
    needsTeacher: graded.needsTeacher,
    correctAnswer: graded.auto ? graded.correctAnswer : undefined,
    explanation: graded.auto ? task.explanation : undefined,
    mistake
  });
});

// Tests list
router.get('/tests', authMiddleware, (req, res) => {
  const { grade, type } = req.query;
  let sql = 'SELECT id, title, grade, topic_id, type, time_limit, max_score FROM tests WHERE 1=1';
  const params = [];
  if (grade) { sql += ' AND grade = ?'; params.push(Number(grade)); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY grade, id';
  res.json({ tests: getDb().prepare(sql).all(...params) });
});

router.get('/tests/:id', authMiddleware, (req, res) => {
  const test = getDb().prepare('SELECT * FROM tests WHERE id = ?').get(Number(req.params.id));
  if (!test) return res.status(404).json({ error: 'Тест табылмады' });
  let questions = JSON.parse(test.questions_json || '[]');
  // olympiad wrapped
  let meta = {};
  if (test.type === 'olympiad' && questions.questions) {
    meta.level = questions.level;
    questions = questions.questions;
  }
  // strip correct answers for students
  const safe = questions.map((q) => ({
    id: q.id,
    question: q.question,
    type: q.type || 'single',
    options: q.options,
    passage: q.passage,
    stimulus: q.stimulus,
    olympiad_level: q.olympiad_level
  }));
  res.json({
    test: {
      id: test.id,
      title: test.title,
      grade: test.grade,
      topic_id: test.topic_id,
      type: test.type,
      time_limit: test.time_limit,
      max_score: test.max_score,
      ...meta
    },
    questions: safe
  });
});

router.post('/tests/:id/submit', authMiddleware, requireRole('student'), (req, res) => {
  const db = getDb();
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(Number(req.params.id));
  if (!test) return res.status(404).json({ error: 'Тест табылмады' });
  let questions = JSON.parse(test.questions_json || '[]');
  if (test.type === 'olympiad' && questions.questions) questions = questions.questions;
  const answers = (req.body && req.body.answers) || {};
  let score = 0;
  let max = 0;
  let needsTeacher = false;
  const details = [];

  for (const q of questions) {
    const ans = answers[q.id] !== undefined ? answers[q.id] : answers[String(q.id)];
    const fakeTask = {
      type: q.type || 'single',
      correct_json: JSON.stringify(q.correct),
      explanation: q.explanation || ''
    };
    const g = gradeAnswer(fakeTask, ans);
    max += g.max * 10;
    score += g.score * 10;
    if (g.needsTeacher) needsTeacher = true;
    details.push({
      id: q.id,
      correct: g.correct,
      needsTeacher: g.needsTeacher,
      correctAnswer: g.auto ? g.correctAnswer : undefined,
      explanation: q.explanation
    });
    if (g.auto && !g.correct) {
      db.prepare(
        `INSERT INTO mistakes (student_id, task_id, topic_id, student_answer, correct_answer, explanation, resolved)
         VALUES (?, NULL, ?, ?, ?, ?, 0)`
      ).run(req.user.id, test.topic_id, JSON.stringify(ans), JSON.stringify(g.correctAnswer), q.explanation || test.title);
    }
  }

  const r = db.prepare(
    `INSERT INTO results (student_id, kind, ref_id, answer_json, score, max_score, auto_graded, date, assignment_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.user.id,
    test.type || 'test',
    test.id,
    JSON.stringify(answers),
    score,
    max || test.max_score,
    needsTeacher ? 0 : 1,
    nowISO(),
    req.body.assignment_id || null
  );

  res.json({
    resultId: r.lastInsertRowid,
    score,
    maxScore: max || test.max_score,
    details,
    needsTeacher
  });
});

// ---------- Student dashboard ----------
router.get('/student/dashboard', authMiddleware, requireRole('student'), (req, res) => {
  const db = getDb();
  const uid = req.user.id;
  const classInfo = req.user.class_id
    ? db.prepare('SELECT id, grade, name FROM classes WHERE id = ?').get(req.user.class_id)
    : null;
  const tasksDone = db.prepare(
    "SELECT COUNT(*) AS c FROM results WHERE student_id = ? AND kind = 'task'"
  ).get(uid).c;
  const testRows = db.prepare(
    "SELECT score, max_score FROM results WHERE student_id = ? AND kind IN ('quiz','test','olympiad','reading','pisa')"
  ).all(uid);
  let testAvg = 0;
  if (testRows.length) {
    const pcts = testRows.map((r) => (r.max_score ? (r.score / r.max_score) * 100 : 0));
    testAvg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }
  const mistakes = db.prepare(
    'SELECT COUNT(*) AS c FROM mistakes WHERE student_id = ? AND resolved = 0'
  ).get(uid).c;
  const totalTopics = classInfo
    ? db.prepare('SELECT COUNT(*) AS c FROM topics WHERE grade = ?').get(classInfo.grade).c
    : 0;
  const doneTopics = db.prepare(
    `SELECT COUNT(DISTINCT t.topic_id) AS c FROM results r
     JOIN tasks t ON r.ref_id = t.id AND r.kind = 'task'
     WHERE r.student_id = ? AND r.score > 0`
  ).get(uid).c;
  const progress = totalTopics ? Math.min(100, Math.round((doneTopics / totalTopics) * 100)) : 0;
  const feedback = db.prepare(
    `SELECT f.*, u.name AS teacher_name FROM feedback f
     JOIN users u ON u.id = f.teacher_id
     WHERE f.student_id = ? ORDER BY f.id DESC LIMIT 1`
  ).get(uid);
  const assignments = db.prepare(
    `SELECT a.* FROM assignments a WHERE a.class_id = ? ORDER BY a.id DESC LIMIT 20`
  ).all(req.user.class_id || -1);

  res.json({
    class: classInfo,
    tasksDone,
    testAvg,
    mistakes,
    progress,
    latestFeedback: feedback || null,
    assignments
  });
});

router.get('/student/mistakes', authMiddleware, requireRole('student'), (req, res) => {
  const rows = getDb().prepare(
    `SELECT m.*, t.title AS topic_title FROM mistakes m
     LEFT JOIN topics t ON t.id = m.topic_id
     WHERE m.student_id = ? ORDER BY m.id DESC`
  ).all(req.user.id);
  res.json({ mistakes: rows });
});

router.post('/student/mistakes/:id/resolve', authMiddleware, requireRole('student'), (req, res) => {
  const db = getDb();
  const m = db.prepare('SELECT * FROM mistakes WHERE id = ? AND student_id = ?').get(
    Number(req.params.id),
    req.user.id
  );
  if (!m) return res.status(404).json({ error: 'Қате табылмады' });
  db.prepare('UPDATE mistakes SET resolved = 1 WHERE id = ?').run(m.id);
  res.json({ ok: true });
});

router.get('/student/results', authMiddleware, requireRole('student'), (req, res) => {
  const rows = getDb().prepare(
    'SELECT * FROM results WHERE student_id = ? ORDER BY id DESC LIMIT 100'
  ).all(req.user.id);
  res.json({ results: rows });
});

router.get('/student/feedback', authMiddleware, requireRole('student'), (req, res) => {
  const rows = getDb().prepare(
    `SELECT f.*, u.name AS teacher_name FROM feedback f
     JOIN users u ON u.id = f.teacher_id
     WHERE f.student_id = ? ORDER BY f.id DESC`
  ).all(req.user.id);
  res.json({ feedback: rows });
});

router.get('/student/assignments', authMiddleware, requireRole('student'), (req, res) => {
  if (!req.user.class_id) return res.json({ assignments: [] });
  const rows = getDb().prepare(
    `SELECT a.*, 
      (SELECT r.id FROM results r WHERE r.student_id = ? AND r.assignment_id = a.id LIMIT 1) AS done_result_id
     FROM assignments a WHERE a.class_id = ? ORDER BY a.id DESC`
  ).all(req.user.id, req.user.class_id);
  res.json({ assignments: rows });
});

// ---------- Teacher ----------
router.get('/teacher/classes', authMiddleware, requireRole('teacher'), (req, res) => {
  const rows = getDb().prepare(
    'SELECT id, grade, name, teacher_id FROM classes WHERE teacher_id = ? OR teacher_id IS NOT NULL ORDER BY grade, name'
  ).all(req.user.id);
  // Prefer classes assigned to this teacher; if none, show all
  const mine = rows.filter((c) => c.teacher_id === req.user.id);
  res.json({ classes: mine.length ? mine : getDb().prepare('SELECT id, grade, name, teacher_id FROM classes ORDER BY grade, name').all() });
});

router.get('/teacher/classes/:id/students', authMiddleware, requireRole('teacher'), (req, res) => {
  const classId = Number(req.params.id);
  const students = getDb().prepare(
    "SELECT id, name, login, class_id FROM users WHERE role = 'student' AND class_id = ? ORDER BY name"
  ).all(classId);
  res.json({ students });
});

router.post('/teacher/assignments', authMiddleware, requireRole('teacher'), (req, res) => {
  const { classId, kind, refId, title, dueAt } = req.body || {};
  if (!classId || !kind || !refId || !title) {
    return res.status(400).json({ error: 'classId, kind, refId, title қажет' });
  }
  const r = getDb().prepare(
    `INSERT INTO assignments (teacher_id, class_id, kind, ref_id, title, due_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, Number(classId), kind, Number(refId), title, dueAt || null, nowISO());
  res.json({ id: r.lastInsertRowid });
});

router.get('/teacher/classes/:id/assignments', authMiddleware, requireRole('teacher'), (req, res) => {
  const rows = getDb().prepare(
    'SELECT * FROM assignments WHERE class_id = ? ORDER BY id DESC'
  ).all(Number(req.params.id));
  res.json({ assignments: rows });
});

router.get('/teacher/classes/:id/dashboard', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const classId = Number(req.params.id);
  const students = db.prepare(
    "SELECT id, name FROM users WHERE role = 'student' AND class_id = ?"
  ).all(classId);
  const assignments = db.prepare('SELECT * FROM assignments WHERE class_id = ?').all(classId);
  const overview = students.map((s) => {
    const done = db.prepare(
      'SELECT COUNT(DISTINCT assignment_id) AS c FROM results WHERE student_id = ? AND assignment_id IS NOT NULL'
    ).get(s.id).c;
    const mistakes = db.prepare(
      'SELECT COUNT(*) AS c FROM mistakes WHERE student_id = ? AND resolved = 0'
    ).get(s.id).c;
    const avgRow = db.prepare(
      'SELECT AVG(CASE WHEN max_score > 0 THEN score * 100.0 / max_score ELSE 0 END) AS a FROM results WHERE student_id = ?'
    ).get(s.id);
    return {
      student: s,
      assignmentsDone: done,
      assignmentsTotal: assignments.length,
      openMistakes: mistakes,
      avgPercent: Math.round(avgRow.a || 0)
    };
  });

  // weak topics: most mistakes
  const weak = db.prepare(
    `SELECT t.id, t.title, COUNT(m.id) AS c FROM mistakes m
     JOIN topics t ON t.id = m.topic_id
     JOIN users u ON u.id = m.student_id
     WHERE u.class_id = ? AND m.resolved = 0
     GROUP BY t.id ORDER BY c DESC LIMIT 5`
  ).all(classId);

  res.json({ overview, weakTopics: weak, assignmentsCount: assignments.length });
});

router.get('/teacher/students/:id/results', authMiddleware, requireRole('teacher'), (req, res) => {
  const sid = Number(req.params.id);
  const results = getDb().prepare('SELECT * FROM results WHERE student_id = ? ORDER BY id DESC').all(sid);
  const mistakes = getDb().prepare('SELECT * FROM mistakes WHERE student_id = ? ORDER BY id DESC').all(sid);
  res.json({ results, mistakes });
});

router.get('/teacher/pending-open', authMiddleware, requireRole('teacher'), (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  let sql = `
    SELECT r.*, u.name AS student_name, u.class_id FROM results r
    JOIN users u ON u.id = r.student_id
    WHERE r.auto_graded = 0
  `;
  const params = [];
  if (classId) {
    sql += ' AND u.class_id = ?';
    params.push(classId);
  }
  sql += ' ORDER BY r.id DESC LIMIT 100';
  res.json({ results: getDb().prepare(sql).all(...params) });
});

router.post('/teacher/results/:id/grade', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const result = db.prepare('SELECT * FROM results WHERE id = ?').get(Number(req.params.id));
  if (!result) return res.status(404).json({ error: 'Нәтиже табылмады' });
  const { score, maxScore, grade, comment } = req.body || {};
  db.prepare('UPDATE results SET score = ?, max_score = ?, auto_graded = 1 WHERE id = ?').run(
    Number(score) || 0,
    Number(maxScore) || result.max_score || 10,
    result.id
  );
  const fr = db.prepare(
    `INSERT INTO feedback (teacher_id, student_id, result_id, score, grade, comment, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.user.id,
    result.student_id,
    result.id,
    Number(score) || 0,
    grade || '',
    comment || '',
    nowISO()
  );
  res.json({ feedbackId: fr.lastInsertRowid });
});

router.post('/teacher/feedback', authMiddleware, requireRole('teacher'), (req, res) => {
  const { studentId, resultId, score, grade, comment } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId қажет' });
  const r = getDb().prepare(
    `INSERT INTO feedback (teacher_id, student_id, result_id, score, grade, comment, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.user.id,
    Number(studentId),
    resultId || null,
    score != null ? Number(score) : null,
    grade || '',
    comment || '',
    nowISO()
  );
  res.json({ id: r.lastInsertRowid });
});

router.get('/teacher/tasks', authMiddleware, requireRole('teacher'), (req, res) => {
  const grade = req.query.grade ? Number(req.query.grade) : null;
  let sql = `
    SELECT tk.id, tk.question, tk.type, tk.level, tk.topic_id, tp.title AS topic_title, tp.grade
    FROM tasks tk JOIN topics tp ON tp.id = tk.topic_id WHERE 1=1
  `;
  const params = [];
  if (grade) { sql += ' AND tp.grade = ?'; params.push(grade); }
  sql += ' ORDER BY tp.grade, tk.id LIMIT 500';
  res.json({ tasks: getDb().prepare(sql).all(...params) });
});

module.exports = router;
