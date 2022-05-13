module.exports = {
  testMatch: ['**/*.test.(j|t)s'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '.js': 'jest-esm-transformer',
  },
};
