import type { RoundState } from '../types/game.ts'
import { mirrorStorageDelete, mirrorStorageWrite } from '../platform/nativeMirrorStorage.ts'
import {
  readStorageItem,
  removeStorageItem,
  removeStorageItemResult,
  type StorageOperationError,
  writeStorageItemResult,
} from '../platform/storage.ts'
import { reportTelemetryEvent } from '../platform/telemetry.ts'

const ROUND_SCHEMA_VERSION = 2
export const LEGACY_ACTIVE_ROUND_STORAGE_KEY = 'gimme-golf-active-round-v1'
export const ACTIVE_ROUND_STORAGE_JOURNAL_KEY = 'gimme-golf-active-round-v2-journal'
export const ACTIVE_ROUND_STORAGE_BACKUP_KEY = 'gimme-golf-active-round-v2-backup'

export const ACTIVE_ROUND_STORAGE_KEY = 'gimme-golf-active-round-v2'
export const ACTIVE_ROUND_STORAGE_MIGRATION_KEYS = [
  ACTIVE_ROUND_STORAGE_KEY,
  ACTIVE_ROUND_STORAGE_JOURNAL_KEY,
  ACTIVE_ROUND_STORAGE_BACKUP_KEY,
  LEGACY_ACTIVE_ROUND_STORAGE_KEY,
] as const

interface PersistedRoundStateEnvelopeV2 {
  schemaVersion: typeof ROUND_SCHEMA_VERSION
  roundState: RoundState
  savedAtMs: number
  writeId: string
}

interface PersistedRoundStateEnvelopeV1 {
  roundState: RoundState
  savedAtMs: number
}

export interface RoundStateSnapshot {
  roundState: RoundState | null
  savedAtMs: number | null
  recoveryReason: RoundStateRecoveryReason | null
}

export type RoundStateRecoveryReason =
  | 'recovered_from_journal'
  | 'recovered_from_backup'
  | 'migrated_legacy_v1'

export type PersistRoundStateErrorCode =
  | 'serialize_failed'
  | 'journal_write_failed'
  | 'backup_write_failed'
  | 'primary_write_failed'
  | 'journal_cleanup_failed'

export interface PersistRoundStateError {
  code: PersistRoundStateErrorCode
  cause?: unknown
  storageError?: StorageOperationError
}

export type PersistRoundStateResult =
  | {
      ok: true
      savedAtMs: number
    }
  | {
      ok: false
      error: PersistRoundStateError
    }

interface PersistedRoundCandidate {
  key: string
  envelope: PersistedRoundStateEnvelopeV2
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isBooleanOrUndefined(value: unknown): boolean {
  return typeof value === 'boolean' || typeof value === 'undefined'
}

function isPresetIdOrUndefined(value: unknown): boolean {
  return (
    typeof value === 'undefined' ||
    value === 'casual' ||
    value === 'competitive' ||
    value === 'party' ||
    value === 'balanced' ||
    value === 'powerUps' ||
    value === 'custom'
  )
}

function isFeaturedHolesConfigLike(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.enabled === 'boolean' &&
    (value.frequency === 'low' || value.frequency === 'normal' || value.frequency === 'high') &&
    (value.assignmentMode === 'auto' || value.assignmentMode === 'manual') &&
    (typeof value.randomSeed === 'number' || typeof value.randomSeed === 'undefined')
  )
}

function isDeckMemoryLike(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return isStringArray(value.usedPersonalCardIds) && isStringArray(value.usedPublicCardIds)
}

function isRoundStateLike(value: unknown): value is RoundState {
  if (!isRecord(value)) {
    return false
  }

  const config = value.config

  if (!isRecord(config) || !isRecord(config.toggles)) {
    return false
  }

  return (
    (config.holeCount === 9 || config.holeCount === 18) &&
    (config.courseStyle === 'par3' ||
      config.courseStyle === 'standard' ||
      config.courseStyle === 'custom') &&
    (config.gameMode === undefined ||
      config.gameMode === 'cards' ||
      config.gameMode === 'powerUps') &&
    isPresetIdOrUndefined(config.selectedPresetId) &&
    (config.customModeName === undefined || typeof config.customModeName === 'string') &&
    Array.isArray(value.players) &&
    Array.isArray(value.holes) &&
    Array.isArray(value.holeCards) &&
    (value.holePowerUps === undefined || Array.isArray(value.holePowerUps)) &&
    Array.isArray(value.holeResults) &&
    (value.holeUxMetrics === undefined || Array.isArray(value.holeUxMetrics)) &&
    (value.deckMemory === undefined || isDeckMemoryLike(value.deckMemory)) &&
    isRecord(value.totalsByPlayerId) &&
    typeof value.currentHoleIndex === 'number' &&
    typeof config.toggles.dynamicDifficulty === 'boolean' &&
    isBooleanOrUndefined(config.toggles.catchUpMode) &&
    isBooleanOrUndefined(config.toggles.momentumBonuses) &&
    typeof config.toggles.drawTwoPickOne === 'boolean' &&
    typeof config.toggles.autoAssignOne === 'boolean' &&
    typeof config.toggles.enableChaosCards === 'boolean' &&
    typeof config.toggles.enablePropCards === 'boolean' &&
    (config.featuredHoles === undefined || isFeaturedHolesConfigLike(config.featuredHoles)) &&
    (config.enabledPackIds === undefined || isStringArray(config.enabledPackIds))
  )
}

function isPersistedRoundStateEnvelopeV1(value: unknown): value is PersistedRoundStateEnvelopeV1 {
  return (
    isRecord(value) &&
    isRoundStateLike(value.roundState) &&
    typeof value.savedAtMs === 'number' &&
    Number.isFinite(value.savedAtMs)
  )
}

function isPersistedRoundStateEnvelopeV2(value: unknown): value is PersistedRoundStateEnvelopeV2 {
  return (
    isRecord(value) &&
    value.schemaVersion === ROUND_SCHEMA_VERSION &&
    isRoundStateLike(value.roundState) &&
    typeof value.savedAtMs === 'number' &&
    Number.isFinite(value.savedAtMs) &&
    typeof value.writeId === 'string' &&
    value.writeId.length > 0
  )
}

function hasStructurallyValidRoundState(roundState: RoundState): boolean {
  const holesLength = roundState.holes.length
  const uniquePlayerIds = new Set(roundState.players.map((player) => player.id))
  const hasValidCurrentHoleIndex =
    Number.isInteger(roundState.currentHoleIndex) &&
    roundState.currentHoleIndex >= 0 &&
    roundState.currentHoleIndex < holesLength
  const hasRequiredArrayLengths =
    roundState.holeCards.length === holesLength && roundState.holeResults.length === holesLength
  const hasOptionalArrayLengths =
    roundState.holePowerUps.length === holesLength && roundState.holeUxMetrics.length === holesLength

  return (
    roundState.players.length > 0 &&
    uniquePlayerIds.size === roundState.players.length &&
    roundState.players.every(
      (player) =>
        typeof player.id === 'string' &&
        player.id.length > 0 &&
        typeof player.name === 'string' &&
        typeof player.expectedScore18 === 'number',
    ) &&
    holesLength > 0 &&
    holesLength === roundState.config.holeCount &&
    hasRequiredArrayLengths &&
    hasOptionalArrayLengths &&
    hasValidCurrentHoleIndex
  )
}

function clampCurrentHoleIndex(roundState: RoundState): RoundState {
  const clampedCurrentHoleIndex = Math.min(
    Math.max(roundState.currentHoleIndex, 0),
    Math.max(roundState.holes.length - 1, 0),
  )

  if (clampedCurrentHoleIndex === roundState.currentHoleIndex) {
    return roundState
  }

  return {
    ...roundState,
    currentHoleIndex: clampedCurrentHoleIndex,
  }
}

function buildEnvelope(roundState: RoundState, savedAtMs = Date.now()): PersistedRoundStateEnvelopeV2 {
  return {
    schemaVersion: ROUND_SCHEMA_VERSION,
    roundState,
    savedAtMs,
    writeId: `${savedAtMs}-${Math.random().toString(36).slice(2, 10)}`,
  }
}

function serializeEnvelope(
  envelope: PersistedRoundStateEnvelopeV2,
): { ok: true; value: string } | { ok: false; error: PersistRoundStateError } {
  try {
    return {
      ok: true,
      value: JSON.stringify(envelope),
    }
  } catch (error) {
    const serializationError: PersistRoundStateError = {
      code: 'serialize_failed',
      cause: error,
    }
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'error',
      message: 'Failed to serialize round envelope',
      error,
    })
    return {
      ok: false,
      error: serializationError,
    }
  }
}

function parseEnvelopeFromRaw(rawValue: string | null): PersistedRoundStateEnvelopeV2 | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    if (isPersistedRoundStateEnvelopeV2(parsedValue)) {
      return parsedValue
    }

    return null
  } catch (error) {
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Ignoring malformed persisted round payload',
      error,
    })
    return null
  }
}

function parseLegacyRound(rawValue: string | null): PersistedRoundStateEnvelopeV2 | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    if (isPersistedRoundStateEnvelopeV1(parsedValue)) {
      return buildEnvelope(parsedValue.roundState, Math.round(parsedValue.savedAtMs))
    }

    if (isRoundStateLike(parsedValue)) {
      return buildEnvelope(parsedValue)
    }

    return null
  } catch (error) {
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Legacy round payload could not be parsed',
      error,
    })
    return null
  }
}

function selectLatestCandidate(candidates: PersistedRoundCandidate[]): PersistedRoundCandidate | null {
  if (candidates.length === 0) {
    return null
  }

  return candidates
    .slice()
    .sort((left, right) => right.envelope.savedAtMs - left.envelope.savedAtMs)[0] ?? null
}

function persistPrimaryEnvelope(
  envelope: PersistedRoundStateEnvelopeV2,
): PersistRoundStateResult {
  const serializationResult = serializeEnvelope(envelope)
  if (!serializationResult.ok) {
    return {
      ok: false,
      error: serializationResult.error,
    }
  }

  const serializedEnvelope = serializationResult.value
  const existingPrimary = readStorageItem(ACTIVE_ROUND_STORAGE_KEY)

  const journalWrite = writeStorageItemResult(ACTIVE_ROUND_STORAGE_JOURNAL_KEY, serializedEnvelope)
  if (!journalWrite.ok) {
    return {
      ok: false,
      error: {
        code: 'journal_write_failed',
        storageError: journalWrite.error,
      },
    }
  }
  mirrorStorageWrite(ACTIVE_ROUND_STORAGE_JOURNAL_KEY, serializedEnvelope)

  if (existingPrimary !== null) {
    const backupWrite = writeStorageItemResult(ACTIVE_ROUND_STORAGE_BACKUP_KEY, existingPrimary)
    if (!backupWrite.ok) {
      reportTelemetryEvent({
        scope: 'round_persistence',
        level: 'warn',
        message: 'Primary backup write failed before replacing round snapshot',
        data: {
          code: backupWrite.error.code,
        },
        error: backupWrite.error.cause,
      })
      return {
        ok: false,
        error: {
          code: 'backup_write_failed',
          storageError: backupWrite.error,
        },
      }
    }
    mirrorStorageWrite(ACTIVE_ROUND_STORAGE_BACKUP_KEY, existingPrimary)
  }

  const primaryWrite = writeStorageItemResult(ACTIVE_ROUND_STORAGE_KEY, serializedEnvelope)
  if (!primaryWrite.ok) {
    return {
      ok: false,
      error: {
        code: 'primary_write_failed',
        storageError: primaryWrite.error,
      },
    }
  }
  mirrorStorageWrite(ACTIVE_ROUND_STORAGE_KEY, serializedEnvelope)

  const journalClear = removeStorageItemResult(ACTIVE_ROUND_STORAGE_JOURNAL_KEY)
  if (!journalClear.ok) {
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Primary write succeeded but journal cleanup failed',
      data: {
        code: journalClear.error.code,
      },
      error: journalClear.error.cause,
    })
    return {
      ok: false,
      error: {
        code: 'journal_cleanup_failed',
        storageError: journalClear.error,
      },
    }
  }

  mirrorStorageDelete(ACTIVE_ROUND_STORAGE_JOURNAL_KEY)

  return {
    ok: true,
    savedAtMs: envelope.savedAtMs,
  }
}

function migrateLegacySnapshot(
  legacyEnvelope: PersistedRoundStateEnvelopeV2,
): RoundStateSnapshot {
  const migrationPersistResult = persistPrimaryEnvelope(legacyEnvelope)
  if (!migrationPersistResult.ok) {
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Failed to persist migrated legacy round snapshot',
      data: {
        code: migrationPersistResult.error.code,
      },
      error: migrationPersistResult.error.cause ?? migrationPersistResult.error.storageError?.cause,
    })
  }

  removeStorageItem(LEGACY_ACTIVE_ROUND_STORAGE_KEY)
  mirrorStorageDelete(LEGACY_ACTIVE_ROUND_STORAGE_KEY)

  return {
    roundState: clampCurrentHoleIndex(legacyEnvelope.roundState),
    savedAtMs: legacyEnvelope.savedAtMs,
    recoveryReason: 'migrated_legacy_v1',
  }
}

function loadVersionedSnapshot(): RoundStateSnapshot | null {
  const primaryCandidate = parseEnvelopeFromRaw(readStorageItem(ACTIVE_ROUND_STORAGE_KEY))
  const journalCandidate = parseEnvelopeFromRaw(readStorageItem(ACTIVE_ROUND_STORAGE_JOURNAL_KEY))
  const backupCandidate = parseEnvelopeFromRaw(readStorageItem(ACTIVE_ROUND_STORAGE_BACKUP_KEY))

  const parsedCandidates: PersistedRoundCandidate[] = []
  if (primaryCandidate) {
    parsedCandidates.push({
      key: ACTIVE_ROUND_STORAGE_KEY,
      envelope: primaryCandidate,
    })
  }
  if (journalCandidate) {
    parsedCandidates.push({
      key: ACTIVE_ROUND_STORAGE_JOURNAL_KEY,
      envelope: journalCandidate,
    })
  }
  if (backupCandidate) {
    parsedCandidates.push({
      key: ACTIVE_ROUND_STORAGE_BACKUP_KEY,
      envelope: backupCandidate,
    })
  }

  const latestCandidate = selectLatestCandidate(parsedCandidates)
  if (!latestCandidate) {
    return null
  }

  const candidateRoundState = latestCandidate.envelope.roundState
  if (!hasStructurallyValidRoundState(candidateRoundState)) {
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Persisted round candidate failed structural validation and was cleared',
      data: {
        key: latestCandidate.key,
      },
    })
    clearRoundState()
    removeStorageItem(LEGACY_ACTIVE_ROUND_STORAGE_KEY)
    mirrorStorageDelete(LEGACY_ACTIVE_ROUND_STORAGE_KEY)
    return {
      roundState: null,
      savedAtMs: null,
      recoveryReason: null,
    }
  }

  if (latestCandidate.key !== ACTIVE_ROUND_STORAGE_KEY) {
    const recoveryPersistResult = persistPrimaryEnvelope(latestCandidate.envelope)
    if (!recoveryPersistResult.ok) {
      reportTelemetryEvent({
        scope: 'round_persistence',
        level: 'warn',
        message: 'Failed to persist recovered round candidate to primary storage',
        data: {
          sourceKey: latestCandidate.key,
          code: recoveryPersistResult.error.code,
        },
        error:
          recoveryPersistResult.error.cause ?? recoveryPersistResult.error.storageError?.cause,
      })
    }

    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Recovered round snapshot from non-primary source',
      data: {
        sourceKey: latestCandidate.key,
      },
    })
  }

  return {
    roundState: clampCurrentHoleIndex(candidateRoundState),
    savedAtMs: Math.round(latestCandidate.envelope.savedAtMs),
    recoveryReason:
      latestCandidate.key === ACTIVE_ROUND_STORAGE_JOURNAL_KEY
        ? 'recovered_from_journal'
        : latestCandidate.key === ACTIVE_ROUND_STORAGE_BACKUP_KEY
          ? 'recovered_from_backup'
          : null,
  }
}

export function saveRoundStateResult(roundState: RoundState): PersistRoundStateResult {
  const envelope = buildEnvelope(roundState)
  return persistPrimaryEnvelope(envelope)
}

export function saveRoundState(roundState: RoundState): number | null {
  const result = saveRoundStateResult(roundState)
  if (!result.ok) {
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Round state save failed',
      data: {
        code: result.error.code,
      },
      error: result.error.cause ?? result.error.storageError?.cause,
    })
    return null
  }

  return result.savedAtMs
}

export function loadRoundStateSnapshot(): RoundStateSnapshot {
  const versionedSnapshot = loadVersionedSnapshot()
  if (versionedSnapshot) {
    return versionedSnapshot
  }

  const legacyEnvelope = parseLegacyRound(
    readStorageItem(LEGACY_ACTIVE_ROUND_STORAGE_KEY),
  )

  if (!legacyEnvelope) {
    return {
      roundState: null,
      savedAtMs: null,
      recoveryReason: null,
    }
  }

  if (!hasStructurallyValidRoundState(legacyEnvelope.roundState)) {
    reportTelemetryEvent({
      scope: 'round_persistence',
      level: 'warn',
      message: 'Legacy persisted round failed structural validation and was cleared',
    })
    clearRoundState()
    removeStorageItem(LEGACY_ACTIVE_ROUND_STORAGE_KEY)
    mirrorStorageDelete(LEGACY_ACTIVE_ROUND_STORAGE_KEY)
    return {
      roundState: null,
      savedAtMs: null,
      recoveryReason: null,
    }
  }

  return migrateLegacySnapshot(legacyEnvelope)
}

export function loadRoundState(): RoundState | null {
  return loadRoundStateSnapshot().roundState
}

export function clearRoundState(): void {
  removeStorageItem(ACTIVE_ROUND_STORAGE_KEY)
  removeStorageItem(ACTIVE_ROUND_STORAGE_JOURNAL_KEY)
  removeStorageItem(ACTIVE_ROUND_STORAGE_BACKUP_KEY)
  removeStorageItem(LEGACY_ACTIVE_ROUND_STORAGE_KEY)

  mirrorStorageDelete(ACTIVE_ROUND_STORAGE_KEY)
  mirrorStorageDelete(ACTIVE_ROUND_STORAGE_JOURNAL_KEY)
  mirrorStorageDelete(ACTIVE_ROUND_STORAGE_BACKUP_KEY)
  mirrorStorageDelete(LEGACY_ACTIVE_ROUND_STORAGE_KEY)
}
