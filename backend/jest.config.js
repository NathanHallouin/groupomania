module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.{js,ts}',
    '**/tests/**/*.spec.{js,ts}',
    '**/__tests__/**/*.{js,ts}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/server.{js,ts}',
    '!src/config/**',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/dist/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: 'tsconfig.json',
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
