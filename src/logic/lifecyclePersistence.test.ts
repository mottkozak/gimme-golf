/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoundLifecyclePersistence } from './lifecyclePersistence.ts'

type Listener = () => void

class WindowStub {
  document: { visibilityState: string } = { visibilityState: 'visible' }
  private listenersByEventName = new Map<string, Set<Listener>>()

  addEventListener(eventName: string, listener: Listener) {
    const currentListeners = this.listenersByEventName.get(eventName) ?? new Set<Listener>()
    currentListeners.add(listener)
    this.listenersByEventName.set(eventName, currentListeners)
  }

  removeEventListener(eventName: string, listener: Listener) {
    const currentListeners = this.listenersByEventName.get(eventName)
    if (!currentListeners) {
      return
    }
    currentListeners.delete(listener)
    if (currentListeners.size === 0) {
      this.listenersByEventName.delete(eventName)
    }
  }

  dispatch(eventName: string) {
    const currentListeners = this.listenersByEventName.get(eventName)
    if (!currentListeners) {
      return
    }
    for (const listener of currentListeners) {
      listener()
    }
  }
}

test('registerRoundLifecyclePersistence persists on hidden/pagehide/beforeunload', () => {
  const windowStub = new WindowStub()
  let persistCalls = 0
  const dispose = registerRoundLifecyclePersistence({
    windowObject: windowStub,
    hasSavedRound: () => true,
    persistRoundState: () => {
      persistCalls += 1
    },
  })

  windowStub.document.visibilityState = 'hidden'
  windowStub.dispatch('visibilitychange')
  windowStub.dispatch('pagehide')
  windowStub.dispatch('beforeunload')

  assert.equal(persistCalls, 3)

  dispose()
  windowStub.dispatch('pagehide')
  assert.equal(persistCalls, 3)
})

test('registerRoundLifecyclePersistence does not persist without a saved round', () => {
  const windowStub = new WindowStub()
  let persistCalls = 0
  registerRoundLifecyclePersistence({
    windowObject: windowStub,
    hasSavedRound: () => false,
    persistRoundState: () => {
      persistCalls += 1
    },
  })

  windowStub.document.visibilityState = 'hidden'
  windowStub.dispatch('visibilitychange')
  windowStub.dispatch('pagehide')
  windowStub.dispatch('beforeunload')

  assert.equal(persistCalls, 0)
})
