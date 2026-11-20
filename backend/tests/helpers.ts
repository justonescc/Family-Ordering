import { execSync } from 'node:child_process';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

export const app = createApp();

/** 确保测试库已应用全部迁移（幂等） */
export function ensureTestSchema(): void {
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env },
    stdio: 'ignore',
  });
}

export async function resetDb(): Promise<void> {
  await prisma.orderItem.deleteMany();
  await prisma.mealOrder.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.category.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.family.deleteMany();
  await prisma.user.deleteMany();
}

export interface TestUser {
  token: string;
  user: { id: string; username: string };
  family: { id: string; name: string } | null;
  member: {
    id: string;
    familyId: string;
    userId: string;
    nickname: string;
    avatar: string;
    role: 'ADMIN' | 'MEMBER';
  } | null;
  families: { id: string; name: string; role: string; nickname: string; avatar: string }[];
}

export async function registerUser(username: string, password = 'pass12345'): Promise<TestUser> {
  const res = await request(app).post('/api/v1/auth/register').send({ username, password });
  if (res.status !== 201) {
    throw new Error(`注册失败: ${JSON.stringify(res.body)}`);
  }
  return res.body.data as TestUser;
}

export async function createFamily(
  token: string,
  input: { name: string; passphrase: string; nickname?: string; avatar?: string },
): Promise<TestUser> {
  const res = await request(app)
    .post('/api/v1/families')
    .set('Authorization', `Bearer ${token}`)
    .send(input);
  if (res.status !== 201) {
    throw new Error(`创建家庭失败: ${JSON.stringify(res.body)}`);
  }
  return res.body.data as TestUser;
}

export async function joinFamily(
  token: string,
  input: { passphrase: string; nickname?: string; avatar?: string },
): Promise<TestUser> {
  const res = await request(app)
    .post('/api/v1/families/join')
    .set('Authorization', `Bearer ${token}`)
    .send(input);
  return res;
}

export async function enterFamily(token: string, familyId: string): Promise<TestUser> {
  const res = await request(app)
    .post(`/api/v1/families/${familyId}/enter`)
    .set('Authorization', `Bearer ${token}`)
    .send({});
  if (res.status !== 200) {
    throw new Error(`切换家庭失败: ${JSON.stringify(res.body)}`);
  }
  return res.body.data as TestUser;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
