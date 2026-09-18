/* Прогресс, XP, жетістіктер, қателер, диагностика */
const PREFIX = 'qtp_prog_';

export const ACHIEVEMENTS = [
  { id: 'bilimpaz', title: 'Білімпаз', desc: '10 тапсырманы дұрыс орындау', icon: '📚', check: s => s.correctTotal >= 10 },
  { id: 'kitapqumar', title: 'Кітапқұмар', desc: 'Оқу сауаттылығынан 5 мәтін', icon: '📖', check: s => (s.readingDone || 0) >= 5 },
  { id: 'grammar', title: 'Грамматика шебері', desc: 'Грамматикадан 20 дұрыс жауап', icon: '✍️', check: s => (s.grammarCorrect || 0) >= 20 },
  { id: 'reading_exp', title: 'Оқу сауаттылығы сарапшысы', desc: 'Сауаттылық тестінен 80%+', icon: '🎯', check: s => (s.readingBest || 0) >= 80 },
  { id: 'logic', title: 'Логика шебері', desc: 'PISA-дан 5 тапсырма', icon: '🧠', check: s => (s.pisaDone || 0) >= 5 },
  { id: 'olymp', title: 'Олимпиадашы', desc: 'Олимпиада деңгейін аяқтау', icon: '🏆', check: s => (s.olympiadDone || 0) >= 1 },
  { id: 'bilgir', title: 'Қазақ тілі білгірі', desc: '500 XP жинау', icon: '⭐', check: s => (s.xp || 0) >= 500 }
];

function key(userId) { return PREFIX + userId; }

export function loadProgress(userId) {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultProgress();
  }
}

function defaultProgress() {
  return {
    xp: 0,
    correctTotal: 0,
    wrongTotal: 0,
    grammarCorrect: 0,
    readingDone: 0,
    readingBest: 0,
    pisaDone: 0,
    olympiadDone: 0,
    topicStats: {}, // topicId -> { correct, wrong, lastScore }
    errors: [], // { id, question, userAnswer, correct, rule, topicId, at }
    results: [], // test results
    achievements: [],
    diagnostic: null,
    diagnosticDone: false,
    assignments: [], // from teacher
    difficulty: 'medium' // adaptive
  };
}

export function saveProgress(userId, data) {
  localStorage.setItem(key(userId), JSON.stringify(data));
}

export function recordAnswer(userId, { topicId, correct, question, userAnswer, rule, section }) {
  const p = loadProgress(userId);
  if (!p.topicStats[topicId]) p.topicStats[topicId] = { correct: 0, wrong: 0, lastScore: 0 };
  if (correct) {
    p.correctTotal++;
    p.xp += p.difficulty === 'hard' ? 15 : p.difficulty === 'easy' ? 8 : 10;
    p.topicStats[topicId].correct++;
    if (section === 'morphology' || section === 'syntax' || section === 'phonetics' || section === 'punctuation' || section === 'words') {
      p.grammarCorrect++;
    }
    // adaptive up
    const ts = p.topicStats[topicId];
    const rate = ts.correct / (ts.correct + ts.wrong || 1);
    if (rate > 0.8 && ts.correct >= 5) p.difficulty = 'hard';
  } else {
    p.wrongTotal++;
    p.topicStats[topicId].wrong++;
    p.errors.unshift({
      id: 'err-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      question: typeof question === 'object' ? question.question : question,
      userAnswer,
      correctAnswer: typeof question === 'object' ? question.correct : '',
      rule: rule || (typeof question === 'object' ? question.rule : ''),
      topicId,
      qObj: typeof question === 'object' ? question : null,
      at: Date.now()
    });
    if (p.errors.length > 100) p.errors.length = 100;
    const ts = p.topicStats[topicId];
    const rate = ts.correct / ((ts.correct + ts.wrong) || 1);
    if (rate < 0.4) p.difficulty = 'easy';
  }
  unlockAchievements(p);
  saveProgress(userId, p);
  return p;
}

export function recordErrorDetail(userId, err) {
  const p = loadProgress(userId);
  p.errors.unshift({ id: 'err-' + Date.now(), at: Date.now(), ...err });
  if (p.errors.length > 100) p.errors.length = 100;
  saveProgress(userId, p);
  return p;
}

export function clearError(userId, errId) {
  const p = loadProgress(userId);
  p.errors = p.errors.filter(e => e.id !== errId);
  saveProgress(userId, p);
  return p;
}

export function saveTestResult(userId, result) {
  const p = loadProgress(userId);
  p.results.unshift({ ...result, at: Date.now() });
  if (p.results.length > 50) p.results.length = 50;
  if (result.category === 'reading') {
    p.readingDone += result.total || 1;
    p.readingBest = Math.max(p.readingBest, result.percent || 0);
  }
  if (result.category === 'pisa') p.pisaDone += result.total || 1;
  if (result.category === 'olympiad') p.olympiadDone += 1;
  p.xp += Math.round((result.percent || 0) / 5);
  unlockAchievements(p);
  saveProgress(userId, p);
  return p;
}

export function saveDiagnostic(userId, data) {
  const p = loadProgress(userId);
  p.diagnostic = data;
  p.diagnosticDone = true;
  // set difficulty from diagnostic
  const avg = data.percent || 0;
  p.difficulty = avg >= 75 ? 'hard' : avg >= 45 ? 'medium' : 'easy';
  unlockAchievements(p);
  saveProgress(userId, p);
  return p;
}

function unlockAchievements(p) {
  for (const a of ACHIEVEMENTS) {
    if (!p.achievements.includes(a.id) && a.check(p)) {
      p.achievements.push(a.id);
      p.xp += 25;
    }
  }
}

export function getWeakTopics(userId, topicsList) {
  const p = loadProgress(userId);
  const weak = [];
  for (const t of topicsList || []) {
    const st = p.topicStats[t.id];
    if (!st) continue;
    const total = st.correct + st.wrong;
    if (total < 3) continue;
    const rate = st.correct / total;
    if (rate < 0.6) weak.push({ ...t, rate, ...st });
  }
  return weak.sort((a, b) => a.rate - b.rate);
}

export function getRecommendations(userId, topicsList) {
  const weak = getWeakTopics(userId, topicsList);
  if (!weak.length) return 'Жақсы нәтиже! Жаңа тақырыптарды жалғастырыңыз.';
  return `Сізге «${weak[0].title}» тақырыбын қайталау ұсынылады.`;
}

export function addAssignment(studentId, assignment) {
  const p = loadProgress(studentId);
  p.assignments = p.assignments || [];
  p.assignments.unshift({ ...assignment, id: 'asg-' + Date.now(), status: 'new', at: Date.now() });
  saveProgress(studentId, p);
}

export function getAllProgressForStudents(students) {
  return students.map(s => ({
    student: s,
    progress: loadProgress(s.id)
  }));
}
