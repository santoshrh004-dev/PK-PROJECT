// C:\Users\User\Desktop\PK\smart-parking\backend\routes\auth.js
const express = require('express');


const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');


router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password required' });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPass = String(password);

    if (!cleanName || !cleanEmail || !cleanPass) {
      return res.status(400).json({ message: 'name, email, password required' });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(cleanPass, 10);
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hash,
      role: 'user',
    });

    const userObj = { _id: user._id, name: user.name, email: user.email, role: user.role };
    const token = issueToken({ id: userObj._id, role: userObj.role });

    return res.json({ token, user: userObj });
  } catch {
    return res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password required' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPass = String(password);

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(cleanPass, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const userObj = { _id: user._id, name: user.name, email: user.email, role: user.role };
    const token = issueToken({ id: userObj._id, role: userObj.role });

    return res.json({ token, user: userObj });
  } catch {
    return res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch {
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
});

router.get('/health', (req, res) => res.json({ ok: true }));

function issueToken({ id, role }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET missing');
  return jwt.sign({ id, role }, secret, { expiresIn: '7d' });
}


module.exports = router;




