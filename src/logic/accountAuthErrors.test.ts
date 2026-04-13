/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAuthNetworkErrorMessage,
  sendSupabaseMagicLink,
  type AuthNetworkResult,
} from './account.ts'

test('auth_error messages are surfaced to the user when available', () => {
  const message = getAuthNetworkErrorMessage({
    code: 'auth_error',
    message: 'Authentication service returned status 400. redirect_to is not allowed',
    retryable: false,
    attempts: 1,
  })

  assert.match(message, /redirect_to is not allowed/i)
})

test('sendSupabaseMagicLink preserves provider error details for status failures', async () => {
  const client = {
    auth: {
      signInWithOtp: async () => ({
        error: {
          status: 400,
          message: 'redirect_to is not allowed',
        },
      }),
    },
  } as unknown as Parameters<typeof sendSupabaseMagicLink>[0]

  const result = (await sendSupabaseMagicLink(
    client,
    'golfer@example.com',
    'gimmegolf://auth/callback',
  )) as AuthNetworkResult<true>

  assert.equal(result.ok, false)
  if (result.ok) {
    return
  }

  assert.equal(result.error.code, 'auth_error')
  assert.equal(result.error.retryable, false)
  assert.match(result.error.message, /status 400/i)
  assert.match(result.error.message, /redirect_to is not allowed/i)
  assert.equal(getAuthNetworkErrorMessage(result.error), result.error.message)
})

test('sendSupabaseMagicLink does not retry on 429 rate limits and shows guidance', async () => {
  let callCount = 0
  const client = {
    auth: {
      signInWithOtp: async () => {
        callCount += 1
        return {
          error: {
            status: 429,
            message: 'email rate limit exceeded',
          },
        }
      },
    },
  } as unknown as Parameters<typeof sendSupabaseMagicLink>[0]

  const result = (await sendSupabaseMagicLink(
    client,
    'golfer@example.com',
    'gimmegolf://auth/callback',
  )) as AuthNetworkResult<true>

  assert.equal(callCount, 1)
  assert.equal(result.ok, false)
  if (result.ok) {
    return
  }

  assert.equal(result.error.code, 'auth_error')
  assert.equal(result.error.retryable, false)
  assert.equal(result.error.attempts, 1)
  assert.equal(
    getAuthNetworkErrorMessage(result.error),
    'Too many login emails requested. Wait a bit, then try again.',
  )
})
