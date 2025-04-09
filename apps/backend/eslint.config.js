// ./backend/eslint.config.js
import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPluginRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      'drizzle/',
      'drizzle.config.ts',
      'eslint.config.js', // Ignore the config file itself
    ],
  },

  // Base ESLint recommended rules
  eslintJs.configs.recommended,

  // TypeScript specific configurations
  ...tseslint.configs.recommended, // Apply recommended TypeScript rules
  // If you need type-aware linting (more powerful, but slower):
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true, // Automatically find tsconfig.json
        tsconfigRootDir: import.meta.dirname, // Set root for finding tsconfig
      },
    },
  },

  // Configuration for TypeScript files specifically
  {
    files: ['**/*.{ts,tsx}'], // Target only TS files for certain rules if needed
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json', // Point to your tsconfig for type-aware rules if using recommendedTypeChecked
      },
      globals: {
        ...globals.node, // Add Node.js global variables
      },
    },
  },

  // Configuration for JavaScript files (if any, e.g., config files)
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node, // Add Node.js global variables
      },
    },
    rules: {
      // Add specific JS rule overrides here if needed
    },
  },

  // Prettier configuration - Must be last
  prettierPluginRecommended
);
