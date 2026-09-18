/* Аутентификация — localStorage */
const USERS_KEY = 'qtp_users';
const SESSION_KEY = 'qtp_session';

const SEED_USERS = [
  {
    id: 'u-student140',
    name: 'Айгерім Нұрланова',
    grade: 7,
    login: 'student140',
    password: '140qazaq',
    role: 'student',
    createdAt: Date.now()
  },
  {
    id: 'u-teacher140',
    name: 'Гүлнар Мұғалімова',
    grade: null,
    login: 'teacher140',
    password: '140teacher',
    role: 'teacher',
    createdAt: Date.now()
  }
];

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
      return [...SEED_USERS];
    }
    let users = JSON.parse(raw);
    // ensure seeds exist
    for (const seed of SEED_USERS) {
      if (!users.find(u => u.login === seed.login)) users.push(seed);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users;
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return [...SEED_USERS];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function ensureSeed() {
  loadUsers();
}

export function register({ name, grade, login, password }) {
  const users = loadUsers();
  if (!name || !login || !password) return { ok: false, error: 'Барлық өрісті толтырыңыз.' };
  if (![5,6,7,8,9].includes(Number(grade))) return { ok: false, error: 'Сынып 5–9 аралығында болуы керек.' };
  if (users.find(u => u.login.toLowerCase() === login.toLowerCase())) {
    return { ok: false, error: 'Бұл логин бос емес.' };
  }
  if (password.length < 4) return { ok: false, error: 'Құпия сөз кемінде 4 таңба.' };
  const user = {
    id: 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    grade: Number(grade),
    login: login.trim(),
    password,
    role: 'student',
    createdAt: Date.now()
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user: publicUser(user) };
}

export function login(loginName, password) {
  const users = loadUsers();
  const user = users.find(
    u => u.login.toLowerCase() === String(loginName).trim().toLowerCase() && u.password === password
  );
  if (!user) return { ok: false, error: 'Логин немесе құпия сөз қате.' };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, at: Date.now() }));
  return { ok: true, user: publicUser(user) };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!s) return null;
    const users = loadUsers();
    const user = users.find(u => u.id === s.userId);
    return user ? publicUser(user) : null;
  } catch {
    return null;
  }
}

export function getAllStudents() {
  return loadUsers().filter(u => u.role === 'student').map(publicUser);
}

export function getUserById(id) {
  const u = loadUsers().find(x => x.id === id);
  return u ? publicUser(u) : null;
}

function publicUser(u) {
  return { id: u.id, name: u.name, grade: u.grade, login: u.login, role: u.role, createdAt: u.createdAt };
}

export function updateUserProfile(id, patch) {
  const users = loadUsers();
  const i = users.findIndex(u => u.id === id);
  if (i < 0) return false;
  users[i] = { ...users[i], ...patch, password: users[i].password, id: users[i].id, role: users[i].role };
  saveUsers(users);
  return true;
}
