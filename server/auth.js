'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'qazaq-tili-pro-140-mektep-secret-v2';
const SCHOOL_CODE = '140MEKTEP';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, login: user.login, class_id: user.class_id || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.cookies && req.cookies.token) || null;
  if (!token) {
    return res.status(401).json({ error: 'Кіру қажет' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getDb().prepare('SELECT id, name, login, role, class_id FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Пайдаланушы табылмады' });
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Сессия жарамсыз' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }
    next();
  };
}

function publicUser(u) {
  if (!u) return null;
  let classInfo = null;
  if (u.class_id) {
    classInfo = getDb().prepare('SELECT id, grade, name FROM classes WHERE id = ?').get(u.class_id);
  }
  return {
    id: u.id,
    name: u.name,
    login: u.login,
    role: u.role,
    class_id: u.class_id || null,
    class: classInfo
  };
}

module.exports = {
  hashPassword,
  signToken,
  authMiddleware,
  requireRole,
  publicUser,
  SCHOOL_CODE,
  JWT_SECRET
};
