const sharedConfig = require('../jest.config.js');

module.exports = {
  ...sharedConfig,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.eslint.json',
    },
  },
};
