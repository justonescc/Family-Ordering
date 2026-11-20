import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, createFamily, ensureTestSchema, registerUser, resetDb } from '../helpers';

beforeAll(ensureTestSchema);
beforeEach(resetDb);

async function setupFamily(username: string) {
  const user = await registerUser(username);
  return createFamily(user.token, { name: `${username}的家`, passphrase: 'meal-pass' });
}

async function createMeal(
  token: string,
  input: { name: string; startTime: string; endTime: string },
) {
  const res = await request(app)
    .post('/api/v1/families/me/meals')
    .set(auth(token))
    .send(input);
  return { status: res.status, body: res.body };
}

describe('餐次配置', () => {
  it('增改删（停用）餐次', async () => {
    const family = await setupFamily('meal-admin');
    const created = await createMeal(family.token, {
      name: '夜宵',
      startTime: '21:00',
      endTime: '01:00',
    });
    expect(created.status).toBe(201);
    const mealId = created.body.data.id as string;

    const list = await request(app).get('/api/v1/families/me/meals').set(auth(family.token));
    expect(list.body.data.map((m: { name: string }) => m.name)).toContain('夜宵');

    const updated = await request(app)
      .put(`/api/v1/families/me/meals/${mealId}`)
      .set(auth(family.token))
      .send({ startTime: '22:00' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.startTime).toBe('22:00');
    expect(updated.body.data.endTime).toBe('01:00');

    const del = await request(app)
      .delete(`/api/v1/families/me/meals/${mealId}`)
      .set(auth(family.token));
    expect(del.status).toBe(200);

    const after = await request(app).get('/api/v1/families/me/meals').set(auth(family.token));
    const meal = after.body.data.find((m: { id: string }) => m.id === mealId);
    expect(meal.enabled).toBe(false);
  });

  it('重名餐次返回 409', async () => {
    const family = await setupFamily('meal-dup');
    await createMeal(family.token, { name: '午餐', startTime: '11:00', endTime: '14:59' });
    const dup = await createMeal(family.token, { name: '午餐', startTime: '12:00', endTime: '13:00' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe(3003);
  });

  it('停用后可复用同名', async () => {
    const family = await setupFamily('meal-reuse');
    const first = await createMeal(family.token, { name: '夜宵', startTime: '21:00', endTime: '23:00' });
    await request(app)
      .delete(`/api/v1/families/me/meals/${first.body.data.id}`)
      .set(auth(family.token));
    const second = await createMeal(family.token, { name: '夜宵', startTime: '22:00', endTime: '02:00' });
    expect(second.status).toBe(201);
  });

  it('时间格式非法返回 400', async () => {
    const family = await setupFamily('meal-bad');
    const res = await createMeal(family.token, { name: '早餐', startTime: '9:30', endTime: '10:00' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(9004);
  });

  it('起止时间相同返回 400', async () => {
    const family = await setupFamily('meal-same');
    const res = await createMeal(family.token, { name: '早点', startTime: '08:00', endTime: '08:00' });
    expect(res.status).toBe(400);
  });

  it('MEMBER 不能维护餐次（403）', async () => {
    await setupFamily('meal-perm');
    const guest = await registerUser('meal-guest');
    const joined = await request(app)
      .post('/api/v1/families/join')
      .set(auth(guest.token))
      .send({ passphrase: 'meal-pass', nickname: '客人' });
    const res = await createMeal(joined.body.data.token, {
      name: '午餐',
      startTime: '11:00',
      endTime: '14:00',
    });
    expect(res.status).toBe(403);
  });
});
