module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:import/recommended', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: true
    }
  },
  ignorePatterns: ['dist', 'coverage', 'node_modules']
};