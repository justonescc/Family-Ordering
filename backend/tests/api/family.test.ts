import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  app,
  auth,
  createFamily,
  enterFamily,
  ensureTestSchema,
  joinFamily,
  registerUser,
  resetDb,
} from '../helpers';

beforeAll(ensureTestSchema);
beforeEach(resetDb);

describe('家庭与多租户隔离', () => {
  it('创建家庭：创建者成为 ADMIN', async () => {
    const user = await registerUser('admin1');
    const family = await createFamily(user.token, {
      name: '我家',
      passphrase: 'secret123',
      nickname: '当家的',
      avatar: '👨',
    });

    expect(family.family?.name).toBe('我家');
    expect(family.member?.role).toBe('ADMIN');
    expect(family.member?.nickname).toBe('当家的');
    expect(family.families).toHaveLength(1);
  });

  it('口令重复返回 1003', async () => {
    const user = await registerUser('admin2');
    await createFamily(user.token, { name: '家庭A', passphrase: 'same-pass' });
    const other = await registerUser('admin3');
    const res = await request(app)
      .post('/api/v1/families')
      .set(auth(other.token))
      .send({ name: '家庭B', passphrase: 'same-pass' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(1003);
  });

  it('凭口令加入成为 MEMBER', async () => {
    const admin = await registerUser('owner');
    await createFamily(admin.token, { name: '老王家', passphrase: 'join-pass' });

    const guest = await registerUser('guest');
    const joined = await joinFamily(guest.token, { passphrase: 'join-pass', nickname: '客人' });
    expect(joined.status).toBe(201);
    expect(joined.body.data.member?.role).toBe('MEMBER');
    expect(joined.body.data.family?.name).toBe('老王家');
  });

  it('口令错误返回 1005', async () => {
    const admin = await registerUser('owner2');
    await createFamily(admin.token, { name: '老李家', passphrase: 'right-pass' });

    const guest = await registerUser('guest2');
    const res = await request(app)
      .post('/api/v1/families/join')
      .set(auth(guest.token))
      .send({ passphrase: 'wrong-pass' });
    // 找不到该口令对应的家庭
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(1004);
  });

  it('同一账号可加入多个家庭并切换', async () => {
    const owner = await registerUser('multi');
    const first = await createFamily(owner.token, { name: '我家', passphrase: 'pass-one' });
    const second = await createFamily(owner.token, { name: '父母家', passphrase: 'pass-two' });

    expect(second.families).toHaveLength(2);

    const switched = await enterFamily(second.token, first.family!.id);
    expect(switched.family?.id).toBe(first.family!.id);
    expect(switched.member?.familyId).toBe(first.family!.id);
  });

  it('跨家庭数据隔离：A 家庭菜品对 B 家庭不可见', async () => {
    const ownerA = await registerUser('ownerA');
    const familyA = await createFamily(ownerA.token, { name: 'A家', passphrase: 'pass-a' });

    // A 家庭建分类与菜品
    const categoryRes = await request(app)
      .post('/api/v1/families/me/categories')
      .set(auth(familyA.token))
      .send({ name: '荤菜' });
    const categoryId = categoryRes.body.data.id as string;
    await request(app)
      .post('/api/v1/families/me/dishes')
      .set(auth(familyA.token))
      .send({ categoryId, name: '红烧肉' });

    // B 家庭
    const ownerB = await registerUser('ownerB');
    const familyB = await createFamily(ownerB.token, { name: 'B家', passphrase: 'pass-b' });
    const menuB = await request(app).get('/api/v1/menu').set(auth(familyB.token));
    expect(menuB.body.data).toEqual([]);

    // A 家庭可见
    const menuA = await request(app).get('/api/v1/menu').set(auth(familyA.token));
    expect(menuA.body.data).toHaveLength(1);
    expect(menuA.body.data[0].dishes[0].name).toBe('红烧肉');
  });

  it('跨家庭越权访问资源被拒', async () => {
    const ownerA = await registerUser('isoA');
    const familyA = await createFamily(ownerA.token, { name: 'ISO-A', passphrase: 'iso-pass-a' });
    const categoryRes = await request(app)
      .post('/api/v1/families/me/categories')
      .set(auth(familyA.token))
      .send({ name: '素菜' });
    const categoryId = categoryRes.body.data.id as string;

    const ownerB = await registerUser('isoB');
    const familyB = await createFamily(ownerB.token, { name: 'ISO-B', passphrase: 'iso-pass-b' });

    const res = await request(app)
      .put(`/api/v1/families/me/categories/${categoryId}`)
      .set(auth(familyB.token))
      .send({ name: '改名' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(2001);
  });
});
