import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { readStorageItem, removeStorageItem, writeStorageItem } from '../platform/storage.ts'
import { reportTelemetryEvent } from '../platform/telemetry.ts'

const ACTIVE_MULTIPLAYER_SESSION_STORAGE_KEY = 'gimme-golf-active-multiplayer-session-v1'
const PENDING_MULTIPLAYER_UPDATES_STORAGE_KEY = 'gimme-golf-pending-multiplayer-updates-v1'
const MAX_ROOM_CODE_LENGTH = 8
const DEFAULT_EXPECTED_SCORE_18 = 90
const MIN_EXPECTED_SCORE_18 = 54
const MAX_EXPECTED_SCORE_18 = 180

let cachedMultiplayerClient: SupabaseClient | null | undefined

export type MultiplayerSyncState = 'synced' | 'syncing' | 'offline' | 'conflict'

export interface MultiplayerServiceError {
  code: 'disabled' | 'config' | 'auth' | 'network' | 'not_found' | 'conflict' | 'validation' | 'unknown'
  message: string
  retryable: boolean
  cause?: unknown
}

export type MultiplayerResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: MultiplayerServiceError }

export interface MultiplayerRoundSession {
  roundId: string
  roomCode: string
  participantId: string
  playerId: string | null
  isHost: boolean
  revision: number
  expiresAt: string
  stateJson: Record<string, unknown>
  displayName: string
  expectedScore18: number
}

export interface MultiplayerRoundSnapshot {
  roundId: string
  roomCode: string
  revision: number
  expiresAt: string
  status: string
  updatedAt: string
  stateJson: Record<string, unknown>
}

export interface MultiplayerParticipant {
  id: string
  userId: string
  displayName: string
  expectedScore18: number
  playerId: string | null
  isHost: boolean
  joinedAt: string
  lastSeenAt: string
  leftAt: string | null
}

export interface MultiplayerApplyUpdateResponse {
  applied: boolean
  conflict: boolean
  revision: number
  stateJson: Record<string, unknown>
  updatedAt: string
}

export interface MultiplayerRoundStateRealtimeEvent {
  roundId: string
  revision: number
  stateJson: Record<string, unknown>
  updatedAt: string
}

export interface PendingMultiplayerRoundUpdate {
  id: string
  roundId: string
  expectedRevision: number
  operation: string
  patch: Record<string, unknown>
  nextState: Record<string, unknown>
  createdAtMs: number
}

interface RpcCreateRoundRow {
  round_id: string
  room_code: string
  expires_at: string
  participant_id: string
  participant_player_id: string | null
  participant_expected_score_18: number
  revision: number
  state_json: Record<string, unknown>
}

interface RpcApplyRoundUpdateRow {
  applied: boolean
  conflict: boolean
  revision: number
  state_json: Record<string, unknown>
  updated_at: string
}

interface RpcJoinRoundRow {
  round_id: string
  room_code: string
  expires_at: string
  participant_id: string
  participant_player_id: string | null
  participant_expected_score_18: number
  is_host: boolean
  revision: number
  state_json: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isEnabledFlag(value: string | undefined): boolean {
  const normalizedFlag = value?.trim().toLowerCase()
  return normalizedFlag === '1' || normalizedFlag === 'true'
}

function normalizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, MAX_ROOM_CODE_LENGTH)
}

function normalizeExpectedScore18(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_EXPECTED_SCORE_18
  }

  return Math.min(MAX_EXPECTED_SCORE_18, Math.max(MIN_EXPECTED_SCORE_18, Math.round(value)))
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message
  }

  return 'Unknown multiplayer error.'
}

function createServiceError(
  code: MultiplayerServiceError['code'],
  message: string,
  retryable: boolean,
  cause?: unknown,
): MultiplayerServiceError {
  return {
    code,
    message,
    retryable,
    cause,
  }
}

function classifyMultiplayerError(error: unknown): MultiplayerServiceError {
  const message = getErrorMessage(error)
  const normalizedMessage = message.trim().toUpperCase()
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('anonymous sign-ins are disabled') ||
    lowerMessage.includes('anonymous sign in is disabled')
  ) {
    return createServiceError(
      'auth',
      'Anonymous multiplayer sign-in is disabled in Supabase. Enable Auth > Providers > Anonymous, then retry.',
      false,
      error,
    )
  }

  if (
    normalizedMessage.includes('ROUND_NOT_FOUND_OR_EXPIRED') ||
    normalizedMessage.includes('ROUND_NOT_FOUND')
  ) {
    return createServiceError('not_found', 'Round not found or expired.', false, error)
  }

  if (
    normalizedMessage.includes('INVALID_ROOM_CODE') ||
    normalizedMessage.includes('INVALID_DISPLAY_NAME') ||
    normalizedMessage.includes('INVALID_EXPECTED_SCORE_18') ||
    normalizedMessage.includes('ROOM_CODE_GENERATION_FAILED')
  ) {
    return createServiceError(
      'validation',
      'Check the room code, display name, and expected 18-hole score.',
      false,
      error,
    )
  }

  if (normalizedMessage.includes('FUNCTION GEN_RANDOM_BYTES(INTEGER) DOES NOT EXIST')) {
    return createServiceError(
      'unknown',
      'Room code generation is misconfigured on the server. Apply the latest multiplayer migration and retry.',
      false,
      error,
    )
  }

  if (normalizedMessage.includes('NON_HOST_STATE_UPDATE_FORBIDDEN')) {
    return createServiceError(
      'validation',
      'Only your assigned player score and mission status can be changed.',
      false,
      error,
    )
  }

  if (normalizedMessage.includes('PLAYER_SLOT_UNASSIGNED')) {
    return createServiceError(
      'conflict',
      'Your player slot is not assigned yet. Refresh lobby and retry.',
      true,
      error,
    )
  }

  if (normalizedMessage.includes('ACTOR_PLAYER_MISMATCH')) {
    return createServiceError(
      'conflict',
      'Your player assignment changed. Refresh and retry.',
      true,
      error,
    )
  }

  if (normalizedMessage.includes('ROUND_FULL')) {
    return createServiceError('validation', 'This round already has 4 active players.', false, error)
  }

  if (normalizedMessage.includes('NOT_A_ROUND_PARTICIPANT')) {
    return createServiceError('validation', 'You are not an active participant in this round.', false, error)
  }

  if (normalizedMessage.includes('HOST_REQUIRED_FOR_OPERATION')) {
    return createServiceError('validation', 'Only the host can run that action.', false, error)
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('load failed')) {
    return createServiceError('network', 'Network request failed. Check connectivity and retry.', true, error)
  }

  return createServiceError('unknown', message, true, error)
}

function isMissingRpcFunctionError(error: unknown, functionName: string): boolean {
  const message = getErrorMessage(error).trim().toLowerCase()
  return (
    message.includes('could not find the function public.') &&
    message.includes(`public.${functionName.toLowerCase()}(`) &&
    message.includes('schema cache')
  )
}

function parseSession(rawValue: string | null): MultiplayerRoundSession | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!isRecord(parsed)) {
      return null
    }

    if (
      typeof parsed.roundId !== 'string' ||
      typeof parsed.roomCode !== 'string' ||
      typeof parsed.participantId !== 'string' ||
      typeof parsed.isHost !== 'boolean' ||
      typeof parsed.revision !== 'number' ||
      typeof parsed.expiresAt !== 'string' ||
      !isRecord(parsed.stateJson) ||
      typeof parsed.displayName !== 'string'
    ) {
      return null
    }

    return {
      roundId: parsed.roundId,
      roomCode: parsed.roomCode,
      participantId: parsed.participantId,
      playerId:
        typeof parsed.playerId === 'string' && parsed.playerId.trim().length > 0
          ? parsed.playerId
          : null,
      isHost: parsed.isHost,
      revision: parsed.revision,
      expiresAt: parsed.expiresAt,
      stateJson: parsed.stateJson,
      displayName: parsed.displayName,
      expectedScore18:
        typeof parsed.expectedScore18 === 'number'
          ? normalizeExpectedScore18(parsed.expectedScore18)
          : DEFAULT_EXPECTED_SCORE_18,
    }
  } catch (error) {
    reportTelemetryEvent({
      scope: 'multiplayer',
      level: 'warn',
      message: 'Failed to parse active multiplayer session',
      error,
    })
    return null
  }
}

function sanitizePendingRoundUpdates(value: unknown): PendingMultiplayerRoundUpdate[] {
  if (!Array.isArray(value)) {
    return []
  }

  const sanitized: PendingMultiplayerRoundUpdate[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }

    const {
      id,
      roundId,
      expectedRevision,
      operation,
      patch,
      nextState,
      createdAtMs,
    } = item
    if (
      typeof id !== 'string' ||
      id.length < 1 ||
      typeof roundId !== 'string' ||
      roundId.length < 1 ||
      typeof expectedRevision !== 'number' ||
      expectedRevision < 0 ||
      typeof operation !== 'string' ||
      operation.length < 1 ||
      !isRecord(patch) ||
      !isRecord(nextState) ||
      typeof createdAtMs !== 'number' ||
      !Number.isFinite(createdAtMs)
    ) {
      continue
    }

    sanitized.push({
      id,
      roundId,
      expectedRevision: Math.round(expectedRevision),
      operation,
      patch,
      nextState,
      createdAtMs: Math.round(createdAtMs),
    })
  }

  return sanitized.sort((left, right) => left.createdAtMs - right.createdAtMs)
}

export function isMultiplayerEnabled(): boolean {
  return isEnabledFlag(import.meta.env.VITE_ENABLE_MULTIPLAYER)
}

export function isMultiplayerConfigured(): boolean {
  if (!isMultiplayerEnabled()) {
    return false
  }

  return (
    typeof import.meta.env.VITE_SUPABASE_URL === 'string' &&
    import.meta.env.VITE_SUPABASE_URL.length > 0 &&
    typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY.length > 0
  )
}

export function getMultiplayerClient(): SupabaseClient | null {
  if (cachedMultiplayerClient !== undefined) {
    return cachedMultiplayerClient
  }

  if (!isMultiplayerConfigured()) {
    cachedMultiplayerClient = null
    return cachedMultiplayerClient
  }

  cachedMultiplayerClient = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  )

  return cachedMultiplayerClient
}

export async function ensureMultiplayerIdentity(): Promise<MultiplayerResult<true>> {
  if (!isMultiplayerEnabled()) {
    return {
      ok: false,
      error: createServiceError('disabled', 'Multiplayer is disabled.', false),
    }
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const sessionResult = await client.auth.getSession()
    if (sessionResult.error) {
      return {
        ok: false,
        error: classifyMultiplayerError(sessionResult.error),
      }
    }

    if (sessionResult.data.session?.user?.id) {
      return { ok: true, value: true }
    }

    const signInResult = await client.auth.signInAnonymously()
    if (signInResult.error) {
      return {
        ok: false,
        error: classifyMultiplayerError(signInResult.error),
      }
    }

    const userId = signInResult.data.user?.id ?? signInResult.data.session?.user?.id
    if (!userId) {
      return {
        ok: false,
        error: createServiceError('auth', 'Anonymous sign-in did not return a user.', false),
      }
    }

    return { ok: true, value: true }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

export async function getMultiplayerCurrentUserId(): Promise<MultiplayerResult<string>> {
  const identityResult = await ensureMultiplayerIdentity()
  if (!identityResult.ok) {
    return identityResult
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const { data, error } = await client.auth.getSession()
    if (error) {
      return {
        ok: false,
        error: classifyMultiplayerError(error),
      }
    }

    const userId = data.session?.user?.id
    if (!userId) {
      return {
        ok: false,
        error: createServiceError('auth', 'No multiplayer user identity found.', true),
      }
    }

    return {
      ok: true,
      value: userId,
    }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

function mapCreateRoundRowToSession(
  row: RpcCreateRoundRow,
  displayName: string,
  expectedScore18: number,
): MultiplayerRoundSession {
  return {
    roundId: row.round_id,
    roomCode: row.room_code,
    participantId: row.participant_id,
    playerId: row.participant_player_id,
    isHost: true,
    revision: row.revision,
    expiresAt: row.expires_at,
    stateJson: row.state_json,
    displayName,
    expectedScore18:
      typeof row.participant_expected_score_18 === 'number'
        ? normalizeExpectedScore18(row.participant_expected_score_18)
        : normalizeExpectedScore18(expectedScore18),
  }
}

function mapJoinRoundRowToSession(
  row: RpcJoinRoundRow,
  displayName: string,
  expectedScore18: number,
): MultiplayerRoundSession {
  return {
    roundId: row.round_id,
    roomCode: row.room_code,
    participantId: row.participant_id,
    playerId: row.participant_player_id,
    isHost: row.is_host,
    revision: row.revision,
    expiresAt: row.expires_at,
    stateJson: row.state_json,
    displayName,
    expectedScore18:
      typeof row.participant_expected_score_18 === 'number'
        ? normalizeExpectedScore18(row.participant_expected_score_18)
        : normalizeExpectedScore18(expectedScore18),
  }
}

export function saveActiveMultiplayerSession(session: MultiplayerRoundSession): void {
  writeStorageItem(ACTIVE_MULTIPLAYER_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function loadActiveMultiplayerSession(): MultiplayerRoundSession | null {
  return parseSession(readStorageItem(ACTIVE_MULTIPLAYER_SESSION_STORAGE_KEY))
}

export function clearActiveMultiplayerSession(): void {
  removeStorageItem(ACTIVE_MULTIPLAYER_SESSION_STORAGE_KEY)
}

export function loadPendingMultiplayerRoundUpdates(): PendingMultiplayerRoundUpdate[] {
  const rawValue = readStorageItem(PENDING_MULTIPLAYER_UPDATES_STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  try {
    return sanitizePendingRoundUpdates(JSON.parse(rawValue))
  } catch (error) {
    reportTelemetryEvent({
      scope: 'multiplayer',
      level: 'warn',
      message: 'Failed to parse pending multiplayer updates',
      error,
    })
    return []
  }
}

export function savePendingMultiplayerRoundUpdates(updates: PendingMultiplayerRoundUpdate[]): void {
  if (updates.length === 0) {
    removeStorageItem(PENDING_MULTIPLAYER_UPDATES_STORAGE_KEY)
    return
  }

  writeStorageItem(
    PENDING_MULTIPLAYER_UPDATES_STORAGE_KEY,
    JSON.stringify(updates),
  )
}

export function enqueuePendingMultiplayerRoundUpdate(
  update: Omit<PendingMultiplayerRoundUpdate, 'id' | 'createdAtMs'>,
): PendingMultiplayerRoundUpdate {
  const pendingUpdates = loadPendingMultiplayerRoundUpdates()
  const pendingUpdate: PendingMultiplayerRoundUpdate = {
    id: `mpq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    createdAtMs: Date.now(),
    ...update,
  }
  savePendingMultiplayerRoundUpdates([...pendingUpdates, pendingUpdate])
  return pendingUpdate
}

export function removePendingMultiplayerRoundUpdatesById(ids: string[]): void {
  if (ids.length === 0) {
    return
  }

  const idSet = new Set(ids)
  const nextUpdates = loadPendingMultiplayerRoundUpdates().filter((update) => !idSet.has(update.id))
  savePendingMultiplayerRoundUpdates(nextUpdates)
}

export function clearPendingMultiplayerRoundUpdatesForRound(roundId: string): void {
  const nextUpdates = loadPendingMultiplayerRoundUpdates().filter((update) => update.roundId !== roundId)
  savePendingMultiplayerRoundUpdates(nextUpdates)
}

export async function createMultiplayerRound(
  displayName: string,
  expectedScore18: number,
  initialState: Record<string, unknown>,
): Promise<MultiplayerResult<MultiplayerRoundSession>> {
  const trimmedDisplayName = displayName.trim()
  const normalizedExpectedScore18 = normalizeExpectedScore18(expectedScore18)
  if (trimmedDisplayName.length < 1 || trimmedDisplayName.length > 40) {
    return {
      ok: false,
      error: createServiceError('validation', 'Display name must be 1-40 characters.', false),
    }
  }

  const identityResult = await ensureMultiplayerIdentity()
  if (!identityResult.ok) {
    return identityResult
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const primaryArgs = {
      p_display_name: trimmedDisplayName,
      p_expected_score_18: normalizedExpectedScore18,
      p_initial_state: initialState,
    }
    let { data, error } = await client.rpc('create_round', primaryArgs)

    if (error && isMissingRpcFunctionError(error, 'create_round')) {
      const legacyResult = await client.rpc('create_round', {
        p_display_name: trimmedDisplayName,
        p_initial_state: initialState,
      })
      data = legacyResult.data
      error = legacyResult.error
    }

    if (error) {
      return {
        ok: false,
        error: classifyMultiplayerError(error),
      }
    }

    const row = Array.isArray(data) && data.length > 0 ? (data[0] as RpcCreateRoundRow) : null
    if (!row) {
      return {
        ok: false,
        error: createServiceError('unknown', 'Round creation returned no data.', true),
      }
    }

    return {
      ok: true,
      value: mapCreateRoundRowToSession(row, trimmedDisplayName, normalizedExpectedScore18),
    }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

export async function joinMultiplayerRound(
  roomCode: string,
  displayName: string,
  expectedScore18: number,
): Promise<MultiplayerResult<MultiplayerRoundSession>> {
  const normalizedRoomCode = normalizeRoomCode(roomCode)
  const trimmedDisplayName = displayName.trim()
  const normalizedExpectedScore18 = normalizeExpectedScore18(expectedScore18)

  if (normalizedRoomCode.length !== MAX_ROOM_CODE_LENGTH) {
    return {
      ok: false,
      error: createServiceError('validation', 'Room code must be 8 characters.', false),
    }
  }

  if (trimmedDisplayName.length < 1 || trimmedDisplayName.length > 40) {
    return {
      ok: false,
      error: createServiceError('validation', 'Display name must be 1-40 characters.', false),
    }
  }

  const identityResult = await ensureMultiplayerIdentity()
  if (!identityResult.ok) {
    return identityResult
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const primaryArgs = {
      p_room_code: normalizedRoomCode,
      p_display_name: trimmedDisplayName,
      p_expected_score_18: normalizedExpectedScore18,
    }
    let { data, error } = await client.rpc('join_round', primaryArgs)

    if (error && isMissingRpcFunctionError(error, 'join_round')) {
      const legacyResult = await client.rpc('join_round', {
        p_room_code: normalizedRoomCode,
        p_display_name: trimmedDisplayName,
      })
      data = legacyResult.data
      error = legacyResult.error
    }

    if (error) {
      return {
        ok: false,
        error: classifyMultiplayerError(error),
      }
    }

    const row = Array.isArray(data) && data.length > 0 ? (data[0] as RpcJoinRoundRow) : null
    if (!row) {
      return {
        ok: false,
        error: createServiceError('unknown', 'Join round returned no data.', true),
      }
    }

    return {
      ok: true,
      value: mapJoinRoundRowToSession(row, trimmedDisplayName, normalizedExpectedScore18),
    }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

export async function loadMultiplayerRoundSnapshot(
  roundId: string,
): Promise<MultiplayerResult<MultiplayerRoundSnapshot>> {
  const identityResult = await ensureMultiplayerIdentity()
  if (!identityResult.ok) {
    return identityResult
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const { data, error } = await client
      .from('rounds')
      .select('id, room_code, revision, expires_at, status, updated_at, state_json')
      .eq('id', roundId)
      .single()

    if (error) {
      return {
        ok: false,
        error: classifyMultiplayerError(error),
      }
    }

    if (!isRecord(data)) {
      return {
        ok: false,
        error: createServiceError('unknown', 'Round snapshot payload is invalid.', true),
      }
    }

    const stateJson = isRecord(data.state_json) ? data.state_json : {}

    return {
      ok: true,
      value: {
        roundId: String(data.id),
        roomCode: String(data.room_code),
        revision: Number(data.revision),
        expiresAt: String(data.expires_at),
        status: String(data.status),
        updatedAt: String(data.updated_at),
        stateJson,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

export async function loadMultiplayerParticipants(
  roundId: string,
): Promise<MultiplayerResult<MultiplayerParticipant[]>> {
  const identityResult = await ensureMultiplayerIdentity()
  if (!identityResult.ok) {
    return identityResult
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const { data, error } = await client
      .from('round_participants')
      .select(
        'id, user_id, display_name, expected_score_18, player_id, is_host, joined_at, last_seen_at, left_at',
      )
      .eq('round_id', roundId)
      .is('left_at', null)
      .order('joined_at', { ascending: true })

    if (error) {
      return {
        ok: false,
        error: classifyMultiplayerError(error),
      }
    }

    const participants: MultiplayerParticipant[] = Array.isArray(data)
      ? data.map((row) => ({
          id: String((row as Record<string, unknown>).id ?? ''),
          userId: String((row as Record<string, unknown>).user_id ?? ''),
          displayName: String((row as Record<string, unknown>).display_name ?? ''),
          expectedScore18: normalizeExpectedScore18(
            Number((row as Record<string, unknown>).expected_score_18),
          ),
          playerId:
            typeof (row as Record<string, unknown>).player_id === 'string'
              ? String((row as Record<string, unknown>).player_id)
              : null,
          isHost: Boolean((row as Record<string, unknown>).is_host),
          joinedAt: String((row as Record<string, unknown>).joined_at ?? ''),
          lastSeenAt: String((row as Record<string, unknown>).last_seen_at ?? ''),
          leftAt: (row as Record<string, unknown>).left_at as string | null,
        }))
      : []

    return {
      ok: true,
      value: participants,
    }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

export async function leaveMultiplayerRound(roundId: string): Promise<MultiplayerResult<true>> {
  const identityResult = await ensureMultiplayerIdentity()
  if (!identityResult.ok) {
    return identityResult
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const { error } = await client.rpc('leave_round', {
      p_round_id: roundId,
    })

    if (error) {
      return {
        ok: false,
        error: classifyMultiplayerError(error),
      }
    }

    return {
      ok: true,
      value: true,
    }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

export async function applyMultiplayerRoundUpdate(
  roundId: string,
  expectedRevision: number,
  nextState: Record<string, unknown>,
  operation = 'state_replace',
  patch: Record<string, unknown> = {},
): Promise<MultiplayerResult<MultiplayerApplyUpdateResponse>> {
  const identityResult = await ensureMultiplayerIdentity()
  if (!identityResult.ok) {
    return identityResult
  }

  const client = getMultiplayerClient()
  if (!client) {
    return {
      ok: false,
      error: createServiceError('config', 'Supabase is not configured for multiplayer.', false),
    }
  }

  try {
    const { data, error } = await client.rpc('apply_round_update', {
      p_round_id: roundId,
      p_expected_revision: expectedRevision,
      p_next_state: nextState,
      p_operation: operation,
      p_patch: patch,
    })

    if (error) {
      return {
        ok: false,
        error: classifyMultiplayerError(error),
      }
    }

    const row = Array.isArray(data) && data.length > 0 ? (data[0] as RpcApplyRoundUpdateRow) : null
    if (!row) {
      return {
        ok: false,
        error: createServiceError('unknown', 'Round update returned no data.', true),
      }
    }

    return {
      ok: true,
      value: {
        applied: Boolean(row.applied),
        conflict: Boolean(row.conflict),
        revision: Number(row.revision),
        stateJson: isRecord(row.state_json) ? row.state_json : {},
        updatedAt: String(row.updated_at ?? ''),
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: classifyMultiplayerError(error),
    }
  }
}

export function subscribeToMultiplayerLobby(
  roundId: string,
  onUpdate: () => void,
): (() => void) | null {
  const client = getMultiplayerClient()
  if (!client || !roundId) {
    return null
  }

  const channelName = `multiplayer-lobby-${roundId}-${Math.random().toString(36).slice(2, 10)}`
  const channel: RealtimeChannel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'round_participants',
        filter: `round_id=eq.${roundId}`,
      },
      () => {
        onUpdate()
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rounds',
        filter: `id=eq.${roundId}`,
      },
      () => {
        onUpdate()
      },
    )

  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      reportTelemetryEvent({
        scope: 'multiplayer',
        level: 'warn',
        message: 'Realtime channel error in multiplayer lobby',
        data: {
          roundId,
        },
      })
    }
  })

  return () => {
    void client.removeChannel(channel)
  }
}

export function subscribeToMultiplayerRoundState(
  roundId: string,
  onRoundStateEvent: (event: MultiplayerRoundStateRealtimeEvent) => void,
): (() => void) | null {
  const client = getMultiplayerClient()
  if (!client || !roundId) {
    return null
  }

  const channelName = `multiplayer-round-state-${roundId}-${Math.random().toString(36).slice(2, 10)}`
  const channel: RealtimeChannel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rounds',
        filter: `id=eq.${roundId}`,
      },
      (payload) => {
        const nextRow = payload.new
        if (!isRecord(nextRow)) {
          return
        }

        const revisionRaw = nextRow.revision
        const stateJsonRaw = nextRow.state_json
        const updatedAtRaw = nextRow.updated_at
        const idRaw = nextRow.id
        const parsedRevision =
          typeof revisionRaw === 'number'
            ? revisionRaw
            : typeof revisionRaw === 'string'
              ? Number(revisionRaw)
              : NaN
        if (!Number.isFinite(parsedRevision) || !isRecord(stateJsonRaw) || typeof idRaw !== 'string') {
          return
        }

        onRoundStateEvent({
          roundId: idRaw,
          revision: parsedRevision,
          stateJson: stateJsonRaw,
          updatedAt: typeof updatedAtRaw === 'string' ? updatedAtRaw : '',
        })
      },
    )

  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      reportTelemetryEvent({
        scope: 'multiplayer',
        level: 'warn',
        message: 'Realtime round-state channel error',
        data: {
          roundId,
        },
      })
    }
  })

  return () => {
    void client.removeChannel(channel)
  }
}
