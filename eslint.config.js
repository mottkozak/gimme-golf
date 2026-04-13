import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const FEATURE_NAMES = ['home', 'setup', 'hole-play', 'results', 'recap']

const FEATURE_BOUNDARY_CONFIGS = FEATURE_NAMES.map((featureName) => {
  const blockedFeaturePatterns = FEATURE_NAMES.filter((name) => name !== featureName).flatMap(
    (name) => [
      `../${name}/*`,
      `../${name}/**`,
      `../../features/${name}/*`,
      `../../features/${name}/**`,
    ],
  )

  return {
    files: [`src/features/${featureName}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: blockedFeaturePatterns,
              message:
                'Feature modules must not import other feature modules directly. Use shared modules or app orchestration.',
            },
          ],
        },
      ],
    },
  }
})

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/{app,components,features}/**/*.{ts,tsx}'],
    rules: {
      complexity: ['error', { max: 45 }],
      'max-lines': ['error', { max: 900, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/logic/**/*.{ts,tsx}'],
    ignores: ['src/logic/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Domain logic cannot depend on React.',
            },
            {
              name: 'react-dom',
              message: 'Domain logic cannot depend on React.',
            },
          ],
          patterns: [
            {
              group: ['@capacitor/*', '**/capacitor.ts', '**/capacitor/*'],
              message: 'Domain logic must go through src/platform adapters, not native APIs directly.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'Domain logic must use src/platform adapters for browser APIs.',
        },
        {
          name: 'document',
          message: 'Domain logic must use src/platform adapters for browser APIs.',
        },
        {
          name: 'navigator',
          message: 'Domain logic must use src/platform adapters for browser APIs.',
        },
        {
          name: 'localStorage',
          message: 'Domain logic must use src/platform/storage.ts.',
        },
      ],
    },
  },
  ...FEATURE_BOUNDARY_CONFIGS,
])
