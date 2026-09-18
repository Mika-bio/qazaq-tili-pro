'use strict';

/** Auto-grade closed task types. Returns { correct, score, max } */
function gradeAnswer(task, answer) {
  const type = task.type;
  let correct;
  try {
    correct = typeof task.correct_json === 'string' ? JSON.parse(task.correct_json) : task.correct_json;
  } catch (_) {
    correct = task.correct_json;
  }

  const manual = ['open', 'creative', 'text', 'sentence', 'analysis'];
  if (manual.includes(type)) {
    return { auto: false, correct: null, score: 0, max: 1, needsTeacher: true };
  }

  let ok = false;
  const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  if (type === 'single' || type === 'truefalse') {
    ok = norm(answer) === norm(correct);
  } else if (type === 'multi') {
    const a = Array.isArray(answer) ? [...answer].map(norm).sort() : [norm(answer)];
    const c = Array.isArray(correct) ? [...correct].map(norm).sort() : [norm(correct)];
    ok = a.length === c.length && a.every((x, i) => x === c[i]);
  } else if (type === 'fill' || type === 'short' || type === 'ortho' || type === 'punct') {
    const accepted = Array.isArray(correct) ? correct : [correct];
    ok = accepted.some((c) => norm(c) === norm(answer));
  } else if (type === 'match' || type === 'order') {
    ok = JSON.stringify(answer) === JSON.stringify(correct);
  } else {
    ok = norm(answer) === norm(correct);
  }

  return {
    auto: true,
    correct: ok,
    score: ok ? 1 : 0,
    max: 1,
    needsTeacher: false,
    correctAnswer: correct
  };
}

module.exports = { gradeAnswer };
