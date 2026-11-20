import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  app,
  auth,
  createFamily,
  ensureTestSchema,
  registerUser,
  resetDb,
  type TestUser,
} from '../helpers';
import { getShanghaiDateStr } from '../../src/utils/shanghai';

beforeAll(ensureTestSchema);
beforeEach(resetDb);

interface Setup {
  admin: TestUser;
  dishId: string;
  mealId: string;
  date: string;
}

async function setup(username: string): Promise<Setup> {
  const user = await registerUser(username);
  const family = await createFamily(user.token, {
    name: `${username}的家`,
    passphrase: 'order-pass',
  });

  const category = await request(app)
    .post('/api/v1/families/me/categories')
    .set(auth(family.token))
    .send({ name: '荤菜' });
  const dish = await request(app)
    .post('/api/v1/families/me/dishes')
    .set(auth(family.token))
    .send({ categoryId: category.body.data.id, name: '红烧肉' });
  const meal = await request(app)
    .post('/api/v1/families/me/meals')
    .set(auth(family.token))
    .send({ name: '午餐', startTime: '00:00', endTime: '23:59' });

  return {
    admin: family,
    dishId: dish.body.data.id as string,
    mealId: meal.body.data.id as string,
    date: getShanghaiDateStr(),
  };
}

async function addMember(username: string, passphrase: string, nickname: string) {
  const user = await registerUser(username);
  const res = await request(app)
    .post('/api/v1/families/join')
    .set(auth(user.token))
    .send({ passphrase, nickname });
  return res.body.data.token as string;
}

describe('点菜与总单', () => {
  it('加点、改份数、删除（qty=0）', async () => {
    const s = await setup('order-a');
    const base = { mealId: s.mealId, date: s.date };

    const added = await request(app)
      .put('/api/v1/orders/my')
      .set(auth(s.admin.token))
      .send({ ...base, dishId: s.dishId, qty: 2 });
    expect(added.status).toBe(200);
    expect(added.body.data).toHaveLength(1);
    expect(added.body.data[0]).toMatchObject({ dishName: '红烧肉', qty: 2, struck: false });

    const updated = await request(app)
      .put('/api/v1/orders/my')
      .set(auth(s.admin.token))
      .send({ ...base, dishId: s.dishId, qty: 3 });
    expect(updated.body.data[0].qty).toBe(3);

    const removed = await request(app)
      .put('/api/v1/orders/my')
      .set(auth(s.admin.token))
      .send({ ...base, dishId: s.dishId, qty: 0 });
    expect(removed.body.data).toHaveLength(0);
  });

  it('总单按菜名合并并标注点菜人', async () => {
    const s = await setup('order-b');
    const mom = await addMember('order-b-mom', 'order-pass', '妈妈');

    await request(app)
      .put('/api/v1/orders/my')
      .set(auth(s.admin.token))
      .send({ mealId: s.mealId, date: s.date, dishId: s.dishId, qty: 2 });
    await request(app)
      .put('/api/v1/orders/my')
      .set(auth(mom))
      .send({ mealId: s.mealId, date: s.date, dishId: s.dishId, qty: 1 });

    const res = await request(app)
      .get('/api/v1/orders/summary')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const group = res.body.data[0];
    expect(group.dishName).toBe('红烧肉');
    expect(group.qty).toBe(3);
    expect(group.struck).toBe(false);
    expect(group.members.map((m: { nickname: string }) => m.nickname).sort()).toEqual([
      'order-b',
      '妈妈',
    ]);
  });

  it('自定义菜名参与汇总', async () => {
    const s = await setup('order-c');
    await request(app)
      .put('/api/v1/orders/my')
      .set(auth(s.admin.token))
      .send({ mealId: s.mealId, date: s.date, dishName: '爸爸牌卤味', qty: 1 });

    const res = await request(app)
      .get('/api/v1/orders/summary')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    expect(res.body.data[0]).toMatchObject({ dishName: '爸爸牌卤味', qty: 1 });
  });

  it('划掉置灰（组内全部划掉才置灰）', async () => {
    const s = await setup('order-d');
    const mom = await addMember('order-d-mom', 'order-pass', '妈妈');

    await request(app)
      .put('/api/v1/orders/my')
      .set(auth(s.admin.token))
      .send({ mealId: s.mealId, date: s.date, dishId: s.dishId, qty: 1 });
    const momItems = await request(app)
      .put('/api/v1/orders/my')
      .set(auth(mom))
      .send({ mealId: s.mealId, date: s.date, dishId: s.dishId, qty: 1 });

    const momItemId = momItems.body.data[0].id as string;
    await request(app)
      .patch(`/api/v1/orders/items/${momItemId}/struck`)
      .set(auth(s.admin.token))
      .send({ struck: true });

    const summary = await request(app)
      .get('/api/v1/orders/summary')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    // 另一人未划掉，整组不置灰
    expect(summary.body.data[0].struck).toBe(false);

    const adminItems = await request(app)
      .get('/api/v1/orders/my')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    await request(app)
      .patch(`/api/v1/orders/items/${adminItems.body.data[0].id}/struck`)
      .set(auth(s.admin.token))
      .send({ struck: true });

    const after = await request(app)
      .get('/api/v1/orders/summary')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    expect(after.body.data[0].struck).toBe(true);
  });

  it('跨天自动隔离', async () => {
    const s = await setup('order-e');
    await request(app)
      .put('/api/v1/orders/my')
      .set(auth(s.admin.token))
      .send({ mealId: s.mealId, date: s.date, dishId: s.dishId, qty: 2 });

    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const nextDate = getShanghaiDateStr(tomorrow);

    const res = await request(app)
      .get('/api/v1/orders/my')
      .query({ mealId: s.mealId, date: nextDate })
      .set(auth(s.admin.token));
    expect(res.body.data).toHaveLength(0);

    const today = await request(app)
      .get('/api/v1/orders/my')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    expect(today.body.data).toHaveLength(1);
  });

  it('只能查看自己的点餐单', async () => {
    const s = await setup('order-f');
    const mom = await addMember('order-f-mom', 'order-pass', '妈妈');
    await request(app)
      .put('/api/v1/orders/my')
      .set(auth(mom))
      .send({ mealId: s.mealId, date: s.date, dishId: s.dishId, qty: 1 });

    const mine = await request(app)
      .get('/api/v1/orders/my')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    expect(mine.body.data).toHaveLength(0);
  });
});
