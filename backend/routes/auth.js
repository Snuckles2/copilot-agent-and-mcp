const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const USER_ROLES = ['member', 'administrator'];
const DEFAULT_ROLE = 'member';

function normalizeRole(role) {
  return USER_ROLES.includes(role) ? role : DEFAULT_ROLE;
}

function normalizeUsers(users) {
  let changed = false;
  const normalizedUsers = users.map(user => {
    const role = normalizeRole(user.role);
    if (user.role !== role) changed = true;
    return { ...user, role };
  });
  return { users: normalizedUsers, changed };
}

function createAuthRouter({ usersFile, readJSON, writeJSON, authenticateToken, SECRET_KEY }) {
  const router = express.Router();
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post('/register', authRateLimit, (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    if (role !== undefined && !USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Unsupported user role' });
    }
    const normalized = normalizeUsers(readJSON(usersFile));
    const users = normalized.users;
    if (normalized.changed) writeJSON(usersFile, users);
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ message: 'User already exists' });
    }
    users.push({ username, password, role: role || DEFAULT_ROLE, favorites: [] });
    writeJSON(usersFile, users);
    res.status(201).json({ message: 'User registered' });
  });

  router.post('/login', authRateLimit, (req, res) => {
    const { username, password } = req.body;
    const normalized = normalizeUsers(readJSON(usersFile));
    const users = normalized.users;
    if (normalized.changed) writeJSON(usersFile, users);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, username: user.username, role: user.role });
  });

  router.get('/me', authRateLimit, authenticateToken, (req, res) => {
    const normalized = normalizeUsers(readJSON(usersFile));
    if (normalized.changed) writeJSON(usersFile, normalized.users);
    const user = normalized.users.find(candidate => candidate.username === req.user.username);
    if (!user) return res.status(401).json({ message: 'User not found' });
    res.json({ username: user.username, role: user.role });
  });

  return router;
}

createAuthRouter.USER_ROLES = USER_ROLES;
createAuthRouter.DEFAULT_ROLE = DEFAULT_ROLE;
createAuthRouter.normalizeRole = normalizeRole;

module.exports = createAuthRouter;
