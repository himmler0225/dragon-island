// End-to-end: the real app against the database in DATABASE_URL (`docker compose up -d` first).
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication;
  const email = `e2e-${Date.now()}@test.local`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health', () =>
    request(app.getHttpServer()).get('/api/health').expect(200)
      .expect(res => expect(res.body.data.status).toBe('ok')));

  it('rejects an unauthenticated request with the standard error shape', () =>
    request(app.getHttpServer()).get('/api/dragons').expect(401)
      .expect(res => expect(res.body.error.code).toBe('UNAUTHORIZED')));

  it('validates the body', () =>
    request(app.getHttpServer()).post('/api/auth/register').send({ email: 'nope' }).expect(400)
      .expect(res => expect(res.body.error.code).toBe('VALIDATION_FAILED')));

  it('registers, gets a starter dragon, and cannot feed it while full', async () => {
    const reg = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email, password: 'secret-pass-1', displayName: 'Tester' }).expect(201);
    const auth = { Authorization: `Bearer ${reg.body.data.accessToken}` };

    const list = await request(app.getHttpServer()).get('/api/dragons').set(auth).expect(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].species).toBe('fire_dragon');

    const feed = await request(app.getHttpServer()).post(`/api/dragons/${list.body.data[0].id}/feed`).set(auth).expect(422);
    expect(feed.body.error.code).toBe('DRAGON_NOT_HUNGRY');
  });
});
