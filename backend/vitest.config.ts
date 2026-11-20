import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    // 测试共用同一个数据库，必须串行执行，避免 resetDb 互相清库
    fileParallelism: false,
    sequence: { concurrent: false },
    // 集成测试涉及真实数据库，机器繁忙时留足余量
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://family:family@localhost:5432/family_ordering_test',
      FAMILY_JWT_SECRET: 'test-secret',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/config/**'],
    },
  },
});
