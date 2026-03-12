import { useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import ToggleRow from '../components/ToggleRow.tsx'
import { clearLocalIdentityState } from '../logic/localIdentity.ts'
import {
  applyThemePreference,
  clearPreferences,
  loadNotificationsPreference,
  loadThemePreference,
  saveNotificationsPreference,
  saveThemePreference,
  type ThemePreference,
} from '../logic/preferences.ts'
import type { ScreenProps } from './types.ts'

function SettingsScreen({ onNavigate, onAbandonRound }: ScreenProps) {
  const [theme, setTheme] = useState<ThemePreference>(() => loadThemePreference())
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    loadNotificationsPreference(),
  )
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)

  const setThemePreference = (nextTheme: ThemePreference) => {
    setTheme(nextTheme)
    saveThemePreference(nextTheme)
    applyThemePreference(nextTheme)
  }

  const setNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    saveNotificationsPreference(enabled)
  }

  const openPlaceholderPolicy = (label: string) => {
    setSettingsMessage(`${label} will open here soon.`)
  }

  const cancelSavedRound = () => {
    onAbandonRound()
    setSettingsMessage('Saved round cancelled.')
  }

  const deleteAccount = () => {
    const shouldDelete = window.confirm(
      'Delete local account data, profile activity, and saved round on this device?',
    )
    if (!shouldDelete) {
      return
    }

    clearLocalIdentityState()
    clearPreferences()
    applyThemePreference('light')
    onAbandonRound()
    setSettingsMessage('Local account data deleted.')
    onNavigate('home')
  }

  return (
    <section className="screen stack-sm settings-screen">
      <header className="screen__header settings-header">
        <div className="row-between setup-row-wrap">
          <div className="screen-title">
            <AppIcon className="screen-title__icon" icon={ICONS.settings} />
            <h2>Settings</h2>
          </div>
          <button type="button" onClick={() => onNavigate('home')}>
            Back
          </button>
        </div>
        <p className="muted">Preferences, legal links, subscriptions, and account controls.</p>
      </header>

      <section className="panel stack-xs">
        <p className="label">Appearance</p>
        <div className="segmented-control" role="group" aria-label="Theme selection">
          <button
            type="button"
            className={`segmented-control__button ${
              theme === 'light' ? 'segmented-control__button--active' : ''
            }`}
            onClick={() => setThemePreference('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`segmented-control__button ${
              theme === 'dark' ? 'segmented-control__button--active' : ''
            }`}
            onClick={() => setThemePreference('dark')}
          >
            Dark
          </button>
        </div>
      </section>

      <section className="panel stack-xs">
        <p className="label">Notifications</p>
        <ToggleRow
          label="Round reminders"
          description="Enable push-style reminders once notifications ship."
          checked={notificationsEnabled}
          onChange={setNotifications}
        />
      </section>

      <section className="panel stack-xs">
        <p className="label">Legal & Billing</p>
        <button type="button" className="settings-link-row" onClick={() => openPlaceholderPolicy('Privacy Policy')}>
          Privacy Policy
        </button>
        <button type="button" className="settings-link-row" onClick={() => openPlaceholderPolicy('Terms of Use')}>
          Terms of Use
        </button>
        <button
          type="button"
          className="settings-link-row"
          onClick={() => openPlaceholderPolicy('Subscriptions & Purchases')}
        >
          Subscriptions / Purchases
        </button>
      </section>

      <section className="panel stack-xs">
        <p className="label">Account</p>
        <button type="button" className="settings-link-row" onClick={cancelSavedRound}>
          Cancel Current Saved Round
        </button>
        <button type="button" className="button-danger" onClick={deleteAccount}>
          Delete Account
        </button>
      </section>

      {settingsMessage && (
        <p className="home-warning-text" role="status" aria-live="polite">
          {settingsMessage}
        </p>
      )}
    </section>
  )
}

export default SettingsScreen
