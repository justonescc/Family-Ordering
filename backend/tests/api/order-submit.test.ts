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
import { prisma } from '../../src/config/prisma';
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

describe('POST /orders/submit（批量提交）', () => {
  it('批量落库菜库菜与自定义菜并返回该成员全量', async () => {
    const s = await setup('submit-a');
    const res = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({
        mealId: s.mealId,
        date: s.date,
        items: [
          { dishId: s.dishId, qty: 2 },
          { dishName: '爸爸牌卤味', qty: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dishName: '红烧肉', qty: 2, dishId: s.dishId }),
        expect.objectContaining({ dishName: '爸爸牌卤味', qty: 1, dishId: null }),
      ]),
    );

    const mine = await request(app)
      .get('/api/v1/orders/my')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    expect(mine.body.data).toHaveLength(2);
  });

  it('qty=0 删除已存在项', async () => {
    const s = await setup('submit-b');
    const base = { mealId: s.mealId, date: s.date };

    await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ ...base, items: [{ dishId: s.dishId, qty: 2 }] });

    const res = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ ...base, items: [{ dishId: s.dishId, qty: 0 }] });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('同名项归并以最后一次为准', async () => {
    const s = await setup('submit-c');
    const res = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({
        mealId: s.mealId,
        date: s.date,
        items: [
          { dishName: '妈妈牌凉菜', qty: 1 },
          { dishName: ' 妈妈牌凉菜 ', qty: 3 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ dishName: '妈妈牌凉菜', qty: 3 });
  });

  it('部分项非法整体回滚（前面的合法项也不落库）', async () => {
    const s = await setup('submit-d');
    const res = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({
        mealId: s.mealId,
        date: s.date,
        items: [
          { dishId: s.dishId, qty: 2 },
          { dishId: 'nonexistent-dish-id', qty: 1 },
        ],
      });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(2004);

    const mine = await request(app)
      .get('/api/v1/orders/my')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));
    expect(mine.body.data).toHaveLength(0);
  });

  it('items 超过 100 拒绝', async () => {
    const s = await setup('submit-e');
    const items = Array.from({ length: 101 }, (_, i) => ({ dishName: `菜${i}`, qty: 1 }));
    const res = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ mealId: s.mealId, date: s.date, items });

    expect(res.status).toBe(400);
  });

  it('items 为空 / qty 越界拒绝', async () => {
    const s = await setup('submit-f');
    const base = { mealId: s.mealId, date: s.date };

    const empty = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ ...base, items: [] });
    expect(empty.status).toBe(400);

    const badQty = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ ...base, items: [{ dishId: s.dishId, qty: 100 }] });
    expect(badQty.status).toBe(400);
  });

  it('餐次不属于本家庭拒绝', async () => {
    const s = await setup('submit-g');
    const other = await registerUser('submit-g-other');
    const otherFamily = await createFamily(other.token, {
      name: '别人家',
      passphrase: 'other-pass',
    });
    const otherMeal = await request(app)
      .post('/api/v1/families/me/meals')
      .set(auth(otherFamily.token))
      .send({ name: '晚餐', startTime: '00:00', endTime: '23:59' });

    const res = await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({
        mealId: otherMeal.body.data.id,
        date: s.date,
        items: [{ dishName: '偷点菜', qty: 1 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(3001);
  });
});

describe('GET /orders/summary-members（成员点菜状态）', () => {
  it('返回已点/未点名单', async () => {
    const s = await setup('status-a');
    const mom = await addMember('status-a-mom', 'order-pass', '妈妈');

    await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ mealId: s.mealId, date: s.date, items: [{ dishId: s.dishId, qty: 1 }] });

    const res = await request(app)
      .get('/api/v1/orders/summary-members')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));

    expect(res.status).toBe(200);
    const byNickname = new Map<string, { nickname: string; ordered: boolean }>(
      res.body.data.map((m: { nickname: string; ordered: boolean }) => [m.nickname, m]),
    );
    expect(byNickname.get('status-a')?.ordered).toBe(true);
    expect(byNickname.get('妈妈')?.ordered).toBe(false);
    expect(mom).toBeTruthy();
  });

  it('无餐次单时不惰性创建，全部 ordered=false', async () => {
    const s = await setup('status-b');
    await addMember('status-b-mom', 'order-pass', '妈妈');

    const res = await request(app)
      .get('/api/v1/orders/summary-members')
      .query({ mealId: s.mealId, date: s.date })
      .set(auth(s.admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((m: { ordered: boolean }) => m.ordered === false)).toBe(true);

    const orderCount = await prisma.mealOrder.count({
      where: { familyId: s.admin.family?.id ?? '', mealId: s.mealId },
    });
    expect(orderCount).toBe(0);
  });

  it('qty 全部删除后视为未点', async () => {
    const s = await setup('status-c');
    const base = { mealId: s.mealId, date: s.date };
    await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ ...base, items: [{ dishId: s.dishId, qty: 1 }] });
    await request(app)
      .post('/api/v1/orders/submit')
      .set(auth(s.admin.token))
      .send({ ...base, items: [{ dishId: s.dishId, qty: 0 }] });

    const res = await request(app)
      .get('/api/v1/orders/summary-members')
      .query(base)
      .set(auth(s.admin.token));
    expect(res.body.data[0]).toMatchObject({ ordered: false });
  });

  it('餐次不属于本家庭拒绝', async () => {
    const s = await setup('status-d');
    const res = await request(app)
      .get('/api/v1/orders/summary-members')
      .query({ mealId: 'nonexistent-meal', date: s.date })
      .set(auth(s.admin.token));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(3001);
  });
});
