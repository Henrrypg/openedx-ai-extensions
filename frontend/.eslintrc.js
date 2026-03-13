// eslint-disable-next-line import/no-extraneous-dependencies
const { createConfig } = require('@openedx/frontend-build');

const config = createConfig('eslint');

config.rules = {
  ...config.rules,
  'import/no-unresolved': ['error', {
    ignore: ['@openedx/openedx-ai-extensions-ui'],
  }],
};

module.exports = config;
