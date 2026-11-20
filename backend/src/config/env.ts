import dotenv from 'dotenv';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`缺少必需的环境变量: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required(
    'DATABASE_URL',
    isTest
      ? 'postgresql://family:family@localhost:5432/family_ordering_test'
      : undefined,
  ),
  jwtSecret: required('FAMILY_JWT_SECRET', isTest ? 'test-secret' : undefined),
  jwtExpiresIn: process.env.FAMILY_JWT_EXPIRES_IN ?? '30d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
} as const;
