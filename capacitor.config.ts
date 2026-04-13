import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gimmegolf.app',
  appName: 'Gimme Golf',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      backgroundColor: '#0f2719',
    },
    Sentry: {
      dsn: process.env.VITE_SENTRY_DSN ?? '',
      debug: false,
    },
  },
}

export default config
