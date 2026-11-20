import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, ensureTestSchema, resetDb } from '../helpers';

beforeAll(ensureTestSchema);
beforeEach(resetDb);

describe('账号接口', () => {
  it('注册成功返回 token 与空家庭列表', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'alice', password: 'pass12345' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.families).toEqual([]);
  });

  it('用户名重复返回 1001', async () => {
    await request(app).post('/api/v1/auth/register').send({ username: 'bob', password: 'pass12345' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'bob', password: 'pass12345' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(1001);
  });

  it('密码过短被校验拦截', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'carol', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(9004);
  });

  it('登录成功', async () => {
    await request(app).post('/api/v1/auth/register').send({ username: 'dave', password: 'pass12345' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'dave', password: 'pass12345' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('密码错误返回 1002', async () => {
    await request(app).post('/api/v1/auth/register').send({ username: 'erin', password: 'pass12345' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'erin', password: 'wrong-pass' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(1002);
  });

  it('缺少 token 访问家庭列表返回 9002', async () => {
    const res = await request(app).get('/api/v1/families');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(9002);
  });

  it('伪造 token 返回 9002', async () => {
    const res = await request(app).get('/api/v1/families').set(auth('not-a-real-token'));
    expect(res.status).toBe(401);
  });
});
