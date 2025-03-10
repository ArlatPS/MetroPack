export default {
  displayName: 'NotificationsService',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/NotificationsService',
  collectCoverageFrom: [
    'cdk/**/*.ts',
    'shared/**/*.ts',
    'src/**/*.ts',
    '!cdk/main.ts',
    '!cdk.out/**/*',
    '!jest.config.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['lcov', 'text'],
  resetMocks: true,
};
