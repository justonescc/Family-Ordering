import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, createFamily, ensureTestSchema, registerUser, resetDb } from '../helpers';

beforeAll(ensureTestSchema);
beforeEach(resetDb);

async function setupFamily(username: string) {
  const user = await registerUser(username);
  const family = await createFamily(user.token, {
    name: `${username}的家`,
    passphrase: 'menu-pass',
  });
  return family;
}

async function createCategory(token: string, name: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/families/me/categories')
    .set(auth(token))
    .send({ name });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

describe('菜单维护', () => {
  it('MEMBER 无维护权限（403）', async () => {
    const owner = await setupFamily('menu-owner');
    await request(app)
      .post('/api/v1/families/join')
      .set(auth((await registerUser('menu-guest')).token))
      .send({ passphrase: 'menu-pass', nickname: '客人' });

    const guest = await registerUser('menu-guest2');
    const joined = await request(app)
      .post('/api/v1/families/join')
      .set(auth(guest.token))
      .send({ passphrase: 'menu-pass', nickname: '客人2' });
    const guestToken = joined.body.data.token as string;

    const res = await request(app)
      .post('/api/v1/families/me/categories')
      .set(auth(guestToken))
      .send({ name: '素菜' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(9003);

    const ownerId = owner.family!.id;
    expect(ownerId).toBeTruthy();
  });

  it('ADMIN 增改删分类与菜品', async () => {
    const family = await setupFamily('menu-admin');
    const token = family.token;

    const categoryId = await createCategory(token, '荤菜');

    const dishRes = await request(app)
      .post('/api/v1/families/me/dishes')
      .set(auth(token))
      .send({ categoryId, name: '红烧肉', description: '下饭' });
    expect(dishRes.status).toBe(201);
    const dishId = dishRes.body.data.id as string;

    // 改菜
    const updateRes = await request(app)
      .put(`/api/v1/families/me/dishes/${dishId}`)
      .set(auth(token))
      .send({ description: '肥而不腻' });
    expect(updateRes.body.data.description).toBe('肥而不腻');

    // 改分类
    const catUpdate = await request(app)
      .put(`/api/v1/families/me/categories/${categoryId}`)
      .set(auth(token))
      .send({ name: '家常荤菜' });
    expect(catUpdate.body.data.name).toBe('家常荤菜');

    // 菜单可见
    const menu = await request(app).get('/api/v1/menu').set(auth(token));
    expect(menu.body.data[0].category.name).toBe('家常荤菜');
    expect(menu.body.data[0].dishes[0].name).toBe('红烧肉');

    // 删菜后删分类
    await request(app).delete(`/api/v1/families/me/dishes/${dishId}`).set(auth(token));
    const delCat = await request(app)
      .delete(`/api/v1/families/me/categories/${categoryId}`)
      .set(auth(token));
    expect(delCat.status).toBe(200);
  });

  it('同分类下菜品重名返回 409', async () => {
    const family = await setupFamily('menu-dup');
    const categoryId = await createCategory(family.token, '素菜');
    await request(app)
      .post('/api/v1/families/me/dishes')
      .set(auth(family.token))
      .send({ categoryId, name: '麻婆豆腐' });
    const res = await request(app)
      .post('/api/v1/families/me/dishes')
      .set(auth(family.token))
      .send({ categoryId, name: '麻婆豆腐' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(2005);
  });

  it('分类下有菜品时不能删除（409）', async () => {
    const family = await setupFamily('menu-del');
    const categoryId = await createCategory(family.token, '汤羹');
    await request(app)
      .post('/api/v1/families/me/dishes')
      .set(auth(family.token))
      .send({ categoryId, name: '紫菜蛋花汤' });
    const res = await request(app)
      .delete(`/api/v1/families/me/categories/${categoryId}`)
      .set(auth(family.token));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(2002);
  });

  it('分类重名返回 409', async () => {
    const family = await setupFamily('menu-catdup');
    await createCategory(family.token, '主食');
    const res = await request(app)
      .post('/api/v1/families/me/categories')
      .set(auth(family.token))
      .send({ name: '主食' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(2003);
  });
});
