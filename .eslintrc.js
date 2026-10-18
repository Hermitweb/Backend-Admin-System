module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 2021,
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'import'],
  extends: [
    // NestJS 规范
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    
    // NestJS 官方推荐配置 (如果使用 nestjs/eslint-plugin)
    // 'plugin:@nestjs/recommended',
    
    // TypeScript 规则
    'eslint:recommended',
    
    // 安全规则
    'plugin:security/recommended',
    
    // 基础风格
    'prettier',
  ],
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
  rules: {
    // Typescript 规则
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // 导入顺序规则
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-duplicates': 'error',
    
    // 代码质量规则
    'no-console': ['warn', { allow: ['log', 'warn', 'error'] }],
    'no-debugger': 'warn',
    
    // 安全规则
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-object-injection': 'warn',
    
    // 最佳实践
    curly: ['error', 'all'],
    eqeqeq: ['error', 'smart'],
    'prefer-const': 'error',
    'no-var': 'error',
    
    // 允许在某些情况下使用 any
    '@typescript-eslint/ban-ts-comment': [
      'warn',
      {
        'ts-ignore': 'allow-with-description',
      },
    ],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '**/*.js'],
  overrides: [
    {
      files: ['*.spec.ts', '*.test.ts'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
      },
    },
  ],
  reportUnusedDisableDirectives: true,
};
