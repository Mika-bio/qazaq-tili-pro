/* Мұғалім панелі логикасы */
import { getAllStudents } from './auth.js';
import { getAllProgressForStudents, addAssignment, getWeakTopics } from './progress.js';
import { getTopicsByGrade } from './data/topics.js';

export function getDashboardData() {
  const students = getAllStudents();
  const rows = getAllProgressForStudents(students);
  const byGrade = {};
  for (const r of rows) {
    const g = r.student.grade;
    if (!byGrade[g]) byGrade[g] = [];
    byGrade[g].push(r);
  }

  // frequent errors across class
  const errMap = {};
  for (const r of rows) {
    for (const e of r.progress.errors || []) {
      const k = (e.qObj && e.qObj.question) || e.question || 'unknown';
      const key = typeof k === 'string' ? k.slice(0, 80) : JSON.stringify(k).slice(0, 80);
      errMap[key] = (errMap[key] || 0) + 1;
    }
  }
  const frequentErrors = Object.entries(errMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([q, count]) => ({ q, count }));

  // weak topics aggregated
  const weakAgg = {};
  for (const r of rows) {
    const topics = getTopicsByGrade(r.student.grade);
    const weak = getWeakTopics(r.student.id, topics);
    for (const w of weak) {
      if (!weakAgg[w.id]) weakAgg[w.id] = { title: w.title, grade: r.student.grade, count: 0 };
      weakAgg[w.id].count++;
    }
  }
  const weakTopics = Object.values(weakAgg).sort((a, b) => b.count - a.count).slice(0, 15);

  return { students: rows, byGrade, frequentErrors, weakTopics };
}

export function assignTask({ grade, topicId, topicTitle, count, timeLimit, classLabel }) {
  let students = getAllStudents().filter(s => s.grade === Number(grade));
  if (classLabel) {
    students = students.filter(s => s.classLabel === classLabel);
  }
  const assignment = {
    grade: Number(grade),
    classLabel: classLabel || null,
    topicId,
    topicTitle,
    count: Number(count) || 10,
    timeLimit: Number(timeLimit) || 15,
    type: 'practice'
  };
  for (const s of students) addAssignment(s.id, assignment);
  return { ok: true, count: students.length };
}

export function classAverages(rows) {
  if (!rows.length) return { avgXp: 0, avgPercent: 0, avgCorrect: 0 };
  let xp = 0, pct = 0, corr = 0, pctN = 0;
  for (const r of rows) {
    xp += r.progress.xp || 0;
    corr += r.progress.correctTotal || 0;
    const last = (r.progress.results || [])[0];
    if (last) { pct += last.percent || 0; pctN++; }
  }
  return {
    avgXp: Math.round(xp / rows.length),
    avgPercent: pctN ? Math.round(pct / pctN) : 0,
    avgCorrect: Math.round(corr / rows.length)
  };
}
