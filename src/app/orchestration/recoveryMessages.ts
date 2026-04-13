export type RecoveryReason =
  | 'recovered_from_journal'
  | 'recovered_from_backup'
  | 'migrated_legacy_v1'
  | null

export function getRecoveryLifecycleMessage(recoveryReason: RecoveryReason): string | null {
  if (recoveryReason === 'recovered_from_journal') {
    return 'Recovered your round after an interrupted save.'
  }

  if (recoveryReason === 'recovered_from_backup') {
    return 'Recovered your round from backup after a save issue.'
  }

  if (recoveryReason === 'migrated_legacy_v1') {
    return 'Upgraded your saved round to the latest storage format.'
  }

  return null
}
