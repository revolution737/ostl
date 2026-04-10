// routes/auth.js — Authentication layer for developers
const express = require('express');
const crypto = require('crypto');
const db = require('../db/pool');

const router = express.Router();

// Configuration for PBKDF2
const ITERATIONS = 10000;
const KEYLEN = 64;
const DIGEST = 'sha512';

// Utility to hash password
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `${salt}:${derivedKey}`;
}

// Utility to verify password
function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return key === derivedKey;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const { rows: existing } = await db.query('SELECT id FROM developers WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const secureHash = hashPassword(password);
    const { rows } = await db.query(`
      INSERT INTO developers (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `, [name, email, secureHash]);

    console.log(`[auth] Registered new developer: ${name} (${email})`);
    res.status(201).json({
      message: 'Registration successful',
      developer: rows[0]
    });
  } catch (err) {
    console.error('[auth] Signup error:', err.message);
    res.status(500).json({ error: 'Failed to register developer' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await db.query('SELECT * FROM developers WHERE email = $1', [email]);
    const developer = rows[0];

    if (!developer || !verifyPassword(password, developer.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[auth] Developer logged in: ${developer.name}`);

    // Clean payload for client mapping
    const safePayload = {
      id: developer.id,
      name: developer.name,
      email: developer.email,
      created_at: developer.created_at
    };

    res.status(200).json({
      message: 'Login successful',
      developer: safePayload
    });
  } catch (err) {
    console.error('[auth] Login error:', err.message);
    res.status(500).json({ error: 'Failed to authenticate process' });
  }
});

module.exports = router;
