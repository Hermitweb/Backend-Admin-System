import type { Config } from 'jest';

const config: Config = {
  // 模块名称映射，将 TypeScript 路径别名映射到 Jest
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/test/$1',
  },

  // 测试环境设置
  testEnvironment: 'node',

  // 默认超时时间
  testTimeout: 10000,

  // 测试运行器
  testRunner: 'jest-circus/runner',

  // 模块加载器配置
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // 转换配置
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },

  // 通配符
  transformIgnorePatterns: [
    'node_modules/(?!(some-package)/)',
  ],

  // 运行时
  runtime: '<rootDir>/node_modules/ts-jest/runtime.js',

  // 输出文件
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['node_modules/', 'dist/', '.mock.ts$'],
  
  // 覆盖率配置
  coverageReporters: ['json', 'text', 'lcov', 'clover'],
  
  // 是否只运行受影响的测试
  watchPathIgnorePatterns: ['coverage/', 'node_modules/', '.tmp/'],

  // 每个测试的配置覆盖
  testPathIgnorePatterns: ['node_modules/', 'dist/'],
  
  // Mock 设置
  setupFilesAfterEnv: ['./src/__tests__/setup.ts'],
  
  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },

  // 收集覆盖率
  collectCoverage: false,

  // verbose - 是否在控制台显示详细的测试结果
  verbose: true,

  // bail - 失败后是否退出
  bail: false,

  // 使用独立的进程运行测试
  workers: 2,

  // 静态模块模拟
  fakeTimers: {
    enableGlobally: true,
  },
};

export default config;
