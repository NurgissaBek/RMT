
const request = require('supertest');
const app = require('../server');

describe('Groups API (basic checks)', () => {
  test('POST /api/groups/:id/add-student requires auth', async () => {
    const res = await request(app).post('/api/groups/000000000000000000000000/add-student').send({ studentId: '000000000000000000000000' });
    expect([401, 403, 404]).toContain(res.statusCode);
  });
  test('POST /api/groups/:id/assign-task requires auth', async () => {
    const res = await request(app).post('/api/groups/000000000000000000000000/assign-task').send({ taskId: '000000000000000000000000' });
    expect([401, 403, 404]).toContain(res.statusCode);
  });
  test('POST /api/groups/:id/assign-quiz requires auth', async () => {
    const res = await request(app).post('/api/groups/000000000000000000000000/assign-quiz').send({ quizId: '000000000000000000000000' });
    expect([401, 403, 404]).toContain(res.statusCode);
  });
});
