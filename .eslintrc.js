//require('jest')

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:jest/recommended'
  ],
  env: {
    'es6': true,
    'node': true,
  },
  parserOptions: {
    'ecmaVersion': 2018
  },
  globals: {
    'debug': true
  },
  rules: {
    'no-unused-vars': ['error', {
      'args': 'none'
    }],
    'jest/no-commented-out-tests': 'off',
    'no-async-promise-executor': 'off',
    // 'no-unused-vars': 'off',
    'no-inner-declarations': 0,
    // 'no-console': 0,
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'never'
    ]
  }
}
