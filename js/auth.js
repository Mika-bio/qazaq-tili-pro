/* Аутентификация — localStorage, SHA-256 password hashes (v4) */
const USERS_KEY = 'qtp_users_v4';
const SESSION_KEY = 'qtp_session_v4';
const LEGACY_USERS_KEYS = ['qtp_users_v3', 'qtp_users_v2', 'qtp_users'];
const LEGACY_SESSION_KEYS = ['qtp_session_v3', 'qtp_session_v2', 'qtp_session'];

const PARALLELS = ['А', 'Ә', 'Б', 'В', 'Г'];

/** Precomputed SHA-256 of "140teacher" (UTF-8). Never shown on public UI. */
const TEACHER_PASSWORD_HASH =
  '24169849774bf14b7c192278141feaf25a24014152b905f95186558665f20c7e';

function teacherSeed() {
  return {
    id: 'u-teacher140',
    name: 'Мұғалім',
    grade: null,
    parallel: null,
    classLabel: null,
    login: 'teacher140',
    passwordHash: TEACHER_PASSWORD_HASH,
    role: 'teacher',
    createdAt: Date.now()
  };
}

/** Minimal SHA-256 (hex) for file:// / non-secure contexts without crypto.subtle. */
function sha256Fallback(message) {
  function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
  function toBytes(str) {
    const utf8 = unescape(encodeURIComponent(str));
    const arr = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
    return arr;
  }
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const bytes = toBytes(message);
  const l = bytes.length;
  const bitLen = l * 8;
  const withPad = ((l + 9 + 63) & ~63);
  const buf = new Uint8Array(withPad);
  buf.set(bytes);
  buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  // length in bits as 64-bit big-endian at end
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  dv.setUint32(withPad - 8, hi, false);
  dv.setUint32(withPad - 4, lo, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let i = 0; i < withPad; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(7, w[j-15]) ^ rotr(18, w[j-15]) ^ (w[j-15] >>> 3);
      const s1 = rotr(17, w[j-2]) ^ rotr(19, w[j-2]) ^ (w[j-2] >>> 10);
      w[j] = (w[j-16] + s0 + w[j-7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => x.toString(16).padStart(8, '0')).join('');
}

/** SHA-256 hex via Web Crypto or pure-JS fallback (file:// safe). */
export async function hashPassword(password) {
  const text = String(password ?? '');
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    try {
      const data = new TextEncoder().encode(text);
      const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      /* file:// or restricted context — fall through */
    }
  }
  return sha256Fallback(text);
}

function sanitizeLogin(login) {
  return String(login ?? '').trim().replace(/\s+/g, '');
}

function stripSecrets(u) {
  const copy = { ...u };
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

function migrateLegacyUsers(rawList) {
  return (rawList || [])
    .filter(u => {
      const login = String(u.login || '').toLowerCase();
      const name = String(u.name || '').toLowerCase();
      if (login === 'nailya') return false;
      if (name === 'найля' || name === 'nailya') return false;
      // Drop shared student seed — students register their own accounts
      if (login === 'student140') return false;
      return true;
    })
    .map(u => {
      const next = { ...u };
      // Keep plaintext temporarily until successful login migrates to passwordHash
      if (next.passwordHash && next.password) delete next.password;
      return next;
    });
}

function loadUsers() {
  try {
    let raw = localStorage.getItem(USERS_KEY);
    let users;
    if (!raw) {
      // Migrate from older keys if present
      for (const k of LEGACY_USERS_KEYS) {
        const legacy = localStorage.getItem(k);
        if (legacy) {
          try {
            users = migrateLegacyUsers(JSON.parse(legacy));
            break;
          } catch { /* ignore */ }
        }
      }
      if (!users) users = [];
    } else {
      users = migrateLegacyUsers(JSON.parse(raw));
    }

    // Ensure internal teacher seed (hashed) without publishing password in UI
    const ti = users.findIndex(u => String(u.login || '').toLowerCase() === 'teacher140');
    if (ti < 0) {
      users.push(teacherSeed());
    } else {
      const t = users[ti];
      users[ti] = {
        ...t,
        name: t.name || 'Мұғалім',
        role: 'teacher',
        passwordHash: t.passwordHash || TEACHER_PASSWORD_HASH,
        login: 'teacher140'
      };
      delete users[ti].password;
    }

    saveUsers(users);
    return users;
  } catch {
    const users = [teacherSeed()];
    saveUsers(users);
    return users;
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function ensureSeed() {
  loadUsers();
  // Clear legacy session keys so stale sessions don't auto-login
  for (const k of LEGACY_SESSION_KEYS) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

export function getParallels() {
  return PARALLELS.slice();
}

export function classOptions() {
  const opts = [];
  for (const g of [5, 6, 7, 8, 9]) {
    for (const p of PARALLELS) opts.push({ grade: g, parallel: p, label: `${g}-${p}` });
  }
  return opts;
}

export async function register({ name, grade, parallel, classLabel, login, password, passwordConfirm }) {
  const users = loadUsers();
  if (!name || !login || !password) {
    return { ok: false, error: 'Барлық өрісті толтырыңыз.' };
  }
  const cleanLogin = sanitizeLogin(login);
  if (!cleanLogin) return { ok: false, error: 'Логин бос болмауы керек.' };
  if (/\s/.test(String(login).trim()) || cleanLogin !== String(login).trim()) {
    return { ok: false, error: 'Логинде бос орын болмауы керек.' };
  }
  if (passwordConfirm !== undefined && password !== passwordConfirm) {
    return { ok: false, error: 'Құпия сөздер сәйкес келмейді.' };
  }
  const g = Number(grade);
  if (![5, 6, 7, 8, 9].includes(g)) {
    return { ok: false, error: 'Сынып 5–9 аралығында болуы керек.' };
  }
  const par = (parallel || 'А').toString().trim() || 'А';
  const label = classLabel || `${g}-${par}`;
  if (users.find(u => String(u.login).toLowerCase() === cleanLogin.toLowerCase())) {
    return { ok: false, error: 'Бұл логин бос емес.' };
  }
  if (String(password).length < 6) {
    return { ok: false, error: 'Құпия сөз кемінде 6 таңба.' };
  }
  const passwordHash = await hashPassword(password);
  const user = {
    id: 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: String(name).trim(),
    grade: g,
    parallel: par,
    classLabel: label,
    login: cleanLogin,
    passwordHash,
    role: 'student',
    createdAt: Date.now()
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user: publicUser(user) };
}

export async function login(loginName, password) {
  const users = loadUsers();
  const clean = sanitizeLogin(loginName);
  const idx = users.findIndex(u => String(u.login).toLowerCase() === clean.toLowerCase());
  if (idx < 0) return { ok: false, error: 'Логин немесе құпия сөз қате.' };

  const user = users[idx];
  const typedHash = await hashPassword(password);
  let ok = false;

  if (user.passwordHash) {
    ok = user.passwordHash === typedHash;
  } else if (user.password != null) {
    // Legacy plaintext: accept once, then migrate to hash
    ok = String(user.password) === String(password);
    if (ok) {
      users[idx] = {
        ...user,
        passwordHash: typedHash
      };
      delete users[idx].password;
      saveUsers(users);
    }
  }

  if (!ok) return { ok: false, error: 'Логин немесе құпия сөз қате.' };

  // Ensure hash stored (e.g. teacher seed already hashed)
  if (!users[idx].passwordHash) {
    users[idx].passwordHash = typedHash;
    delete users[idx].password;
    saveUsers(users);
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: users[idx].id, at: Date.now() }));
  return { ok: true, user: publicUser(users[idx]) };
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
  const classLabel = u.classLabel || (u.grade ? `${u.grade}-${u.parallel || 'А'}` : null);
  return {
    id: u.id,
    name: u.name,
    grade: u.grade,
    parallel: u.parallel || null,
    classLabel,
    login: u.login,
    role: u.role,
    createdAt: u.createdAt
  };
}

export function updateUserProfile(id, patch) {
  const users = loadUsers();
  const i = users.findIndex(u => u.id === id);
  if (i < 0) return false;
  const prev = users[i];
  const safe = stripSecrets(patch);
  users[i] = {
    ...prev,
    ...safe,
    id: prev.id,
    role: prev.role,
    passwordHash: prev.passwordHash,
    login: prev.login
  };
  if (prev.password && !prev.passwordHash) users[i].password = prev.password;
  saveUsers(users);
  return true;
}
