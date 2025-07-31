/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/unit/**/*.test.[jt]s?(x)',
    '**/__tests__/integration/**/*.test.[jt]s?(x)'
  ],
  
  // TypeScript support
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'lib/actions/**/*.{js,ts}',
    'lib/security/**/*.{js,ts}',
    'app/api/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  
  // Environment variables for testing
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Timeout for longer database operations
  testTimeout: 10000,
};

module.exports = config;