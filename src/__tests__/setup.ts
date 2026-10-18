/**
 * Jest 全局环境设置
 */
import { jest } from '@jest/globals';

// 全局超时设置
jest.setTimeout(10000);

// 模拟 console
global.console = {
  ...console,
  // 在生产环境中禁用某些日志
  error: (msg: string) => {},
  warn: (msg: string) => {},
  info: (msg: string) => {},
};

// 全局 Mock - Redis
jest.mock('../modules/database/redis.service', () => ({
  RedisService: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  })),
}));

// 全局 Mock - Database
jest.mock('../modules/database/database.service', () => ({
  DatabaseService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

// 全局 Mock - Config
jest.mock('../common/config/app.config', () => ({
  defaultConfig: {
    port: 3000,
    env: 'test',
    database: {
      host: 'localhost',
      port: 5432,
      username: 'test',
      password: 'test',
    },
  },
}));

// 清理每个测试后的所有 mock
afterEach(() => {
  jest.clearAllMocks();
});

// 所有测试前的全局准备
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SECRET_KEY = 'test-secret-key';
  process.env.JWT_SECRET = 'test-jwt-secret';
});

// 所有测试后的清理
afterAll(async () => {
  jest.resetModules();
});

export {};
