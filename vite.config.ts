import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@sentry/')) {
              return 'vendor-sentry'
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase'
            }
            if (id.includes('@capacitor/')) {
              return 'vendor-capacitor'
            }
            return 'vendor'
          }

          if (
            id.includes('/src/components/AuthOnboardingGate.tsx') ||
            id.includes('/src/components/auth-gate/') ||
            id.includes('/src/logic/account.ts') ||
            id.includes('/src/logic/authOnboarding.ts')
          ) {
            return 'feature-auth'
          }

          if (
            id.includes('/src/features/recap/EndRoundScreen.tsx') ||
            id.includes('/src/logic/roundRecap') ||
            id.includes('/src/platform/recapSharing.ts')
          ) {
            return 'feature-recap-end-round'
          }

          if (
            id.includes('/src/features/recap/LeaderboardScreen.tsx') ||
            id.includes('/src/features/recap/leaderboardPresentation.ts') ||
            id.includes('/src/logic/holeRecap.ts')
          ) {
            return 'feature-recap-leaderboard'
          }

          if (
            id.includes('/src/features/recap/') ||
            id.includes('/src/components/Recap')
          ) {
            return 'feature-recap-shared'
          }

          if (id.includes('/src/components/hole-results/PersonalCardPreviewModal.tsx')) {
            return 'feature-results-preview'
          }

          if (
            id.includes('/src/features/results/') ||
            id.includes('/src/components/hole-results/')
          ) {
            return 'feature-results'
          }

          if (id.includes('/src/logic/analytics.ts')) {
            return 'feature-analytics'
          }
        },
      },
    },
  },
  // Relative asset paths keep the build compatible with GitHub Pages project URLs.
  base: './',
})
