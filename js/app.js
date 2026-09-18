/* ҚАЗАҚ ТІЛІ PRO — негізгі SPA */
import { SCHOOL, SCHOOL_UPPER, SECTIONS, getTopicsByGrade, getTopicsGrouped, getTopicById } from './data/topics.js';
import {
  getShuffledPractice, getQuiz, getSimilarQuestion, getDiagnosticQuestions,
  getTestByType, getReadingLiteracy, getPISAItems, getOlympiad
} from './data/questions.js';
import {
  ensureSeed, register, login, logout, currentUser, getAllStudents
} from './auth.js';
import {
  loadProgress, recordAnswer, clearError, saveTestResult,
  saveDiagnostic, getWeakTopics, getRecommendations, ACHIEVEMENTS
} from './progress.js';
import { getDashboardData, assignTask, classAverages } from './teacher.js';

ensureSeed();

const app = document.getElementById('app');
let state = {
  view: 'home',
  user: currentUser(),
  topicId: null,
  mode: null, // theory | practice | quiz
  session: null // active quiz/practice session
};

window.addEventListener('hashchange', () => route());
document.addEventListener('DOMContentLoaded', () => route());

function route() {
  state.user = currentUser();
  const hash = (location.hash || '#/').slice(2);
  const [path, ...rest] = hash.split('/');
  if (!path || path === 'home') {
    state.view = state.user ? (state.user.role === 'teacher' ? 'teacher' : 'cabinet') : 'welcome';
  } else if (path === 'login') state.view = 'login';
  else if (path === 'register') state.view = 'register';
  else if (path === 'logout') { logout(); location.hash = '#/'; return; }
  else if (!state.user) { location.hash = '#/login'; return; }
  else if (path === 'cabinet') state.view = 'cabinet';
  else if (path === 'lessons') state.view = 'lessons';
  else if (path === 'topic') { state.view = 'topic'; state.topicId = rest[0]; state.mode = rest[1] || 'theory'; }
  else if (path === 'tasks') state.view = 'tasks';
  else if (path === 'tests') state.view = 'tests';
  else if (path === 'reading') state.view = 'reading';
  else if (path === 'pisa') state.view = 'pisa';
  else if (path === 'olympiad') state.view = 'olympiad';
  else if (path === 'errors') state.view = 'errors';
  else if (path === 'results') state.view = 'results';
  else if (path === 'achievements') state.view = 'achievements';
  else if (path === 'diagnostic') state.view = 'diagnostic';
  else if (path === 'teacher') state.view = 'teacher';
  else if (path === 'play') { state.view = 'play'; }
  else state.view = 'cabinet';
  render();
}

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstChild;
}

function headerHTML() {
  const u = state.user;
  let right = '';
  if (u) {
    const p = loadProgress(u.id);
    right = `
      <span class="xp-badge">⭐ ${p.xp} XP</span>
      <span class="muted" style="color:#fff;opacity:.9">${u.name}</span>
      <button class="btn btn-gold btn-sm" data-nav="logout">Шығу</button>`;
  } else {
    right = `
      <button class="btn btn-outline btn-sm" style="border-color:#fff;color:#fff" data-nav="login">Кіру</button>
      <button class="btn btn-gold btn-sm" data-nav="register">Тіркелу</button>`;
  }
  return `
    <header class="app-header">
      <div class="inner">
        <div class="brand" data-nav="home" style="cursor:pointer">
          <div class="brand-mark">Қ</div>
          <div>
            <h1>ҚАЗАҚ ТІЛІ PRO</h1>
            <div class="school">${SCHOOL}</div>
          </div>
        </div>
        <div class="header-actions">${right}</div>
      </div>
    </header>`;
}

function footerHTML() {
  return `<footer class="footer"><span class="gold">${SCHOOL}</span><br>Қазақ тілі · 5–9 сынып · Интерактивті оқу платформасы</footer>`;
}

function schoolBanner() {
  return `<div class="school-banner"><strong>${SCHOOL_UPPER}</strong></div>`;
}

function render() {
  let body = '';
  switch (state.view) {
    case 'welcome': body = viewWelcome(); break;
    case 'login': body = viewLogin(); break;
    case 'register': body = viewRegister(); break;
    case 'cabinet': body = viewCabinet(); break;
    case 'lessons': body = viewLessons(); break;
    case 'topic': body = viewTopic(); break;
    case 'tasks': body = viewTasks(); break;
    case 'tests': body = viewTests(); break;
    case 'reading': body = viewReading(); break;
    case 'pisa': body = viewPisa(); break;
    case 'olympiad': body = viewOlympiad(); break;
    case 'errors': body = viewErrors(); break;
    case 'results': body = viewResults(); break;
    case 'achievements': body = viewAchievements(); break;
    case 'diagnostic': body = viewDiagnostic(); break;
    case 'teacher': body = viewTeacher(); break;
    case 'play': body = viewPlay(); break;
    default: body = viewWelcome();
  }
  app.innerHTML = headerHTML() + `<main>${schoolBanner()}${body}</main>` + footerHTML();
  bindGlobal();
  bindView();
}

function bindGlobal() {
  app.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = btn.getAttribute('data-nav');
      if (n === 'logout') { logout(); location.hash = '#/'; return; }
      if (n === 'home') location.hash = '#/';
      else location.hash = '#/' + n;
    });
  });
}

function bindView() {
  if (state.view === 'login') bindLogin();
  if (state.view === 'register') bindRegister();
  if (state.view === 'lessons') { /* open-topic via delegated click */ }
  if (state.view === 'topic') bindTopic();
  if (state.view === 'tasks') bindTasks();
  if (state.view === 'tests') bindTests();
  if (state.view === 'reading') bindSessionStart('reading');
  if (state.view === 'pisa') bindSessionStart('pisa');
  if (state.view === 'olympiad') bindOlympiad();
  if (state.view === 'errors') bindErrors();
  if (state.view === 'diagnostic') bindDiagnostic();
  if (state.view === 'teacher') bindTeacher();
  if (state.view === 'play') bindPlay();
  if (state.view === 'cabinet') bindCabinet();
}

/* ——— Views ——— */
function viewWelcome() {
  return `
    <div class="hero card">
      <h2>Қош келдіңіз!</h2>
      <p>Қазақ тілін интерактивті түрде үйреніңіз: теория, тапсырмалар, тесттер, PISA, олимпиада және қателермен жұмыс.</p>
      <div class="flex" style="justify-content:center">
        <button class="btn btn-primary" data-nav="login">Кіру</button>
        <button class="btn btn-gold" data-nav="register">Тіркелу</button>
      </div>
      <p class="form-hint">Демо: student140 / 140qazaq · teacher140 / 140teacher</p>
    </div>
    <div class="grid grid-3">
      <div class="card"><h3>📚 Сабақтар</h3><p class="muted">5–9 сыныптың барлық тақырыптары</p></div>
      <div class="card"><h3>🧠 PISA</h3><p class="muted">Өмірлік жағдаяттар мен талдау</p></div>
      <div class="card"><h3>🏆 Олимпиада</h3><p class="muted">Төрт деңгейлі күрделі тапсырмалар</p></div>
    </div>`;
}

function viewLogin() {
  return `
    <div class="auth-wrap card">
      <h2>Кіру</h2>
      <div class="form-group"><label>Логин</label><input id="login-name" autocomplete="username"></div>
      <div class="form-group"><label>Құпия сөз</label><input id="login-pass" type="password" autocomplete="current-password"></div>
      <div class="form-error hidden" id="login-err"></div>
      <button class="btn btn-primary btn-block" id="login-btn">Кіру</button>
      <p class="form-hint">Аккаунтыңыз жоқ па? <a href="#/register">Тіркелу</a></p>
    </div>`;
}

function viewRegister() {
  return `
    <div class="auth-wrap card">
      <h2>Тіркелу</h2>
      <div class="form-group"><label>Аты-жөні</label><input id="reg-name"></div>
      <div class="form-group"><label>Сыныбы</label>
        <select id="reg-grade">${[5,6,7,8,9].map(g => `<option value="${g}">${g}-сынып</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Логин</label><input id="reg-login"></div>
      <div class="form-group"><label>Құпия сөз</label><input id="reg-pass" type="password"></div>
      <div class="form-error hidden" id="reg-err"></div>
      <button class="btn btn-primary btn-block" id="reg-btn">Тіркелу</button>
      <p class="form-hint">Аккаунтыңыз бар ма? <a href="#/login">Кіру</a></p>
    </div>`;
}

function viewCabinet() {
  const u = state.user;
  if (u.role === 'teacher') { location.hash = '#/teacher'; return ''; }
  const p = loadProgress(u.id);
  const topics = getTopicsByGrade(u.grade);
  const weak = getWeakTopics(u.id, topics);
  const rec = getRecommendations(u.id, topics);
  const needDiag = !p.diagnosticDone;

  const menu = [
    { nav: 'lessons', icon: '📘', label: 'Менің сабақтарым' },
    { nav: 'tasks', icon: '✏️', label: 'Тақырыптық тапсырмалар' },
    { nav: 'tests', icon: '📝', label: 'Тесттер' },
    { nav: 'reading', icon: '📖', label: 'Оқу сауаттылығы' },
    { nav: 'pisa', icon: '🌍', label: 'PISA' },
    { nav: 'olympiad', icon: '🏅', label: 'Олимпиада' },
    { nav: 'errors', icon: '🔧', label: 'Қателермен жұмыс' },
    { nav: 'results', icon: '📊', label: 'Менің нәтижелерім' },
    { nav: 'achievements', icon: '⭐', label: 'Жетістіктерім' }
  ];

  let asg = '';
  if (p.assignments && p.assignments.length) {
    asg = `<div class="card"><h3>Мұғалім тапсырмалары</h3>
      <ul class="topic-list">${p.assignments.slice(0,5).map(a => `
        <li><button data-start-asg="${a.topicId}" data-count="${a.count}" data-limit="${a.timeLimit}">
          <span>${a.topicTitle || a.topicId} · ${a.count} тапсырма · ${a.timeLimit} мин</span>
          <span class="meta">${a.status === 'new' ? 'Жаңа' : ''}</span>
        </button></li>`).join('')}</ul></div>`;
  }

  return `
    <div class="card">
      <h2>Сәлем, ${u.name}!</h2>
      <p class="muted">${u.grade}-сынып · Қиындық деңгейі: <strong>${diffLabel(p.difficulty)}</strong></p>
      <div class="stat-cards mt">
        <div class="stat-card"><div class="num">${p.xp}</div><div class="lbl">XP</div></div>
        <div class="stat-card"><div class="num">${p.correctTotal}</div><div class="lbl">Дұрыс</div></div>
        <div class="stat-card"><div class="num">${p.errors.length}</div><div class="lbl">Қателер</div></div>
        <div class="stat-card"><div class="num">${p.achievements.length}</div><div class="lbl">Жетістік</div></div>
      </div>
      <p class="mt">${rec}</p>
      ${needDiag ? `<button class="btn btn-gold mt" data-nav="diagnostic">Бастапқы диагностиканы өту</button>` : ''}
      ${weak.length ? `<p class="muted mt">Әлсіз тақырыптар: ${weak.slice(0,3).map(w => w.title).join(', ')}</p>` : ''}
    </div>
    ${asg}
    <div class="menu-grid">
      ${menu.map(m => `<button class="menu-btn" data-nav="${m.nav}"><span class="icon">${m.icon}</span><span class="label">${m.label}</span></button>`).join('')}
    </div>`;
}

function diffLabel(d) {
  return d === 'hard' ? 'Күрделі' : d === 'easy' ? 'Жеңіл' : 'Орташа';
}

function viewLessons() {
  const u = state.user;
  const grouped = getTopicsGrouped(u.grade);
  const p = loadProgress(u.id);
  let html = `<div class="card flex-between"><h2>Менің сабақтарым · ${u.grade}-сынып</h2>
    <button class="btn btn-outline btn-sm" data-nav="cabinet">← Кабинет</button></div>`;
  for (const [sec, list] of Object.entries(grouped)) {
    html += `<div class="card topic-section"><h3>${SECTIONS[sec] || sec}</h3><ul class="topic-list">`;
    for (const t of list) {
      const st = p.topicStats[t.id];
      const total = st ? st.correct + st.wrong : 0;
      const pct = total ? Math.round(100 * st.correct / total) : 0;
      html += `<li><button data-open-topic="${t.id}">
        <span>${t.title}</span>
        <span class="meta">${total ? pct + '%' : 'Жаңа'}</span>
      </button></li>`;
    }
    html += `</ul></div>`;
  }
  return html;
}

function viewTopic() {
  const t = getTopicById(state.topicId);
  if (!t || t.grade !== state.user.grade) {
    return `<div class="card"><p>Тақырып табылмады.</p><button class="btn btn-outline" data-nav="lessons">Артқа</button></div>`;
  }
  const mode = state.mode || 'theory';
  let content = '';
  if (mode === 'theory') {
    content = `<div class="theory-box">${escapeHtml(t.theory)}</div>
      <div class="flex">
        <button class="btn btn-primary" data-topic-mode="practice">Практикаға өту</button>
        <button class="btn btn-gold" data-topic-mode="quiz">Тест (10 сұрақ)</button>
      </div>`;
  } else {
    content = `<div id="session-root"><p class="muted">Жүктелуде…</p></div>`;
  }
  return `
    <div class="card">
      <div class="flex-between">
        <div>
          <p class="muted">${SECTIONS[t.section] || ''} · ${t.grade}-сынып</p>
          <h2>${t.title}</h2>
        </div>
        <button class="btn btn-outline btn-sm" data-nav="lessons">← Сабақтар</button>
      </div>
      <div class="tabs mt">
        <button class="${mode==='theory'?'active':''}" data-topic-mode="theory">Теория</button>
        <button class="${mode==='practice'?'active':''}" data-topic-mode="practice">Практика</button>
        <button class="${mode==='quiz'?'active':''}" data-topic-mode="quiz">Тест</button>
      </div>
      ${content}
    </div>`;
}

function viewTasks() {
  const u = state.user;
  const topics = getTopicsByGrade(u.grade);
  return `
    <div class="card flex-between">
      <h2>Тақырыптық тапсырмалар</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">← Кабинет</button>
    </div>
    <div class="card">
      <p class="muted mb">Тақырыпты таңдап, араластырылған тапсырмаларды орындаңыз.</p>
      <div class="form-group"><label>Тақырып</label>
        <select id="task-topic">${topics.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Саны</label>
        <select id="task-count"><option>10</option><option selected>15</option><option>20</option></select>
      </div>
      <button class="btn btn-primary" id="task-start">Бастау</button>
    </div>`;
}

function viewTests() {
  const u = state.user;
  const topics = getTopicsByGrade(u.grade);
  const types = ['тақырыптық','аралық','тоқсандық','қорытынды','сауаттылық','PISA','олимпиада'];
  return `
    <div class="card flex-between"><h2>Тесттер</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">← Кабинет</button></div>
    <div class="card">
      <div class="form-group"><label>Тест түрі</label>
        <select id="test-type">${types.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
      </div>
      <div class="form-group" id="test-topic-wrap"><label>Тақырып (тақырыптық үшін)</label>
        <select id="test-topic">${topics.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary" id="test-start">Тестті бастау</button>
    </div>`;
}

function viewReading() {
  return `
    <div class="card flex-between"><h2>Оқу сауаттылығы</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">←</button></div>
    <div class="card">
      <p>Ақпараттық, ғылыми-көпшілік, публицистикалық, көркем мәтіндер және өмірлік жағдаяттар.</p>
      <p class="muted mb">Дағдылар: негізгі ой, ақпарат табу, салыстыру, факт/пікір, дәлел.</p>
      <button class="btn btn-primary" id="start-reading">Бастау</button>
    </div>`;
}

function viewPisa() {
  return `
    <div class="card flex-between"><h2>ҚАЗАҚ ТІЛІ PISA</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">←</button></div>
    <div class="card">
      <p>Өмірлік жағдаяттар: кесте, хабарландыру, жарнама, екі мәтінді салыстыру, диаграмма.</p>
      <p class="muted mb">Дағдылар: түсіну, қолдану, талдау, салыстыру, бағалау, дәлелдеу.</p>
      <button class="btn btn-primary" id="start-pisa">PISA тапсырмаларын бастау</button>
    </div>`;
}

function viewOlympiad() {
  const levels = ['Жеңіл','Орташа','Күрделі','Олимпиадалық'];
  return `
    <div class="card flex-between"><h2>Олимпиада</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">←</button></div>
    <div class="card">
      <p class="mb">Логика, грамматика, терең талдау, қате табу, тыныс белгілері.</p>
      <div class="menu-grid">
        ${levels.map(l => `<button class="menu-btn" data-olymp="${l}"><span class="icon">🏅</span><span class="label">${l}</span></button>`).join('')}
      </div>
    </div>`;
}

function viewErrors() {
  const p = loadProgress(state.user.id);
  if (!p.errors.length) {
    return `<div class="card"><h2>Қателермен жұмыс</h2><p>Қателер жоқ — жарайсың!</p>
      <button class="btn btn-outline" data-nav="cabinet">←</button></div>`;
  }
  return `
    <div class="card flex-between"><h2>Қателермен жұмыс (${p.errors.length})</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">←</button></div>
    ${p.errors.slice(0, 20).map(e => {
      const qtext = e.qObj ? e.qObj.question : (typeof e.question === 'string' ? e.question : JSON.stringify(e.question));
      return `<div class="card" data-err="${e.id}">
        <p><strong>Сұрақ:</strong> ${escapeHtml(String(qtext).slice(0, 300))}</p>
        <p><strong>Сіздің жауабыңыз:</strong> <span style="color:var(--danger)">${escapeHtml(String(e.userAnswer || ''))}</span></p>
        <p><strong>Дұрыс жауап:</strong> <span style="color:var(--success)">${escapeHtml(String(e.correctAnswer || (e.qObj && e.qObj.correct) || ''))}</span></p>
        <p class="muted"><strong>Ереже:</strong> ${escapeHtml(e.rule || (e.qObj && e.qObj.rule) || 'Қайталап көріңіз.')}</p>
        <div class="flex mt">
          <button class="btn btn-primary btn-sm" data-similar="${e.topicId}" data-err-id="${e.id}">Ұқсас тапсырма</button>
          <button class="btn btn-outline btn-sm" data-clear-err="${e.id}">Түсіндім</button>
        </div>
      </div>`;
    }).join('')}`;
}

function viewResults() {
  const p = loadProgress(state.user.id);
  const topics = getTopicsByGrade(state.user.grade);
  const weak = getWeakTopics(state.user.id, topics);
  let charts = '';
  const entries = Object.entries(p.topicStats).slice(0, 12);
  if (entries.length) {
    charts = `<div class="card"><h3>Тақырыптық прогресс</h3><div class="chart-bars">
      ${entries.map(([id, st]) => {
        const t = getTopicById(id);
        const total = st.correct + st.wrong;
        const pct = total ? Math.round(100 * st.correct / total) : 0;
        return `<div class="chart-row"><span>${(t && t.title) || id}</span>
          <div class="bar"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>`;
      }).join('')}
    </div></div>`;
  }
  return `
    <div class="card flex-between"><h2>Менің нәтижелерім</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">←</button></div>
    <div class="stat-cards mb">
      <div class="stat-card"><div class="num">${p.xp}</div><div class="lbl">XP</div></div>
      <div class="stat-card"><div class="num">${p.correctTotal}</div><div class="lbl">Дұрыс</div></div>
      <div class="stat-card"><div class="num">${p.wrongTotal}</div><div class="lbl">Қате</div></div>
      <div class="stat-card"><div class="num">${diffLabel(p.difficulty)}</div><div class="lbl">Деңгей</div></div>
    </div>
    ${charts}
    <div class="card"><h3>Соңғы тесттер</h3>
      ${!(p.results||[]).length ? '<p class="muted">Әлі тест жоқ.</p>' :
        `<table class="data"><thead><tr><th>Түрі</th><th>Балл</th><th>%</th><th>Уақыт</th></tr></thead><tbody>
        ${p.results.slice(0,15).map(r => `<tr>
          <td>${r.title || r.category || ''}</td>
          <td>${r.score}/${r.total}</td>
          <td>${r.percent}%</td>
          <td>${r.timeSec || 0} с</td>
        </tr>`).join('')}
        </tbody></table>`}
    </div>
    ${weak.length ? `<div class="card"><h3>Әлсіз тақырыптар</h3>
      <p>${getRecommendations(state.user.id, topics)}</p>
      <ul>${weak.slice(0,5).map(w => `<li>${w.title} — ${Math.round(w.rate*100)}%</li>`).join('')}</ul>
    </div>` : ''}`;
}

function viewAchievements() {
  const p = loadProgress(state.user.id);
  return `
    <div class="card flex-between"><h2>Жетістіктерім</h2>
      <button class="btn btn-outline btn-sm" data-nav="cabinet">←</button></div>
    <div class="ach-grid">
      ${ACHIEVEMENTS.map(a => {
        const unlocked = p.achievements.includes(a.id);
        return `<div class="ach-card ${unlocked ? '' : 'locked'}">
          <div class="ico">${a.icon}</div>
          <div class="ttl">${a.title}</div>
          <div class="muted" style="font-size:.8rem">${a.desc}</div>
          <div class="mt">${unlocked ? '✅ Ашылды' : '🔒 Жабық'}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function viewDiagnostic() {
  return `
    <div class="card"><h2>Бастапқы диагностика</h2>
      <p class="mb">Грамматика, лексика, синтаксис, мәтін және сауаттылық деңгейіңізді анықтаймыз (12 сұрақ).</p>
      <button class="btn btn-primary" id="diag-start">Бастау</button>
      <div id="session-root" class="mt"></div>
    </div>`;
}

function viewTeacher() {
  if (state.user.role !== 'teacher') {
    return `<div class="card"><p>Тек мұғалімдерге арналған.</p></div>`;
  }
  const data = getDashboardData();
  const avg = classAverages(data.students);
  const topicsOpts = [5,6,7,8,9].map(g => {
    const ts = getTopicsByGrade(g);
    return ts.map(t => `<option value="${g}|${t.id}|${t.title}">${g}-сынып: ${t.title}</option>`).join('');
  }).join('');

  return `
    <div class="card">
      <h2>Мұғалім панелі · ${state.user.name}</h2>
      <p class="muted">${SCHOOL}</p>
      <div class="stat-cards mt">
        <div class="stat-card"><div class="num">${data.students.length}</div><div class="lbl">Оқушы</div></div>
        <div class="stat-card"><div class="num">${avg.avgXp}</div><div class="lbl">Орт. XP</div></div>
        <div class="stat-card"><div class="num">${avg.avgPercent}%</div><div class="lbl">Соңғы тест</div></div>
        <div class="stat-card"><div class="num">${avg.avgCorrect}</div><div class="lbl">Орт. дұрыс</div></div>
      </div>
    </div>
    <div class="card">
      <h3>Оқушылар</h3>
      <table class="data"><thead><tr><th>Аты</th><th>Сынып</th><th>XP</th><th>Дұрыс</th><th>Қате</th><th>Жетістік</th></tr></thead>
      <tbody>
        ${data.students.map(r => `<tr>
          <td>${escapeHtml(r.student.name)}</td>
          <td>${r.student.grade}</td>
          <td>${r.progress.xp}</td>
          <td>${r.progress.correctTotal}</td>
          <td>${r.progress.wrongTotal}</td>
          <td>${r.progress.achievements.length}</td>
        </tr>`).join('') || '<tr><td colspan="6">Оқушы жоқ</td></tr>'}
      </tbody></table>
    </div>
    <div class="grid grid-2">
      <div class="card"><h3>Әлсіз тақырыптар</h3>
        ${data.weakTopics.length ? `<ul>${data.weakTopics.map(w => `<li>${w.grade}-сынып: ${w.title} (${w.count} оқушы)</li>`).join('')}</ul>` : '<p class="muted">Дерек аз.</p>'}
      </div>
      <div class="card"><h3>Жиі қателер</h3>
        ${data.frequentErrors.length ? `<ul>${data.frequentErrors.map(e => `<li>${escapeHtml(e.q.slice(0,60))}… — ${e.count}</li>`).join('')}</ul>` : '<p class="muted">Қате жоқ.</p>'}
      </div>
    </div>
    <div class="card">
      <h3>Тапсырма беру</h3>
      <div class="form-group"><label>Тақырып</label><select id="asg-topic">${topicsOpts}</select></div>
      <div class="form-group"><label>Саны</label><input id="asg-count" type="number" value="10" min="5" max="30"></div>
      <div class="form-group"><label>Уақыт шегі (мин)</label><input id="asg-time" type="number" value="15" min="5" max="60"></div>
      <button class="btn btn-primary" id="asg-send">Тапсырманы жіберу</button>
      <p class="form-hint" id="asg-msg"></p>
    </div>`;
}

function viewPlay() {
  return `<div class="card"><div id="session-root"></div></div>`;
}

/* ——— Bindings ——— */
function bindLogin() {
  document.getElementById('login-btn').onclick = () => {
    const r = login(document.getElementById('login-name').value, document.getElementById('login-pass').value);
    const err = document.getElementById('login-err');
    if (!r.ok) { err.textContent = r.error; err.classList.remove('hidden'); return; }
    location.hash = r.user.role === 'teacher' ? '#/teacher' : '#/cabinet';
  };
}

function bindRegister() {
  document.getElementById('reg-btn').onclick = () => {
    const r = register({
      name: document.getElementById('reg-name').value,
      grade: document.getElementById('reg-grade').value,
      login: document.getElementById('reg-login').value,
      password: document.getElementById('reg-pass').value
    });
    const err = document.getElementById('reg-err');
    if (!r.ok) { err.textContent = r.error; err.classList.remove('hidden'); return; }
    login(document.getElementById('reg-login').value, document.getElementById('reg-pass').value);
    location.hash = '#/diagnostic';
  };
}

function bindCabinet() {
  app.querySelectorAll('[data-start-asg]').forEach(btn => {
    btn.onclick = () => startSession({
      questions: getShuffledPractice(btn.dataset.startAsg, Number(btn.dataset.count) || 10),
      title: 'Мұғалім тапсырмасы',
      category: 'assignment',
      timeLimitSec: (Number(btn.dataset.limit) || 15) * 60,
      topicId: btn.dataset.startAsg
    });
  });
}

function bindTopic() {
  app.querySelectorAll('[data-open-topic]').forEach(b => {
    b.onclick = () => { location.hash = `#/topic/${b.dataset.openTopic}/theory`; };
  });
  app.querySelectorAll('[data-topic-mode]').forEach(b => {
    b.onclick = () => {
      const mode = b.dataset.topicMode;
      location.hash = `#/topic/${state.topicId}/${mode}`;
    };
  });
  // if practice/quiz — start session into #session-root
  if (state.mode === 'practice' || state.mode === 'quiz') {
    const p = loadProgress(state.user.id);
    const qs = state.mode === 'quiz'
      ? getQuiz(state.topicId, 10)
      : getShuffledPractice(state.topicId, 15, p.difficulty);
    const root = document.getElementById('session-root');
    if (root) runSession(root, {
      questions: qs,
      title: state.mode === 'quiz' ? 'Тақырыптық тест' : 'Практика',
      category: state.mode === 'quiz' ? 'quiz' : 'practice',
      topicId: state.topicId
    });
  }
  // lessons list open
  document.querySelectorAll('[data-open-topic]').forEach(b => {
    b.onclick = () => location.hash = `#/topic/${b.dataset.openTopic}/theory`;
  });
}

function bindTasks() {
  // also bind lesson opens from lessons view — handled in bindTopic via lessons
  document.querySelectorAll('[data-open-topic]').forEach(b => {
    b.onclick = () => location.hash = `#/topic/${b.dataset.openTopic}/theory`;
  });
  const btn = document.getElementById('task-start');
  if (btn) btn.onclick = () => {
    const tid = document.getElementById('task-topic').value;
    const count = Number(document.getElementById('task-count').value);
    const p = loadProgress(state.user.id);
    startSession({
      questions: getShuffledPractice(tid, count, p.difficulty),
      title: 'Тақырыптық тапсырмалар',
      category: 'practice',
      topicId: tid
    });
  };
}

function bindTests() {
  document.getElementById('test-start').onclick = () => {
    const type = document.getElementById('test-type').value;
    const topicId = document.getElementById('test-topic').value;
    let qs = [];
    if (type === 'сауаттылық') qs = getReadingLiteracy(state.user.grade).slice(0, 10);
    else if (type === 'PISA') qs = getPISAItems().slice(0, 10);
    else if (type === 'олимпиада') qs = getOlympiad('Орташа');
    else qs = getTestByType(state.user.grade, type, topicId);
    startSession({
      questions: qs,
      title: type + ' тест',
      category: type,
      topicId: type === 'тақырыптық' ? topicId : null,
      timeLimitSec: type === 'қорытынды' ? 2400 : type === 'тоқсандық' ? 1800 : 900
    });
  };
}

function bindSessionStart(kind) {
  const id = kind === 'reading' ? 'start-reading' : 'start-pisa';
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.onclick = () => {
    const qs = kind === 'reading'
      ? getReadingLiteracy(state.user.grade).slice(0, 10)
      : getPISAItems().slice(0, 12);
    startSession({
      questions: qs,
      title: kind === 'reading' ? 'Оқу сауаттылығы' : 'ҚАЗАҚ ТІЛІ PISA',
      category: kind,
      timeLimitSec: 1200
    });
  };
}

function bindOlympiad() {
  app.querySelectorAll('[data-olymp]').forEach(b => {
    b.onclick = () => {
      const level = b.dataset.olymp;
      startSession({
        questions: getOlympiad(level),
        title: 'Олимпиада · ' + level,
        category: 'olympiad',
        timeLimitSec: level === 'Олимпиадалық' ? 1800 : 900
      });
    };
  });
}

function bindErrors() {
  app.querySelectorAll('[data-clear-err]').forEach(b => {
    b.onclick = () => { clearError(state.user.id, b.dataset.clearErr); route(); };
  });
  app.querySelectorAll('[data-similar]').forEach(b => {
    b.onclick = () => {
      const q = getSimilarQuestion(b.dataset.similar, b.dataset.errId);
      if (!q) return;
      startSession({
        questions: [q],
        title: 'Ұқсас тапсырма',
        category: 'remedial',
        topicId: b.dataset.similar
      });
    };
  });
}

function bindDiagnostic() {
  document.getElementById('diag-start').onclick = () => {
    const qs = getDiagnosticQuestions(state.user.grade);
    const root = document.getElementById('session-root');
    runSession(root, {
      questions: qs,
      title: 'Бастапқы диагностика',
      category: 'diagnostic',
      onComplete: (summary) => {
        const bySec = {};
        for (const item of summary.details) {
          const sec = item.q.diagSection || 'other';
          if (!bySec[sec]) bySec[sec] = { c: 0, t: 0 };
          bySec[sec].t++;
          if (item.ok) bySec[sec].c++;
        }
        const levels = {};
        for (const [sec, v] of Object.entries(bySec)) {
          const pct = Math.round(100 * v.c / v.t);
          levels[sec] = pct >= 75 ? 'Жоғары' : pct >= 45 ? 'Орташа' : 'Төмен';
        }
        saveDiagnostic(state.user.id, { percent: summary.percent, levels, at: Date.now() });
        const weak = Object.entries(levels).filter(([, v]) => v === 'Төмен').map(([k]) => SECTIONS[k] || k);
        root.insertAdjacentHTML('beforeend', `
          <div class="card mt">
            <h3>Диагностика нәтижесі</h3>
            <p>Жалпы: <strong>${summary.percent}%</strong></p>
            <ul>${Object.entries(levels).map(([k,v]) => `<li>${SECTIONS[k]||k}: ${v}</li>`).join('')}</ul>
            <p>${weak.length ? 'Ұсыныс: ' + weak.join(', ') + ' бөлімдерін қайталаңыз.' : 'Жақсы бастама! Сабақтарға өтіңіз.'}</p>
            <button class="btn btn-primary" data-nav="cabinet">Кабинетке</button>
          </div>`);
        bindGlobal();
      }
    });
  };
}

function bindTeacher() {
  const btn = document.getElementById('asg-send');
  if (!btn) return;
  btn.onclick = () => {
    const raw = document.getElementById('asg-topic').value.split('|');
    const r = assignTask({
      grade: raw[0],
      topicId: raw[1],
      topicTitle: raw[2],
      count: document.getElementById('asg-count').value,
      timeLimit: document.getElementById('asg-time').value
    });
    document.getElementById('asg-msg').textContent = `${r.count} оқушыға тапсырма жіберілді.`;
  };
}

function bindPlay() {
  if (state.session) {
    const root = document.getElementById('session-root');
    runSession(root, state.session);
  }
}

/* ——— Session engine ——— */
function startSession(cfg) {
  state.session = cfg;
  location.hash = '#/play';
}

function runSession(root, cfg) {
  const questions = cfg.questions || [];
  if (!questions.length) {
    root.innerHTML = '<p>Сұрақтар табылмады.</p>';
    return;
  }
  let idx = 0;
  let score = 0;
  let attempts = 0;
  const details = [];
  const started = Date.now();
  let timerId = null;
  let remaining = cfg.timeLimitSec || 0;

  const topic = cfg.topicId ? getTopicById(cfg.topicId) : null;

  function tick() {
    if (!remaining) return;
    remaining--;
    const tEl = root.querySelector('.timer');
    if (tEl) tEl.textContent = formatTime(remaining);
    if (remaining <= 0) finish();
  }
  if (remaining) timerId = setInterval(tick, 1000);

  function renderQ() {
    const q = questions[idx];
    root.innerHTML = `
      <div class="flex-between mb">
        <h2>${escapeHtml(cfg.title || 'Тапсырма')}</h2>
        <div class="flex">
          ${remaining ? `<span class="timer">${formatTime(remaining)}</span>` : ''}
          <span class="muted">${idx + 1} / ${questions.length}</span>
        </div>
      </div>
      <div class="progress-bar"><span style="width:${Math.round(100*idx/questions.length)}%"></span></div>
      <div class="quiz-box mt">
        <div class="question">${escapeHtml(q.question)}</div>
        <div class="options">
          ${q.options.map((o, i) => `<button class="option-btn" data-opt="${escapeAttr(o)}">${escapeHtml(o)}</button>`).join('')}
        </div>
        <div id="fb"></div>
        <div class="flex mt hidden" id="next-wrap">
          <button class="btn btn-primary" id="next-btn">Келесі</button>
        </div>
      </div>`;
    root.querySelectorAll('.option-btn').forEach(btn => {
      btn.onclick = () => onAnswer(btn, q);
    });
  }

  function onAnswer(btn, q) {
    const chosen = btn.dataset.opt;
    const fb = root.querySelector('#fb');
    const buttons = [...root.querySelectorAll('.option-btn')];

    if (chosen === q.correct) {
      buttons.forEach(b => b.disabled = true);
      btn.classList.add('correct');
      fb.innerHTML = `<div class="feedback ok">Дұрыс! Жарайсың! Келесі тапсырмаға өт.</div>`;
      score++;
      attempts = 0;
      details.push({ q, ok: true, answer: chosen });
      const section = topic ? topic.section : (q.diagSection || '');
      recordAnswer(state.user.id, {
        topicId: q.topicId || cfg.topicId || 'general',
        correct: true,
        question: q,
        userAnswer: chosen,
        rule: q.rule,
        section
      });
      root.querySelector('#next-wrap').classList.remove('hidden');
      root.querySelector('#next-btn').onclick = next;
    } else {
      attempts++;
      btn.classList.add('wrong');
      btn.disabled = true;
      if (attempts < 2) {
        fb.innerHTML = `<div class="feedback bad">Бұл жауап қате. Қайта ойланып көр.</div>`;
      } else {
        buttons.forEach(b => {
          b.disabled = true;
          if (b.dataset.opt === q.correct) b.classList.add('correct');
        });
        fb.innerHTML = `<div class="feedback bad">Бұл жауап қате.</div>
          <div class="feedback info">Дұрыс жауап: <strong>${escapeHtml(q.correct)}</strong><br>${escapeHtml(q.rule || '')}</div>`;
        details.push({ q, ok: false, answer: chosen });
        recordAnswer(state.user.id, {
          topicId: q.topicId || cfg.topicId || 'general',
          correct: false,
          question: q,
          userAnswer: chosen,
          rule: q.rule,
          section: topic ? topic.section : ''
        });
        attempts = 0;
        root.querySelector('#next-wrap').classList.remove('hidden');
        root.querySelector('#next-btn').onclick = next;
      }
    }
  }

  function next() {
    idx++;
    attempts = 0;
    if (idx >= questions.length) finish();
    else renderQ();
  }

  function finish() {
    if (timerId) clearInterval(timerId);
    const timeSec = Math.round((Date.now() - started) / 1000);
    const total = questions.length;
    const percent = Math.round(100 * score / total);
    // strong/weak from details
    const topicHits = {};
    for (const d of details) {
      const tid = d.q.topicId || cfg.topicId || 'x';
      if (!topicHits[tid]) topicHits[tid] = { c: 0, t: 0 };
      topicHits[tid].t++;
      if (d.ok) topicHits[tid].c++;
    }
    const strong = [], weakT = [];
    for (const [tid, v] of Object.entries(topicHits)) {
      const t = getTopicById(tid);
      const name = (t && t.title) || tid;
      if (v.c / v.t >= 0.7) strong.push(name); else weakT.push(name);
    }

    const summary = { score, total, percent, timeSec, details, strong, weak: weakT };
    saveTestResult(state.user.id, {
      title: cfg.title,
      category: cfg.category,
      score, total, percent, timeSec,
      strongTopics: strong,
      weakTopics: weakT
    });

    root.innerHTML = `
      <h2>Нәтиже</h2>
      <div class="stat-cards mt">
        <div class="stat-card"><div class="num">${score}/${total}</div><div class="lbl">Балл</div></div>
        <div class="stat-card"><div class="num">${percent}%</div><div class="lbl">Пайыз</div></div>
        <div class="stat-card"><div class="num">${score}</div><div class="lbl">Дұрыс</div></div>
        <div class="stat-card"><div class="num">${total - score}</div><div class="lbl">Қате</div></div>
        <div class="stat-card"><div class="num">${timeSec} с</div><div class="lbl">Уақыт</div></div>
      </div>
      <div class="progress-bar mt"><span style="width:${percent}%"></span></div>
      ${strong.length ? `<p class="mt"><strong>Меңгерілген:</strong> ${strong.join(', ')}</p>` : ''}
      ${weakT.length ? `<p><strong>Әлсіз:</strong> ${weakT.join(', ')}</p>
        <p class="muted">Сізге «${weakT[0]}» тақырыбын қайталау ұсынылады.</p>` : ''}
      <div class="flex mt">
        <button class="btn btn-primary" data-nav="cabinet">Кабинет</button>
        <button class="btn btn-outline" data-nav="results">Нәтижелер</button>
        <button class="btn btn-outline" data-nav="errors">Қателермен жұмыс</button>
      </div>`;
    bindGlobal();
    if (typeof cfg.onComplete === 'function') cfg.onComplete(summary);
  }

  renderQ();
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}


document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-open-topic]');
  if (t) {
    e.preventDefault();
    location.hash = `#/topic/${t.dataset.openTopic}/theory`;
  }
});

route();
