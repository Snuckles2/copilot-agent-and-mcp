const request = require('supertest');
const express = require('express');
const createApiRouter = require('../routes');
const path = require('path');

const app = express();
app.use(express.json());
app.use('/api', createApiRouter({
  usersFile: path.join(__dirname, '../data/test-users.json'),
  booksFile: path.join(__dirname, '../data/test-books.json'),
  readJSON: (file) => require('fs').existsSync(file) ? JSON.parse(require('fs').readFileSync(file, 'utf-8')) : [],
  writeJSON: (file, data) => require('fs').writeFileSync(file, JSON.stringify(data, null, 2)),
  authenticateToken: (req, res, next) => {
    req.user = { username: 'testuser' };
    next();
  },
  SECRET_KEY: 'test_secret',
}));

describe('Auth API', () => {
  const testUser = { username: 'testuser', password: 'testpass' };

  it('POST /api/register should fail with missing fields', async () => {
    const res = await request(app).post('/api/register').send({ username: '' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/register should succeed with valid data', async () => {
    const res = await request(app).post('/api/register').send(testUser);
    // 201 or 409 if already exists
    expect([201, 409]).toContain(res.statusCode);
  });

  it('POST /api/register should fail if user already exists', async () => {
    await request(app).post('/api/register').send(testUser); // ensure exists
    const res = await request(app).post('/api/register').send(testUser);
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/login should succeed with correct credentials', async () => {
    await request(app).post('/api/register').send(testUser); // ensure exists
    const res = await request(app).post('/api/login').send(testUser);
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe('member');
  });

  it('GET /api/me should expose the authenticated user role', async () => {
    const res = await request(app).get('/api/me');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ username: 'testuser', role: 'member' });
  });

  it('should default existing users and persist a supplied role', async () => {
    const usersFile = path.join(__dirname, '../data/test-users.json');
    const fs = require('fs');
    fs.writeFileSync(usersFile, JSON.stringify([{ username: 'legacy', password: 'pass', favorites: [] }]));
    const register = await request(app).post('/api/register').send({ username: 'admin', password: 'pass', role: 'administrator' });
    expect(register.statusCode).toBe(201);
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    expect(users.find(user => user.username === 'legacy').role).toBe('member');
    expect(users.find(user => user.username === 'admin').role).toBe('administrator');
  });

  it('should reject unsupported roles', async () => {
    const res = await request(app).post('/api/register').send({ username: 'invalid', password: 'pass', role: 'owner' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/login should fail with wrong password', async () => {
    const res = await request(app).post('/api/login').send({ username: testUser.username, password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/login should fail with missing fields', async () => {
    const res = await request(app).post('/api/login').send({ username: '' });
    expect(res.statusCode).toBe(401);
  });
});
