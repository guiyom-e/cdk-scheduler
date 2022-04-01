module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.(j|t)s'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '.js': 'jest-esm-transformer',
  },
};
