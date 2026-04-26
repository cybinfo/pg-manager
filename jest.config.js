/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock CSS, images, and other static assets (same as next/jest does)
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/setup/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$': '<rootDir>/src/__tests__/setup/__mocks__/fileMock.js',
    '^next/image$': '<rootDir>/src/__tests__/setup/__mocks__/nextImage.js',
    '^next/router$': '<rootDir>/src/__tests__/setup/__mocks__/nextRouter.js',
    '^next/headers$': '<rootDir>/src/__tests__/setup/__mocks__/nextHeaders.js',
    '^next/font/(.*)$': '<rootDir>/src/__tests__/setup/__mocks__/nextFont.js',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/src/__tests__/setup/',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    './src/lib/': {
      statements: 50,
      branches: 40,
      functions: 50,
      lines: 50,
    },
  },
}

module.exports = customJestConfig
