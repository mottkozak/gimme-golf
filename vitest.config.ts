import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupComponentTests.ts'],
    include: ['src/**/*.component.test.tsx'],
    reporters: ['default'],
    retry: 0,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/component',
      reporter: ['text', 'lcov'],
      include: [
        'src/features/home/HomeScreen.tsx',
        'src/features/setup/RoundSetupScreen.tsx',
      ],
      thresholds: {
        branches: 30,
        functions: 25,
        lines: 40,
        statements: 40,
      },
    },
  },
})
