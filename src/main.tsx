import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/screens/mobile.css'
import './styles/themes.css'
import './styles/app.css'

interface AppErrorBoundaryState {
  hasError: boolean
}

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(): void {
    // Keep fallback local and lightweight; telemetry is handled by deferred reporting bootstrap.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <p className="home-warning-text">Unexpected error. Please restart the app.</p>
    }

    return this.props.children
  }
}

function bootstrapErrorReporting(): void {
  const loadErrorReporting = () => {
    void import('./app/errorReporting.ts')
      .then(({ initErrorReporting }) => {
        initErrorReporting()
      })
      .catch(() => {
        // Startup should not fail if error reporting bootstrap fails.
      })
  }

  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(loadErrorReporting, { timeout: 2_000 })
    return
  }

  window.setTimeout(loadErrorReporting, 300)
}

bootstrapErrorReporting()

function isNativePlatform(): boolean {
  const capacitorBridge = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean }
  }).Capacitor
  return Boolean(capacitorBridge?.isNativePlatform?.())
}

function clearLegacyRuntimeCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return Promise.resolve()
  }

  return caches
    .keys()
    .then((cacheKeys) =>
      Promise.all(
        cacheKeys
          .filter((cacheKey) => cacheKey.startsWith('gimme-golf-'))
          .map((cacheKey) => caches.delete(cacheKey)),
      ),
    )
    .then(() => undefined)
    .catch(() => undefined)
}

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    if (isNativePlatform()) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined)
        .then(() => clearLegacyRuntimeCaches())
      return
    }

    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  })
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
