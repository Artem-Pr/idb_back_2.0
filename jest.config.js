module.exports = {
  prettierPath: null,
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/dto/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '^@tus/server$': '<rootDir>/../__mocks__/tusServer.ts',
    '^@tus/file-store$': '<rootDir>/../__mocks__/tusFileStore.ts',
  },
};
