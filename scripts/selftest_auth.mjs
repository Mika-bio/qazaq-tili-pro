/**
 * Self-test: personal accounts — register A, login A OK, wrong password fails, B cannot login as A.
 * Run: node scripts/selftest_auth.mjs
 */
// Minimal localStorage for Node
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

globalThis.localStorage = localStorage;

// Load auth.js as ES module via dynamic import from file
const auth = await import('../js/auth.js');

auth.ensureSeed();

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

// No student seed
const students0 = auth.getAllStudents();
assert(!students0.some(s => s.login === 'student140'), 'no public student140 seed');

// Register user A
const regA = await auth.register({
  name: 'Айгүл Тест',
  grade: 7,
  parallel: 'А',
  classLabel: '7-А',
  login: 'userA_test',
  password: 'secretA1',
  passwordConfirm: 'secretA1'
});
assert(regA.ok, 'register A succeeds');
assert(regA.user && regA.user.login === 'userA_test', 'A login stored');

// Password not stored plaintext
const raw = JSON.parse(localStorage.getItem('qtp_users_v4'));
const storedA = raw.find(u => u.login === 'userA_test');
assert(storedA.passwordHash && !storedA.password, 'A password stored as hash only');

// Login A OK
const loginA = await auth.login('userA_test', 'secretA1');
assert(loginA.ok, 'login A with correct password');
assert(auth.currentUser()?.login === 'userA_test', 'session is A');

// Wrong password fails
auth.logout();
const bad = await auth.login('userA_test', 'wrongpass');
assert(!bad.ok, 'wrong password fails');
assert(auth.currentUser() === null, 'no session after failed login');

// Register B
const regB = await auth.register({
  name: 'Бекзат Тест',
  grade: 6,
  parallel: 'Б',
  classLabel: '6-Б',
  login: 'userB_test',
  password: 'secretB2',
  passwordConfirm: 'secretB2'
});
assert(regB.ok, 'register B succeeds');

// B cannot login as A
const steal = await auth.login('userA_test', 'secretB2');
assert(!steal.ok, 'B password cannot open A account');

// Unique login case-insensitive
const dup = await auth.register({
  name: 'Dup',
  grade: 5,
  parallel: 'А',
  classLabel: '5-А',
  login: 'UserA_Test',
  password: 'abcdef',
  passwordConfirm: 'abcdef'
});
assert(!dup.ok, 'duplicate login rejected (case-insensitive)');

// Mismatch passwords
const mm = await auth.register({
  name: 'X',
  grade: 5,
  parallel: 'А',
  classLabel: '5-А',
  login: 'userC_test',
  password: 'abcdef',
  passwordConfirm: 'abcdefg'
});
assert(!mm.ok, 'password mismatch rejected');

// Min length
const short = await auth.register({
  name: 'X',
  grade: 5,
  parallel: 'А',
  classLabel: '5-А',
  login: 'userD_test',
  password: '12345',
  passwordConfirm: '12345'
});
assert(!short.ok, 'short password rejected');

// Login A still works for A only
const again = await auth.login('userA_test', 'secretA1');
assert(again.ok && auth.currentUser().id === regA.user.id, 'A can login again to own session');

// Teacher seed login (admin only — not on homepage)
const t = await auth.login('teacher140', '140teacher');
assert(t.ok && t.user.role === 'teacher', 'teacher seed works with hashed password');

// Legacy plaintext migration
raw.push({
  id: 'u-legacy',
  name: 'Legacy',
  grade: 8,
  parallel: 'А',
  classLabel: '8-А',
  login: 'legacy_user',
  password: 'oldplain',
  role: 'student',
  createdAt: Date.now()
});
localStorage.setItem('qtp_users_v4', JSON.stringify(raw));
const leg = await auth.login('legacy_user', 'oldplain');
assert(leg.ok, 'legacy plaintext login succeeds once');
const raw2 = JSON.parse(localStorage.getItem('qtp_users_v4'));
const legU = raw2.find(u => u.login === 'legacy_user');
assert(legU.passwordHash && !legU.password, 'legacy migrated to passwordHash');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll auth self-tests passed.');
