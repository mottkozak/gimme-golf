import { reportTelemetryEvent } from './telemetry.ts'

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type StorageOperation = 'read' | 'write' | 'remove'
export type StorageOperationErrorCode =
  | 'storage_unavailable'
  | 'storage_read_failed'
  | 'storage_write_failed'
  | 'storage_remove_failed'

export interface StorageOperationError {
  code: StorageOperationErrorCode
  operation: StorageOperation
  key: string
  cause?: unknown
}

export type StorageOperationResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      error: StorageOperationError
    }

function getStorage(): StorageLike | null {
  if (typeof globalThis.localStorage === 'undefined') {
    return null
  }

  return globalThis.localStorage
}

function reportStorageError(error: StorageOperationError): void {
  reportTelemetryEvent({
    scope: 'storage',
    level: 'warn',
    message: `Storage ${error.operation} failed`,
    data: {
      key: error.key,
      code: error.code,
    },
    error: error.cause,
  })
}

function unavailableStorageResult<T>(
  operation: StorageOperation,
  key: string,
): StorageOperationResult<T> {
  const error: StorageOperationError = {
    code: 'storage_unavailable',
    operation,
    key,
  }
  reportStorageError(error)
  return {
    ok: false,
    error,
  }
}

export function readStorageItemResult(key: string): StorageOperationResult<string | null> {
  const storage = getStorage()
  if (!storage) {
    return unavailableStorageResult('read', key)
  }

  try {
    return {
      ok: true,
      value: storage.getItem(key),
    }
  } catch (error) {
    const storageError: StorageOperationError = {
      code: 'storage_read_failed',
      operation: 'read',
      key,
      cause: error,
    }
    reportStorageError(storageError)
    return {
      ok: false,
      error: storageError,
    }
  }
}

export function writeStorageItemResult(
  key: string,
  value: string,
): StorageOperationResult<true> {
  const storage = getStorage()
  if (!storage) {
    return unavailableStorageResult('write', key)
  }

  try {
    storage.setItem(key, value)
    return {
      ok: true,
      value: true,
    }
  } catch (error) {
    const storageError: StorageOperationError = {
      code: 'storage_write_failed',
      operation: 'write',
      key,
      cause: error,
    }
    reportStorageError(storageError)
    return {
      ok: false,
      error: storageError,
    }
  }
}

export function removeStorageItemResult(key: string): StorageOperationResult<true> {
  const storage = getStorage()
  if (!storage) {
    return unavailableStorageResult('remove', key)
  }

  try {
    storage.removeItem(key)
    return {
      ok: true,
      value: true,
    }
  } catch (error) {
    const storageError: StorageOperationError = {
      code: 'storage_remove_failed',
      operation: 'remove',
      key,
      cause: error,
    }
    reportStorageError(storageError)
    return {
      ok: false,
      error: storageError,
    }
  }
}

export function readStorageItem(key: string): string | null {
  const result = readStorageItemResult(key)
  if (!result.ok) {
    return null
  }

  return result.value
}

export function writeStorageItem(key: string, value: string): boolean {
  const result = writeStorageItemResult(key, value)
  return result.ok
}

export function removeStorageItem(key: string): boolean {
  const result = removeStorageItemResult(key)
  return result.ok
}

export function isStorageFailure<T>(
  result: StorageOperationResult<T>,
): result is { ok: false; error: StorageOperationError } {
  return !result.ok
}

export function isStorageSuccess<T>(
  result: StorageOperationResult<T>,
): result is { ok: true; value: T } {
  return result.ok
}

export function summarizeStorageError(error: StorageOperationError): string {
  if (error.code === 'storage_unavailable') {
    return 'Storage is unavailable in this runtime.'
  }

  if (error.code === 'storage_read_failed') {
    return 'Storage read failed.'
  }

  if (error.code === 'storage_write_failed') {
    return 'Storage write failed.'
  }

  return 'Storage remove failed.'
}

export function logStorageError(error: StorageOperationError): void {
  reportStorageError(error)
}

export function toStorageFailureResult<T>(
  error: StorageOperationError,
): StorageOperationResult<T> {
  reportStorageError(error)
  return {
    ok: false,
    error,
  }
}
