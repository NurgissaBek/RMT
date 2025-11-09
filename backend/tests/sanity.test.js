
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // server should export app for tests or we adapt

describe('API tests (placeholder)', () => {
  test('sanity - GET /api/groups should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/groups');
    expect([401, 403]).toContain(res.statusCode);
  }, 10000);
});
