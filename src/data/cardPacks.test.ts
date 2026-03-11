/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CARD_PACKS,
  CARD_PACKS_BY_ID,
  getDefaultEnabledPackIds,
  getSetupCardPackSections,
  normalizeEnabledPackIds,
} from './cardPacks.ts'

test('setup pack sections only include active, setup-visible packs', () => {
  const setupSections = getSetupCardPackSections()
  const visiblePackIds = setupSections.flatMap((section) => section.packs.map((pack) => pack.id))

  assert.deepEqual(visiblePackIds, CARD_PACKS.map((pack) => pack.id))
  assert.equal(visiblePackIds.includes('curse'), false)
  assert.equal(visiblePackIds.includes('style'), false)
  assert.ok(setupSections.every((section) => section.packs.length > 0))
})

test('normalizeEnabledPackIds ignores hidden or unreleased pack ids', () => {
  const normalizedPackIds = normalizeEnabledPackIds(['classic', 'style', 'curse', 'chaos'])

  assert.deepEqual(normalizedPackIds, ['classic', 'chaos'])
})

test('catalog keeps hidden pack metadata for future release planning', () => {
  const cursePack = CARD_PACKS_BY_ID.curse
  const stylePack = CARD_PACKS_BY_ID.style

  assert.equal(cursePack.releaseStage, 'planned')
  assert.equal(cursePack.setupVisibility, 'hidden')
  assert.equal(stylePack.releaseStage, 'planned')
  assert.equal(stylePack.setupVisibility, 'hidden')
  assert.equal(getDefaultEnabledPackIds().includes('curse'), false)
  assert.equal(getDefaultEnabledPackIds().includes('style'), false)
})
