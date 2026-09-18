'use strict';

const app = document.getElementById('app');
const state = {
  token: localStorage.getItem('qtp_token') || null,
  user: null,
  cache: {}
};

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`/api${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Қате орын алды');
  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  if (token) localStorage.setItem('qtp_token', token);
  else localStorage.removeItem('qtp_token');
}

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstChild;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}


function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('kk-KZ', {
      timeZone: 'Asia/Almaty',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso)) + ' (Алматы)';
  } catch (_) {
    return String(iso).slice(0, 19).replace('T', ' ');
  }
}

function levelLabel(l) {
  return ({ easy: 'жеңіл', medium: 'орташа', hard: 'күрделі' })[l] || l;
}

function topbar(title) {
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">ҚАЗАҚ ТІЛІ PRO<small>${escapeHtml(title || '')}</small></div>
        <button class="btn btn-sm btn-outline" id="btnLogout">Шығу</button>
      </div>
    </header>`;
}

function bindLogout() {
  const b = document.getElementById('btnLogout');
  if (b) b.onclick = async () => {
    try { await api('/auth/logout', { method: 'POST', body: '{}' }); } catch (_) {}
    setSession(null, null);
    route('home');
  };
}

// ---------------- HOME ----------------
function viewHome() {
  app.innerHTML = `
    <div class="home">
      <div class="card home-card center stack">
        <div class="school-kicker">Абылай хан атындағы №140 қазақ орта мектебі</div>
        <h1>ҚАЗАҚ ТІЛІ PRO</h1>
        <p class="sub">5–9 сыныпқа арналған қазақ тілі платформасы</p>
        <button class="btn btn-primary" id="goStudent">ОҚУШЫ РЕТІНДЕ КІРУ</button>
        <button class="btn btn-amber" id="goTeacher">МҰҒАЛІМ РЕТІНДЕ КІРУ</button>
      </div>
    </div>`;
  document.getElementById('goStudent').onclick = () => route('student-auth');
  document.getElementById('goTeacher').onclick = () => route('teacher-auth');
}

// ---------------- STUDENT AUTH ----------------
async function viewStudentAuth() {
  let classes = [];
  try {
    const data = await api('/classes');
    classes = data.classes || [];
  } catch (_) {}

  app.innerHTML = `
    <div class="wrap" style="padding-top:28px">
      <button class="btn btn-sm btn-ghost" id="back">← Басты бет</button>
      <div class="card stack" style="margin-top:14px">
        <h2>Оқушы</h2>
        <div class="tabs">
          <button class="tab active" data-tab="login">Кіру</button>
          <button class="tab" data-tab="reg">Тіркелу</button>
        </div>
        <div id="pane"></div>
        <div id="err"></div>
      </div>
    </div>`;
  document.getElementById('back').onclick = () => route('home');

  const pane = document.getElementById('pane');
  const err = document.getElementById('err');
  let mode = 'login';

  function render() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === mode));
    if (mode === 'login') {
      pane.innerHTML = `
        <div class="stack">
          <div class="field"><label>Логин</label><input id="login" autocomplete="username" /></div>
          <div class="field"><label>Құпиясөз</label><input id="password" type="password" autocomplete="current-password" /></div>
          <button class="btn btn-primary" id="submit">Кіру</button>
        </div>`;
      document.getElementById('submit').onclick = async () => {
        err.innerHTML = '';
        try {
          const data = await api('/auth/login-student', {
            method: 'POST',
            body: JSON.stringify({
              login: document.getElementById('login').value.trim(),
              password: document.getElementById('password').value
            })
          });
          setSession(data.token, data.user);
          route('student');
        } catch (e) { err.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`; }
      };
    } else {
      const opts = classes.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      pane.innerHTML = `
        <div class="stack">
          <div class="field"><label>Аты-жөні</label><input id="name" /></div>
          <div class="field"><label>Сынып</label><select id="classId">${opts}</select></div>
          <div class="field"><label>Логин</label><input id="login" autocomplete="username" /></div>
          <div class="field"><label>Құпиясөз</label><input id="password" type="password" /></div>
          <div class="field"><label>Құпиясөзді қайталау</label><input id="password2" type="password" /></div>
          <button class="btn btn-primary" id="submit">Тіркелу</button>
        </div>`;
      document.getElementById('submit').onclick = async () => {
        err.innerHTML = '';
        const p1 = document.getElementById('password').value;
        const p2 = document.getElementById('password2').value;
        if (p1 !== p2) { err.innerHTML = `<div class="error">Құпиясөздер сәйкес емес</div>`; return; }
        try {
          const data = await api('/auth/register-student', {
            method: 'POST',
            body: JSON.stringify({
              name: document.getElementById('name').value.trim(),
              classId: Number(document.getElementById('classId').value),
              login: document.getElementById('login').value.trim(),
              password: p1
            })
          });
          setSession(data.token, data.user);
          route('student');
        } catch (e) { err.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`; }
      };
    }
  }
  document.querySelectorAll('.tab').forEach((t) => t.onclick = () => { mode = t.dataset.tab; render(); });
  render();
}

// ---------------- TEACHER AUTH ----------------
function viewTeacherAuth() {
  app.innerHTML = `
    <div class="wrap" style="padding-top:28px">
      <button class="btn btn-sm btn-ghost" id="back">← Басты бет</button>
      <div class="card stack" style="margin-top:14px">
        <h2>Мұғалім</h2>
        <div class="tabs">
          <button class="tab active" data-tab="login">Кіру</button>
          <button class="tab" data-tab="reg">Тіркелу</button>
        </div>
        <div id="pane"></div>
        <div id="err"></div>
      </div>
    </div>`;
  document.getElementById('back').onclick = () => route('home');
  const pane = document.getElementById('pane');
  const err = document.getElementById('err');
  let mode = 'login';

  function render() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === mode));
    if (mode === 'login') {
      pane.innerHTML = `
        <div class="stack">
          <div class="field"><label>Логин</label><input id="login" /></div>
          <div class="field"><label>Құпиясөз</label><input id="password" type="password" /></div>
          <button class="btn btn-amber" id="submit">Кіру</button>
        </div>`;
      document.getElementById('submit').onclick = async () => {
        err.innerHTML = '';
        try {
          const data = await api('/auth/login-teacher', {
            method: 'POST',
            body: JSON.stringify({
              login: document.getElementById('login').value.trim(),
              password: document.getElementById('password').value
            })
          });
          setSession(data.token, data.user);
          route('teacher');
        } catch (e) { err.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`; }
      };
    } else {
      pane.innerHTML = `
        <div class="stack">
          <div class="field"><label>Аты-жөні</label><input id="name" /></div>
          <div class="field"><label>Логин</label><input id="login" /></div>
          <div class="field"><label>Құпиясөз</label><input id="password" type="password" /></div>
          <div class="field"><label>Мектеп коды</label><input id="schoolCode" placeholder="Мектеп коды" /></div>
          <button class="btn btn-amber" id="submit">Тіркелу</button>
        </div>`;
      document.getElementById('submit').onclick = async () => {
        err.innerHTML = '';
        try {
          const data = await api('/auth/register-teacher', {
            method: 'POST',
            body: JSON.stringify({
              name: document.getElementById('name').value.trim(),
              login: document.getElementById('login').value.trim(),
              password: document.getElementById('password').value,
              schoolCode: document.getElementById('schoolCode').value.trim()
            })
          });
          setSession(data.token, data.user);
          route('teacher');
        } catch (e) { err.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`; }
      };
    }
  }
  document.querySelectorAll('.tab').forEach((t) => t.onclick = () => { mode = t.dataset.tab; render(); });
  render();
}

// ---------------- STUDENT CABINET ----------------
const STUDENT_MENU = [
  { id: 'lessons', title: 'Менің сабақтарым', desc: 'Тақырыптар' },
  { id: 'tasks', title: 'Тапсырмалар', desc: 'Жаттығулар' },
  { id: 'tests', title: 'Тесттер', desc: 'Қысқа тест' },
  { id: 'olympiad', title: 'Олимпиада', desc: 'Деңгейлер' },
  { id: 'reading', title: 'Оқу сауаттылығы', desc: 'Мәтін' },
  { id: 'pisa', title: 'PISA', desc: 'Тапсырмалар' },
  { id: 'mistakes', title: 'Қатемен жұмыс', desc: 'Түзету' },
  { id: 'results', title: 'Нәтижелерім', desc: 'Тарих' },
  { id: 'progress', title: 'Прогресс', desc: 'Даму' },
  { id: 'feedback', title: 'Мұғалімнің кері байланысы', desc: 'Пікірлер' }
];

async function viewStudent() {
  const dash = await api('/student/dashboard');
  const name = state.user?.name || 'Оқушы';
  app.innerHTML = `
    ${topbar('Оқушы кабинеті')}
    <div class="wrap stack">
      <div class="card">
        <h2>Сәлем, ${escapeHtml(name)}!</h2>
        <p class="muted">Сынып: <b>${escapeHtml(dash.class?.name || '—')}</b></p>
        <div class="stats" style="margin-top:12px">
          <div class="stat"><b>${dash.tasksDone}</b><span>Тапсырма</span></div>
          <div class="stat amber"><b>${dash.testAvg}%</b><span>Тест орташа</span></div>
          <div class="stat"><b>${dash.mistakes}</b><span>Ашық қате</span></div>
          <div class="stat amber"><b>${dash.progress}%</b><span>Прогресс</span></div>
        </div>
        <div style="margin-top:14px">
          <div class="row" style="justify-content:space-between"><span>Жалпы прогресс</span><b>${dash.progress}%</b></div>
          <div class="progress" style="margin-top:6px"><i style="width:${dash.progress}%"></i></div>
        </div>
        ${dash.latestFeedback ? `
          <div class="alert" style="margin-top:14px">
            <b>Соңғы кері байланыс:</b> ${escapeHtml(dash.latestFeedback.comment || '')}
            ${dash.latestFeedback.grade ? ` · Баға: ${escapeHtml(dash.latestFeedback.grade)}` : ''}
          </div>` : ''}
        ${(dash.assignments || []).length ? `
          <div style="margin-top:14px">
            <h3>Берілген тапсырмалар</h3>
            <div class="list" id="asgList"></div>
          </div>` : ''}
      </div>
      <div class="menu-grid" id="menu"></div>
    </div>`;
  bindLogout();
  const menu = document.getElementById('menu');
  STUDENT_MENU.forEach((m) => {
    const b = el(`<button class="menu-item">${escapeHtml(m.title)}<span>${escapeHtml(m.desc)}</span></button>`);
    b.onclick = () => route('student-' + m.id);
    menu.appendChild(b);
  });
  const asgList = document.getElementById('asgList');
  if (asgList) {
    (dash.assignments || []).slice(0, 5).forEach((a) => {
      const item = el(`<div class="list-item"><div><b>${escapeHtml(a.title)}</b><div class="muted">${escapeHtml(a.kind)}</div></div><span class="badge">${a.due_at ? escapeHtml(a.due_at.slice(0,10)) : 'мерзімсіз'}</span></div>`);
      item.onclick = () => openAssignment(a);
      asgList.appendChild(item);
    });
  }
}

async function openAssignment(a) {
  if (a.kind === 'task') route('task', { id: a.ref_id, assignmentId: a.id });
  else route('test-play', { id: a.ref_id, assignmentId: a.id });
}

async function viewStudentLessons() {
  const grade = state.user?.class?.grade;
  const data = await api('/topics' + (grade ? `?grade=${grade}` : ''));
  app.innerHTML = `
    ${topbar('Менің сабақтарым')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Кабинет</button>
      <div class="list" id="list"></div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student');
  const list = document.getElementById('list');
  (data.topics || []).forEach((t) => {
    const item = el(`<div class="list-item"><div><b>${escapeHtml(t.title)}</b><div class="muted">${escapeHtml(t.section || '')} · ${t.grade}-сынып</div></div><span class="badge badge-sky">Ашу</span></div>`);
    item.onclick = () => route('topic', { id: t.id });
    list.appendChild(item);
  });
}

async function viewTopic(id) {
  const data = await api(`/topics/${id}`);
  const topic = data.topic;
  const tabs = ['Сабақ', 'Теория', 'Мысалдар', 'Тапсырмалар', 'Тест', 'Оқу сауаттылығы', 'PISA', 'Қатемен жұмыс'];
  let active = 0;
  app.innerHTML = `
    ${topbar(topic.title)}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Сабақтар</button>
      <div class="card">
        <div class="badge badge-sky">${escapeHtml(topic.section || '')}</div>
        <h2 style="margin-top:8px">${escapeHtml(topic.title)}</h2>
        <div class="tabs" id="tabs"></div>
        <div id="content"></div>
      </div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student-lessons');
  const tabsEl = document.getElementById('tabs');
  const content = document.getElementById('content');

  function lessonHtml(L) {
    if (!L) return '<p class="muted">Материал жоқ</p>';
    return `
      ${block('Мақсаттар', L.goals)}
      ${textBlock('Түсіндірме', L.theory)}
      ${block('Ережелер', L.rules)}
      ${terms(L.terms)}
      ${block('Мысалдар', L.examples)}
      ${tables(L.tables)}
      ${block('Мәтіндер', L.texts)}
      ${block('Практика', L.practice)}
      ${block('Өзін-өзі тексеру', L.selfcheck)}
      ${textBlock('Қорытынды', L.summary)}
      ${block('Үй тапсырмасы', L.homework)}
    `;
  }
  function block(title, arr) {
    if (!arr || !arr.length) return '';
    return `<div class="lesson-block"><h3>${title}</h3><ul>${arr.map((x) => `<li>${escapeHtml(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ul></div>`;
  }
  function textBlock(title, text) {
    if (!text) return '';
    return `<div class="lesson-block"><h3>${title}</h3><p>${escapeHtml(text)}</p></div>`;
  }
  function terms(arr) {
    if (!arr || !arr.length) return '';
    return `<div class="lesson-block"><h3>Терминдер</h3><ul>${arr.map((t) => `<li><b>${escapeHtml(t.term)}</b> — ${escapeHtml(t.def)}</li>`).join('')}</ul></div>`;
  }
  function tables(arr) {
    if (!arr || !arr.length) return '';
    return arr.map((tb) => `
      <div class="lesson-block"><h3>${escapeHtml(tb.title || 'Кесте')}</h3>
      <div class="table-wrap"><table>${(tb.rows || []).map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</table></div></div>`).join('');
  }

  async function render() {
    tabsEl.innerHTML = '';
    tabs.forEach((name, i) => {
      const b = el(`<button class="tab ${i === active ? 'active' : ''}">${name}</button>`);
      b.onclick = () => { active = i; render(); };
      tabsEl.appendChild(b);
    });
    const L = topic.lesson || {};
    if (active === 0) content.innerHTML = lessonHtml(L);
    else if (active === 1) content.innerHTML = textBlock('Теория', topic.theory_text || L.theory);
    else if (active === 2) content.innerHTML = block('Мысалдар', L.examples) || '<p class="muted">Мысал жоқ</p>';
    else if (active === 3) {
      content.innerHTML = '<div class="list" id="taskList"></div>';
      const list = document.getElementById('taskList');
      (data.tasks || []).forEach((t) => {
        const item = el(`<div class="list-item"><div><b>${escapeHtml(t.question)}</b><div class="muted">${escapeHtml(t.type)} · <span class="level-${t.level}">${levelLabel(t.level)}</span></div></div><span class="badge">Орындау</span></div>`);
        item.onclick = () => route('task', { id: t.id });
        list.appendChild(item);
      });
    } else if (active === 4) {
      if (data.quiz) {
        content.innerHTML = `<p>Тақырыптық тест дайын.</p><button class="btn btn-primary" id="goQuiz">Тестті бастау</button>`;
        document.getElementById('goQuiz').onclick = () => route('test-play', { id: data.quiz.id });
      } else content.innerHTML = '<p class="muted">Тест жоқ</p>';
    } else if (active === 5) {
      content.innerHTML = `<button class="btn btn-primary" id="goR">Оқу сауаттылығына өту</button>`;
      document.getElementById('goR').onclick = () => route('student-reading');
    } else if (active === 6) {
      content.innerHTML = `<button class="btn btn-primary" id="goP">PISA бөліміне өту</button>`;
      document.getElementById('goP').onclick = () => route('student-pisa');
    } else {
      content.innerHTML = `<button class="btn btn-primary" id="goM">Қателерімді көру</button>`;
      document.getElementById('goM').onclick = () => route('student-mistakes');
    }
  }
  render();
}

async function viewTask(id, assignmentId) {
  const { task } = await api(`/tasks/${id}`);
  let selected = task.type === 'multi' ? [] : '';
  let done = false;
  app.innerHTML = `
    ${topbar('Тапсырма')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Артқа</button>
      <div class="card stack">
        <div class="row"><span class="badge">${escapeHtml(task.type)}</span><span class="badge amber level-${task.level}">${levelLabel(task.level)}</span></div>
        <h2>${escapeHtml(task.question)}</h2>
        <div id="player"></div>
        <button class="btn btn-primary" id="submit">Жіберу</button>
        <div id="result"></div>
      </div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => history.back();
  const player = document.getElementById('player');
  const result = document.getElementById('result');

  function paint() {
    if (['single', 'truefalse'].includes(task.type) && task.options) {
      player.innerHTML = `<div class="options">${task.options.map((o) =>
        `<button class="option ${selected === o ? 'selected' : ''}" data-v="${escapeHtml(o)}">${escapeHtml(o)}</button>`
      ).join('')}</div>`;
      player.querySelectorAll('.option').forEach((b) => b.onclick = () => { if (!done) { selected = b.dataset.v; paint(); } });
    } else if (task.type === 'multi' && task.options) {
      player.innerHTML = `<div class="options">${task.options.map((o) =>
        `<button class="option ${selected.includes(o) ? 'selected' : ''}" data-v="${escapeHtml(o)}">${escapeHtml(o)}</button>`
      ).join('')}</div><p class="muted">Бірнеше жауап таңдаңыз</p>`;
      player.querySelectorAll('.option').forEach((b) => b.onclick = () => {
        if (done) return;
        const v = b.dataset.v;
        selected = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
        paint();
      });
    } else {
      player.innerHTML = `<div class="field"><textarea id="ans" placeholder="Жауабыңызды жазыңыз"></textarea></div>`;
    }
  }
  paint();

  document.getElementById('submit').onclick = async () => {
    if (done) return;
    let answer = selected;
    const ta = document.getElementById('ans');
    if (ta) answer = ta.value;
    try {
      const res = await api(`/tasks/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answer, assignment_id: assignmentId || null })
      });
      done = true;
      document.getElementById('submit').disabled = true;
      if (res.needsTeacher) {
        result.innerHTML = `<div class="result-box pending"><b>Мұғалім тексеруіне жіберілді</b></div>`;
      } else if (res.correct) {
        result.innerHTML = `<div class="result-box ok"><b>Дұрыс!</b><p>${escapeHtml(res.explanation || '')}</p></div>`;
      } else {
        result.innerHTML = `<div class="result-box bad"><b>Қате</b>
          <p>Дұрыс жауап: <b>${escapeHtml(typeof res.correctAnswer === 'object' ? JSON.stringify(res.correctAnswer) : res.correctAnswer)}</b></p>
          <p>${escapeHtml(res.explanation || '')}</p></div>`;
      }
    } catch (e) {
      result.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`;
    }
  };
}

async function viewTestList(type, title) {
  const grade = state.user?.class?.grade;
  let url = '/tests?';
  if (grade) url += `grade=${grade}&`;
  if (type) url += `type=${type}`;
  const data = await api(url);
  app.innerHTML = `
    ${topbar(title)}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Кабинет</button>
      <div class="list" id="list"></div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student');
  const list = document.getElementById('list');
  const items = data.tests || [];
  if (!items.length) list.innerHTML = '<div class="card muted">Әзірге жоқ</div>';
  items.forEach((t) => {
    let extra = '';
    if (type === 'olympiad') extra = ' · олимпиада';
    const item = el(`<div class="list-item"><div><b>${escapeHtml(t.title)}</b><div class="muted">${t.time_limit} мин · ${t.max_score} балл${extra}</div></div><span class="badge badge-sky">Бастау</span></div>`);
    item.onclick = () => route('test-play', { id: t.id });
    list.appendChild(item);
  });
}

async function viewTestPlay(id, assignmentId) {
  const data = await api(`/tests/${id}`);
  const test = data.test;
  const questions = data.questions || [];
  const answers = {};
  let idx = 0;
  let finished = null;

  function render() {
    if (finished) {
      app.innerHTML = `
        ${topbar('Нәтиже')}
        <div class="wrap"><div class="card stack">
          <h2>${escapeHtml(test.title)}</h2>
          <div class="stat"><b>${finished.score} / ${finished.maxScore}</b><span>Балл</span></div>
          <div class="list">${(finished.details || []).map((d) => `
            <div class="list-item"><div>№${d.id}
              ${d.needsTeacher ? '<span class="badge">тексеруде</span>' :
                d.correct ? '<span class="badge badge-ok">дұрыс</span>' : `<span class="badge badge-bad">қате</span>`}
              ${!d.needsTeacher && d.correctAnswer != null ? `<div class="muted">Дұрыс: ${escapeHtml(typeof d.correctAnswer === 'object' ? JSON.stringify(d.correctAnswer) : d.correctAnswer)}</div>` : ''}
            </div></div>`).join('')}</div>
          <button class="btn btn-primary" id="back">Кабинетке</button>
        </div></div>`;
      bindLogout();
      document.getElementById('back').onclick = () => route('student');
      return;
    }
    const q = questions[idx];
    const levelBadge = test.level ? `<span class="badge">${escapeHtml(test.level)}</span>` : '';
    app.innerHTML = `
      ${topbar(test.title)}
      <div class="wrap stack">
        <div class="row" style="justify-content:space-between">
          <span class="muted">${idx + 1} / ${questions.length}</span>
          ${levelBadge}
          <span class="badge badge-sky">${test.time_limit} мин</span>
        </div>
        <div class="card stack">
          ${q.passage ? `<div class="lesson-block"><h3>Мәтін</h3><p>${escapeHtml(q.passage)}</p></div>` : ''}
          ${q.stimulus ? `<div class="lesson-block"><h3>Стимул</h3><p>${escapeHtml(q.stimulus)}</p></div>` : ''}
          <h2>${escapeHtml(q.question)}</h2>
          <div id="qplay"></div>
          <div class="row">
            <button class="btn btn-outline half" id="prev" ${idx === 0 ? 'disabled' : ''}>Алдыңғы</button>
            <button class="btn btn-primary half" id="next">${idx === questions.length - 1 ? 'Аяқтау' : 'Келесі'}</button>
          </div>
        </div>
      </div>`;
    bindLogout();
    const qplay = document.getElementById('qplay');
    if (q.options && q.type !== 'open') {
      const cur = answers[q.id];
      qplay.innerHTML = `<div class="options">${q.options.map((o) =>
        `<button class="option ${cur === o ? 'selected' : ''}" data-v="${escapeHtml(o)}">${escapeHtml(o)}</button>`
      ).join('')}</div>`;
      qplay.querySelectorAll('.option').forEach((b) => b.onclick = () => {
        answers[q.id] = b.dataset.v;
        render();
      });
    } else {
      qplay.innerHTML = `<div class="field"><textarea id="ans">${escapeHtml(answers[q.id] || '')}</textarea></div>`;
      document.getElementById('ans').oninput = (e) => { answers[q.id] = e.target.value; };
    }
    document.getElementById('prev').onclick = () => { idx--; render(); };
    document.getElementById('next').onclick = async () => {
      if (idx < questions.length - 1) { idx++; render(); return; }
      try {
        finished = await api(`/tests/${id}/submit`, {
          method: 'POST',
          body: JSON.stringify({ answers, assignment_id: assignmentId || null })
        });
        render();
      } catch (e) { alert(e.message); }
    };
  }
  render();
}

async function viewMistakes() {
  const data = await api('/student/mistakes');
  app.innerHTML = `
    ${topbar('Қатемен жұмыс')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Кабинет</button>
      <div class="list" id="list"></div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student');
  const list = document.getElementById('list');
  if (!(data.mistakes || []).length) list.innerHTML = '<div class="card">Қате жоқ — жарайсың!</div>';
  (data.mistakes || []).forEach((m) => {
    const item = el(`<div class="card stack">
      <div class="row"><span class="badge ${m.resolved ? 'badge-ok' : 'badge-bad'}">${m.resolved ? 'шешілді' : 'ашық'}</span>
        <span class="muted">${escapeHtml(m.topic_title || '')}</span></div>
      <div>Сенің жауабың: <b>${escapeHtml(m.student_answer)}</b></div>
      <div>Дұрыс: <b>${escapeHtml(m.correct_answer)}</b></div>
      <p class="muted">${escapeHtml(m.explanation || '')}</p>
      ${!m.resolved ? `<button class="btn btn-sm btn-primary" data-id="${m.id}">Түсіндім</button>` : ''}
    </div>`);
    list.appendChild(item);
  });
  list.querySelectorAll('button[data-id]').forEach((b) => b.onclick = async () => {
    await api(`/student/mistakes/${b.dataset.id}/resolve`, { method: 'POST', body: '{}' });
    viewMistakes();
  });
}

async function viewResults() {
  const data = await api('/student/results');
  app.innerHTML = `
    ${topbar('Нәтижелерім')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Кабинет</button>
      <div class="list">${(data.results || []).map((r) => `
        <div class="list-item"><div><b>${escapeHtml(r.kind)} #${r.ref_id}</b>
          <div class="muted">${escapeHtml(formatDate(r.date))}</div></div>
          <span class="badge">${r.score}/${r.max_score}</span></div>`).join('') || '<div class="card muted">Әзірге жоқ</div>'}
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student');
}

async function viewProgress() {
  const dash = await api('/student/dashboard');
  app.innerHTML = `
    ${topbar('Прогресс')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Кабинет</button>
      <div class="card stack">
        <h2>${dash.progress}%</h2>
        <div class="progress"><i style="width:${dash.progress}%"></i></div>
        <div class="stats">
          <div class="stat"><b>${dash.tasksDone}</b><span>Тапсырма</span></div>
          <div class="stat amber"><b>${dash.testAvg}%</b><span>Тест</span></div>
        </div>
      </div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student');
}

async function viewFeedback() {
  const data = await api('/student/feedback');
  app.innerHTML = `
    ${topbar('Мұғалімнің кері байланысы')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Кабинет</button>
      ${(data.feedback || []).map((f) => `
        <div class="card stack">
          <div class="row"><b>${escapeHtml(f.teacher_name || 'Мұғалім')}</b>
            ${f.grade ? `<span class="badge">${escapeHtml(f.grade)}</span>` : ''}
            ${f.score != null ? `<span class="badge badge-sky">${f.score}</span>` : ''}
          </div>
          <p>${escapeHtml(f.comment || '')}</p>
          <div class="muted">${escapeHtml(formatDate(f.date))}</div>
        </div>`).join('') || '<div class="card muted">Әзірге пікір жоқ</div>'}
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student');
}

async function viewStudentTasksHub() {
  const grade = state.user?.class?.grade;
  const topics = await api('/topics' + (grade ? `?grade=${grade}` : ''));
  // show assignments + link to topics tasks
  const asg = await api('/student/assignments');
  app.innerHTML = `
    ${topbar('Тапсырмалар')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Кабинет</button>
      <div class="card"><h3>Мұғалім берген</h3><div class="list" id="asg"></div></div>
      <div class="card"><h3>Тақырыптық тапсырмалар</h3><div class="list" id="topics"></div></div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('student');
  const asgEl = document.getElementById('asg');
  (asg.assignments || []).filter((a) => a.kind === 'task').forEach((a) => {
    const item = el(`<div class="list-item"><div><b>${escapeHtml(a.title)}</b></div><span class="badge">${a.done_result_id ? 'орындалды' : 'жаңа'}</span></div>`);
    item.onclick = () => openAssignment(a);
    asgEl.appendChild(item);
  });
  if (!asgEl.children.length) asgEl.innerHTML = '<p class="muted">Әзірге жоқ</p>';
  const topicsEl = document.getElementById('topics');
  (topics.topics || []).forEach((t) => {
    const item = el(`<div class="list-item"><div><b>${escapeHtml(t.title)}</b></div><span class="badge badge-sky">Ашу</span></div>`);
    item.onclick = () => route('topic', { id: t.id, tab: 3 });
    topicsEl.appendChild(item);
  });
}

// ---------------- TEACHER ----------------
async function viewTeacher() {
  const data = await api('/teacher/classes');
  app.innerHTML = `
    ${topbar('Мұғалім кабинеті')}
    <div class="wrap stack">
      <div class="card">
        <h2>Сәлем, ${escapeHtml(state.user?.name || 'Мұғалім')}!</h2>
        <p class="muted">Сыныптарды таңдап, тапсырма беріңіз және нәтижені қадағалаңыз.</p>
      </div>
      <div class="list" id="list"></div>
    </div>`;
  bindLogout();
  const list = document.getElementById('list');
  (data.classes || []).forEach((c) => {
    const item = el(`<div class="list-item"><div><b>${escapeHtml(c.name)}</b><div class="muted">${c.grade}-сынып</div></div><span class="badge badge-sky">Ашу</span></div>`);
    item.onclick = () => route('teacher-class', { id: c.id, name: c.name, grade: c.grade });
    list.appendChild(item);
  });
}

async function viewTeacherClass(id, name, grade) {
  const students = await api(`/teacher/classes/${id}/students`);
  const dash = await api(`/teacher/classes/${id}/dashboard`);
  app.innerHTML = `
    ${topbar(name || 'Сынып')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Сыныптар</button>
      <div class="card stack">
        <h2>${escapeHtml(name)}</h2>
        <div class="row">
          <button class="btn btn-sm btn-primary" id="assign">Тапсырма беру</button>
          <button class="btn btn-sm btn-amber" id="pending">Ашық жауаптар</button>
        </div>
        <h3>Бақылау панелі</h3>
        <div class="list">${(dash.overview || []).map((o) => `
          <div class="list-item" data-sid="${o.student.id}">
            <div><b>${escapeHtml(o.student.name)}</b>
              <div class="muted">Орындаған: ${o.assignmentsDone}/${o.assignmentsTotal} · Қате: ${o.openMistakes} · Орташа: ${o.avgPercent}%</div>
            </div>
            <span class="badge">Қарау</span>
          </div>`).join('') || '<p class="muted">Оқушы жоқ — тіркелуді күтіңіз</p>'}
        </div>
        ${(dash.weakTopics || []).length ? `
          <h3>Әлсіз тақырыптар</h3>
          <ul>${dash.weakTopics.map((w) => `<li>${escapeHtml(w.title)} (${w.c})</li>`).join('')}</ul>` : ''}
        <h3>Оқушылар</h3>
        <div class="list" id="st"></div>
      </div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('teacher');
  document.getElementById('assign').onclick = () => route('teacher-assign', { classId: id, grade });
  document.getElementById('pending').onclick = () => route('teacher-pending', { classId: id });
  document.querySelectorAll('[data-sid]').forEach((el) => {
    el.onclick = () => route('teacher-student', { id: el.dataset.sid, classId: id, className: name, grade });
  });
  const st = document.getElementById('st');
  (students.students || []).forEach((s) => {
    const item = el(`<div class="list-item"><div><b>${escapeHtml(s.name)}</b><div class="muted">@${escapeHtml(s.login)}</div></div><span class="badge">Нәтиже</span></div>`);
    item.onclick = () => route('teacher-student', { id: s.id, classId: id, className: name, grade });
    st.appendChild(item);
  });
}

async function viewTeacherAssign(classId, grade) {
  const [tasks, tests] = await Promise.all([
    api(`/teacher/tasks?grade=${grade || ''}`),
    api(`/tests?grade=${grade || ''}`)
  ]);
  app.innerHTML = `
    ${topbar('Тапсырма беру')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Артқа</button>
      <div class="card stack">
        <div class="field"><label>Түрі</label>
          <select id="kind"><option value="task">Тапсырма</option><option value="quiz">Тест</option>
          <option value="olympiad">Олимпиада</option><option value="reading">Оқу сауаттылығы</option><option value="pisa">PISA</option></select>
        </div>
        <div class="field"><label>Таңдау</label><select id="ref"></select></div>
        <div class="field"><label>Атауы</label><input id="title" /></div>
        <div class="field"><label>Мерзім (YYYY-MM-DD)</label><input id="due" placeholder="2026-09-30" /></div>
        <button class="btn btn-amber" id="go">Тағайындау</button>
        <div id="msg"></div>
      </div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => history.back();

  function fillRefs() {
    const kind = document.getElementById('kind').value;
    const ref = document.getElementById('ref');
    let items = [];
    if (kind === 'task') items = (tasks.tasks || []).map((t) => ({ id: t.id, label: t.question.slice(0, 60) }));
    else {
      const typeMap = { quiz: 'quiz', olympiad: 'olympiad', reading: 'reading', pisa: 'pisa' };
      items = (tests.tests || []).filter((t) => !typeMap[kind] || t.type === typeMap[kind] || (kind === 'quiz' && t.type === 'quiz'))
        .map((t) => ({ id: t.id, label: t.title }));
    }
    ref.innerHTML = items.map((i) => `<option value="${i.id}">${escapeHtml(i.label)}</option>`).join('') || '<option value="">—</option>';
    if (items[0]) document.getElementById('title').value = items[0].label;
  }
  document.getElementById('kind').onchange = fillRefs;
  document.getElementById('ref').onchange = () => {
    const opt = document.getElementById('ref').selectedOptions[0];
    if (opt) document.getElementById('title').value = opt.textContent;
  };
  fillRefs();

  document.getElementById('go').onclick = async () => {
    try {
      await api('/teacher/assignments', {
        method: 'POST',
        body: JSON.stringify({
          classId: Number(classId),
          kind: document.getElementById('kind').value,
          refId: Number(document.getElementById('ref').value),
          title: document.getElementById('title').value,
          dueAt: document.getElementById('due').value || null
        })
      });
      document.getElementById('msg').innerHTML = '<div class="result-box ok">Тағайындалды!</div>';
    } catch (e) {
      document.getElementById('msg').innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`;
    }
  };
}

async function viewTeacherStudent(sid, classId, className, grade) {
  const data = await api(`/teacher/students/${sid}/results`);
  app.innerHTML = `
    ${topbar('Оқушы нәтижесі')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Артқа</button>
      <div class="card stack">
        <h3>Нәтижелер</h3>
        <div class="list">${(data.results || []).slice(0, 30).map((r) => `
          <div class="list-item"><div><b>${escapeHtml(r.kind)} #${r.ref_id}</b>
            <div class="muted">${r.auto_graded ? 'авто' : 'қолмен'} · ${escapeHtml(formatDate(r.date))}</div></div>
            <span class="badge">${r.score}/${r.max_score}</span></div>`).join('') || '<p class="muted">Жоқ</p>'}
        </div>
        <h3>Қателер</h3>
        <div class="list">${(data.mistakes || []).slice(0, 20).map((m) => `
          <div class="card"><div>Жауап: ${escapeHtml(m.student_answer)}</div>
          <div>Дұрыс: ${escapeHtml(m.correct_answer)}</div>
          <p class="muted">${escapeHtml(m.explanation || '')}</p></div>`).join('') || '<p class="muted">Жоқ</p>'}
        </div>
        <h3>Кері байланыс жазу</h3>
        <div class="field"><label>Балл</label><input id="score" type="number" /></div>
        <div class="field"><label>Баға</label><input id="grade" placeholder="5 / жақсы" /></div>
        <div class="field"><label>Пікір</label><textarea id="comment"></textarea></div>
        <button class="btn btn-amber" id="send">Жіберу</button>
        <div id="msg"></div>
      </div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => route('teacher-class', { id: classId, name: className, grade });
  document.getElementById('send').onclick = async () => {
    try {
      await api('/teacher/feedback', {
        method: 'POST',
        body: JSON.stringify({
          studentId: Number(sid),
          score: document.getElementById('score').value,
          grade: document.getElementById('grade').value,
          comment: document.getElementById('comment').value
        })
      });
      document.getElementById('msg').innerHTML = '<div class="result-box ok">Жіберілді</div>';
    } catch (e) {
      document.getElementById('msg').innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`;
    }
  };
}

async function viewTeacherPending(classId) {
  const data = await api(`/teacher/pending-open?classId=${classId}`);
  app.innerHTML = `
    ${topbar('Ашық жауаптар')}
    <div class="wrap stack">
      <button class="btn btn-sm btn-ghost" id="back">← Артқа</button>
      <div id="list" class="stack"></div>
    </div>`;
  bindLogout();
  document.getElementById('back').onclick = () => history.back();
  const list = document.getElementById('list');
  if (!(data.results || []).length) list.innerHTML = '<div class="card muted">Кезек бос</div>';
  (data.results || []).forEach((r) => {
    const card = el(`<div class="card stack">
      <b>${escapeHtml(r.student_name)}</b>
      <div class="muted">${escapeHtml(r.kind)} #${r.ref_id}</div>
      <pre style="white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:10px">${escapeHtml(r.answer_json)}</pre>
      <div class="field"><label>Балл</label><input type="number" class="score" value="0" /></div>
      <div class="field"><label>Баға</label><input class="grade" /></div>
      <div class="field"><label>Пікір</label><textarea class="comment"></textarea></div>
      <button class="btn btn-primary">Бағалау</button>
    </div>`);
    card.querySelector('button').onclick = async () => {
      await api(`/teacher/results/${r.id}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          score: card.querySelector('.score').value,
          grade: card.querySelector('.grade').value,
          comment: card.querySelector('.comment').value
        })
      });
      card.innerHTML = '<div class="result-box ok">Бағаланды</div>';
    };
    list.appendChild(card);
  });
}

// ---------------- ROUTER ----------------
async function route(name, params = {}) {
  try {
    if (name === 'home') return viewHome();
    if (name === 'student-auth') return viewStudentAuth();
    if (name === 'teacher-auth') return viewTeacherAuth();

    if (!state.token && !['home', 'student-auth', 'teacher-auth'].includes(name)) {
      return viewHome();
    }
    if (state.token && !state.user) {
      const me = await api('/me');
      state.user = me.user;
    }

    if (name === 'student') return viewStudent();
    if (name === 'student-lessons') return viewStudentLessons();
    if (name === 'student-tasks') return viewStudentTasksHub();
    if (name === 'student-tests') return viewTestList('quiz', 'Тесттер');
    if (name === 'student-olympiad') return viewTestList('olympiad', 'Олимпиада');
    if (name === 'student-reading') return viewTestList('reading', 'Оқу сауаттылығы');
    if (name === 'student-pisa') return viewTestList('pisa', 'PISA');
    if (name === 'student-mistakes') return viewMistakes();
    if (name === 'student-results') return viewResults();
    if (name === 'student-progress') return viewProgress();
    if (name === 'student-feedback') return viewFeedback();
    if (name === 'topic') return viewTopic(params.id);
    if (name === 'task') return viewTask(params.id, params.assignmentId);
    if (name === 'test-play') return viewTestPlay(params.id, params.assignmentId);
    if (name === 'teacher') return viewTeacher();
    if (name === 'teacher-class') return viewTeacherClass(params.id, params.name, params.grade);
    if (name === 'teacher-assign') return viewTeacherAssign(params.classId, params.grade);
    if (name === 'teacher-student') return viewTeacherStudent(params.id, params.classId, params.className, params.grade);
    if (name === 'teacher-pending') return viewTeacherPending(params.classId);
    return viewHome();
  } catch (e) {
    if (String(e.message).includes('Кіру') || String(e.message).includes('Сессия')) {
      setSession(null, null);
      return viewHome();
    }
    app.innerHTML = `<div class="wrap"><div class="error">${escapeHtml(e.message)}</div>
      <button class="btn btn-primary" id="h">Басты бет</button></div>`;
    document.getElementById('h').onclick = () => route('home');
  }
}

(async function boot() {
  if (state.token) {
    try {
      const me = await api('/me');
      state.user = me.user;
      route(me.user.role === 'teacher' ? 'teacher' : 'student');
      return;
    } catch (_) { setSession(null, null); }
  }
  route('home');
})();
