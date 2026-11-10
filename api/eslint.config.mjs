import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: [
      'src/shared/domain/**/*.ts',
      'src/modules/*/domain/**/*.ts',
      'src/modules/*/application/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['@nestjs/*', '@prisma/*', '**/infrastructure/*', '**/presentation/*'] },
      ],
    },
  },
);
