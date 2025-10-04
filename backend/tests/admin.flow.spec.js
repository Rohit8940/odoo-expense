const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin');
const { createFixtures, cleanup } = require('./_prisma');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

let fx;

beforeAll(async () => {
  fx = await createFixtures();
});

afterAll(async () => {
  await cleanup(fx.company.id);
});

test('create or update flow', async () => {
  const res = await request(app).post('/api/admin/flow').send({
    me: fx.admin.id,
    name: 'Miscellaneous',
    description: 'desc',
    useManagerAsFirstApprover: true,
    isSequential: true,
    approvers: [{ userId: fx.admin.id, required: true }],
    requiredPercent: 60,
    specificApproverId: null
  });
  expect([200, 201]).toContain(res.statusCode);
  expect(res.body.flow).toBeTruthy();
  expect(res.body.flow.useManagerAsFirstApprover).toBe(true);
});

test('send temp password', async () => {
  const res = await request(app).post(`/api/admin/users/${fx.target.id}/send-password`).send();
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
