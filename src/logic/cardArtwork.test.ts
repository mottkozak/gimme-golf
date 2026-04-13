/// <reference types="node" />

import assert from 'node:assert/strict'
import test from 'node:test'
import { PERSONAL_CARDS, PUBLIC_CARDS } from '../data/cards.ts'
import { CURSE_CARDS, POWER_UPS } from '../data/powerUps.ts'
import {
  CHAOS_WILDCARD_CARD_CODES,
  CURSE_ARCADE_CARD_CODES,
  CLASSIC_CORE54_CARD_CODES,
  NOVELTY_SHOWTIME_CARD_CODES,
  POWER_UP_ARCADE_CARD_CODES,
  PROPS_FORECAST_CARD_CODES,
  getPersonalCardArtwork,
  getPublicCardArtwork,
  getPowerUpCardArtwork,
} from './cardArtwork.ts'

function getPersonalCardByCode(code: string) {
  return PERSONAL_CARDS.find((card) => card.code === code)
}

function getPublicCardByCode(code: string) {
  return PUBLIC_CARDS.find((card) => card.code === code)
}

function getPowerUpByCode(code: string) {
  return POWER_UPS.find((card) => card.code === code)
}

function getCurseByCode(code: string) {
  return CURSE_CARDS.find((card) => card.code === code)
}

test('resolves mapped classic artwork URL for known card code', () => {
  const card = getPersonalCardByCode('COM-008')
  assert.ok(card)

  const artwork = getPersonalCardArtwork(card)
  assert.ok(artwork)
  assert.equal(
    artwork.src,
    '/cards/core54/medium/COM-008-Recovery%20Artist.png',
  )
})

test('maps SKL-037 to uploaded SKL-0370 artwork filename', () => {
  const card = getPersonalCardByCode('SKL-037')
  assert.ok(card)

  const artwork = getPersonalCardArtwork(card)
  assert.ok(artwork)
  assert.equal(
    artwork.src,
    '/cards/core54/medium/SKL-0370-Strong%20Three.png',
  )
})

test('every mapped Core54 challenge code resolves to artwork', () => {
  assert.equal(CLASSIC_CORE54_CARD_CODES.length, 54)

  for (const code of CLASSIC_CORE54_CARD_CODES) {
    const card = getPersonalCardByCode(code)
    assert.ok(card, `Missing active card for mapped code ${code}`)
    const artwork = getPersonalCardArtwork(card)
    assert.ok(artwork, `Missing artwork for ${card.code} ${card.name}`)
  }
})

test('resolves novelty artwork URL for mapped novelty card code', () => {
  const card = getPersonalCardByCode('NOV-023')
  assert.ok(card)

  const artwork = getPersonalCardArtwork(card)
  assert.ok(artwork)
  assert.equal(
    artwork.src,
    '/cards/Novelty/hard/NOV-023-One-Club%20Wizard.png',
  )
})

test('resolves chaos artwork URL for mapped public card code', () => {
  const card = getPublicCardByCode('CHA-015')
  assert.ok(card)

  const artwork = getPublicCardArtwork(card)
  assert.ok(artwork)
  assert.equal(
    artwork.src,
    '/cards/Chaos/hard/CHA-015-Chaos%20Swap.png',
  )
})

test('resolves props artwork URL for mapped public card code', () => {
  const card = getPublicCardByCode('PRP-003')
  assert.ok(card)

  const artwork = getPublicCardArtwork(card)
  assert.ok(artwork)
  assert.equal(
    artwork.src,
    '/cards/Props/medium/PRP-003-Green%20Hit.png',
  )
})

test('every mapped novelty code resolves to artwork', () => {
  assert.equal(NOVELTY_SHOWTIME_CARD_CODES.length, 18)

  for (const code of NOVELTY_SHOWTIME_CARD_CODES) {
    const card = getPersonalCardByCode(code)
    assert.ok(card, `Missing active novelty card for mapped code ${code}`)
    const artwork = getPersonalCardArtwork(card)
    assert.ok(artwork, `Missing novelty artwork for ${card.code} ${card.name}`)
  }
})

test('every mapped chaos code resolves to artwork', () => {
  assert.equal(CHAOS_WILDCARD_CARD_CODES.length, 18)

  for (const code of CHAOS_WILDCARD_CARD_CODES) {
    const card = getPublicCardByCode(code)
    assert.ok(card, `Missing active chaos card for mapped code ${code}`)
    const artwork = getPublicCardArtwork(card)
    assert.ok(artwork, `Missing chaos artwork for ${card.code} ${card.name}`)
  }
})

test('every mapped props code resolves to artwork', () => {
  assert.equal(PROPS_FORECAST_CARD_CODES.length, 18)

  for (const code of PROPS_FORECAST_CARD_CODES) {
    const card = getPublicCardByCode(code)
    assert.ok(card, `Missing active props card for mapped code ${code}`)
    const artwork = getPublicCardArtwork(card)
    assert.ok(artwork, `Missing props artwork for ${card.code} ${card.name}`)
  }
})

test('resolves power-up artwork URL for mapped arcade card code', () => {
  const card = getPowerUpByCode('PWR-020')
  assert.ok(card)

  const artwork = getPowerUpCardArtwork(card)
  assert.ok(artwork)
  assert.equal(
    artwork.src,
    '/cards/PowerUp/medium/PWR-020-Power%20Drive%20%E2%80%93%20Turbo.png',
  )
})

test('resolves curse artwork URL for mapped arcade card code', () => {
  const card = getCurseByCode('CUR-014')
  assert.ok(card)

  const artwork = getPowerUpCardArtwork(card)
  assert.ok(artwork)
  assert.equal(
    artwork.src,
    '/cards/Curse/hard/CUR-014%20-No%20Optional%20Relief.png',
  )
})

test('every mapped power-up code resolves to artwork', () => {
  assert.equal(POWER_UP_ARCADE_CARD_CODES.length, 36)

  for (const code of POWER_UP_ARCADE_CARD_CODES) {
    const card = getPowerUpByCode(code)
    assert.ok(card, `Missing active power-up card for mapped code ${code}`)
    const artwork = getPowerUpCardArtwork(card)
    assert.ok(artwork, `Missing power-up artwork for ${card.code} ${card.title}`)
  }
})

test('every mapped curse code resolves to artwork', () => {
  assert.equal(CURSE_ARCADE_CARD_CODES.length, 18)

  for (const code of CURSE_ARCADE_CARD_CODES) {
    const card = getCurseByCode(code)
    assert.ok(card, `Missing active curse card for mapped code ${code}`)
    const artwork = getPowerUpCardArtwork(card)
    assert.ok(artwork, `Missing curse artwork for ${card.code} ${card.title}`)
  }
})
