import { useState } from 'react'
import { ICONS } from '../app/icons.ts'
import AppIcon from '../components/AppIcon.tsx'
import { setStatusBarStyle } from '../capacitor.ts'
import { hapticLightImpact, hapticSelection, hapticSuccess, hapticWarning } from '../capacitor/haptics.ts'
import { getBillingUrl, getPrivacyPolicyUrl, getTermsOfUseUrl } from '../config/appLinks.ts'
import {
  clearAccountProfile,
} from '../logic/account.ts'
import { clearLocalIdentityState } from '../logic/localIdentity.ts'
import {
  applyThemePreference,
  clearPreferences,
} from '../logic/preferences.ts'
import type { ScreenProps } from '../app/screenContracts.ts'

function SettingsScreen({ onNavigate, onAbandonRound }: ScreenProps) {
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)

  const openExternalLink = (label: string, url: string) => {
    hapticSelection()
    const linkTarget = window.open(url, '_blank', 'noopener,noreferrer')
    if (!linkTarget) {
      setSettingsMessage(`Unable to open ${label}.`)
      hapticWarning()
    }
  }

  const cancelSavedRound = () => {
    hapticLightImpact()
    onAbandonRound()
    setSettingsMessage('Saved round cancelled.')
    hapticSuccess()
  }

  const deleteAccount = () => {
    hapticSelection()
    const shouldDelete = window.confirm(
      'Delete local account data, profile activity, and saved round on this device?',
    )
    if (!shouldDelete) {
      hapticWarning()
      return
    }

    clearLocalIdentityState()
    clearAccountProfile()
    clearPreferences()
    applyThemePreference('light')
    setStatusBarStyle('light')
    onAbandonRound()
    setSettingsMessage('Local account data deleted.')
    hapticWarning()
    onNavigate('home')
  }

  return (
    <section className="screen stack-sm settings-screen">
      <header className="screen__header settings-header">
        <div className="screen-title">
          <AppIcon className="screen-title__icon" icon={ICONS.settings} />
          <h2>Settings</h2>
        </div>
        <p className="muted">Preferences, legal links, subscriptions, and account controls.</p>
      </header>

      <section className="panel stack-xs">
        <p className="label">Challenge Card Style</p>
        <p>
          <strong>Illustrative</strong>
        </p>
        <p className="muted">
          Card layout is currently locked to Illustrative so full artwork is shown when assets are
          available.
        </p>
      </section>

      <section className="panel stack-xs">
        <p className="label">Legal & Billing</p>
        <button
          type="button"
          className="settings-link-row"
          data-requires-network="true"
          onClick={() => openExternalLink('Privacy Policy', getPrivacyPolicyUrl())}
        >
          Privacy Policy
        </button>
        <button
          type="button"
          className="settings-link-row"
          data-requires-network="true"
          onClick={() => openExternalLink('Terms of Use', getTermsOfUseUrl())}
        >
          Terms of Use
        </button>
        <button
          type="button"
          className="settings-link-row"
          data-requires-network="true"
          onClick={() => openExternalLink('Subscriptions & Purchases', getBillingUrl())}
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
