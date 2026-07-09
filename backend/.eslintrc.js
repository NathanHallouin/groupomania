module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'plugin:jest/recommended',
    'prettier',
  ],
  plugins: [
    'node',
    'security',
    'jest',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
  },
  rules: {
    // Node.js specific rules
    'node/no-unpublished-require': 'off',
    'node/no-missing-require': 'error',
    'node/no-extraneous-require': 'error',
    
    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    
    // General JavaScript rules
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Import rules
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    
    // Function rules
    'func-names': 'off',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    
    // Object/Array rules
    'object-shorthand': 'error',
    'prefer-destructuring': ['error', { object: true, array: false }],
    
    // String rules
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    
    // Async/await rules
    'no-await-in-loop': 'warn',
    'prefer-promise-reject-errors': 'error',
    
    // Error handling
    'no-throw-literal': 'error',
    
    // Comments
    'spaced-comment': ['error', 'always'],
    
    // Jest specific rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-expressions': 'off',
        'jest/expect-expect': 'off',
      },
    },
    {
      files: ['src/config/*.js'],
      rules: {
        'node/no-process-env': 'off',
      },
    },
  ],
};
