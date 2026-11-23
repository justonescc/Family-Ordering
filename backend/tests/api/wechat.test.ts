import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app, ensureTestSchema, resetDb } from '../helpers';
import { env } from '../../src/config/env';

beforeAll(ensureTestSchema);
beforeEach(resetDb);

const envMutable = env as unknown as { wechatAppid: string; wechatSecret: string };
const saved = { appid: envMutable.wechatAppid, secret: envMutable.wechatSecret };

beforeEach(() => {
  // 每个用例默认带有效凭据，避免用例间状态泄漏
  envMutable.wechatAppid = 'wx-test-appid';
  envMutable.wechatSecret = 'test-secret';
});

afterAll(() => {
  envMutable.wechatAppid = saved.appid;
  envMutable.wechatSecret = saved.secret;
  vi.unstubAllGlobals();
});

/** mock 微信 jscode2session 响应 */
function mockWx(openid?: string, errmsg?: string) {
  return vi.fn(async () => ({
    json: async () => (openid ? { openid } : { errcode: 40029, errmsg }),
  }));
}

describe('微信小程序登录', () => {
  it('缺 code 返回 9004', async () => {
    const res = await request(app).post('/api/v1/auth/wechat').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(9004);
  });

  it('凭据未配置返回 1007', async () => {
    envMutable.wechatAppid = '';
    envMutable.wechatSecret = '';
    const res = await request(app).post('/api/v1/auth/wechat').send({ code: 'c1' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe(1007);
    // 下一个用例由 beforeEach 恢复凭据
  });

  it('code 换 openid 成功：创建用户并返回 token', async () => {
    vi.stubGlobal('fetch', mockWx('openid-abc'));
    const res = await request(app).post('/api/v1/auth/wechat').send({ code: 'good' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.user.username).toBe('wx_openid-abc');
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.families).toEqual([]);
  });

  it('同一 openid 幂等登录（upsert 不重复建号）', async () => {
    vi.stubGlobal('fetch', mockWx('openid-abc'));
    const first = await request(app).post('/api/v1/auth/wechat').send({ code: 'good1' });
    const second = await request(app).post('/api/v1/auth/wechat').send({ code: 'good2' });
    expect(second.body.data.user.id).toBe(first.body.data.user.id);
  });

  it('微信拒绝 code 返回 1008', async () => {
    vi.stubGlobal('fetch', mockWx(undefined, 'invalid code'));
    const res = await request(app).post('/api/v1/auth/wechat').send({ code: 'bad' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(1008);
    expect(res.body.message).toContain('invalid code');
  });
});
