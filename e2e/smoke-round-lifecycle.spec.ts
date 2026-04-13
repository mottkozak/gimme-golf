import { expect, test } from '@playwright/test'

test('smoke: round setup through leaderboard lifecycle', async ({ page }) => {
  await page.goto('/')

  await page.locator('.home-floating-dock__button--play').click()
  await expect(page.getByRole('heading', { name: 'Round Config' })).toBeVisible()

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('heading', { name: 'Hole Setup' })).toBeVisible()

  await page.getByRole('button', { name: /Deal Hole 1 (Cards|Power Ups)/ }).click()

  const golferModules = page.locator('.hole-golfer-module')
  const golferModuleCount = await golferModules.count()
  for (let index = 0; index < golferModuleCount; index += 1) {
    const module = golferModules.nth(index)
    const selectedBadge = module.getByText('✓ Selected')
    if ((await selectedBadge.count()) > 0) {
      continue
    }

    const selectableCard = module.locator('.challenge-card--selectable').first()
    if ((await selectableCard.count()) > 0) {
      await selectableCard.click()
    }
  }

  await expect(page.getByRole('heading', { name: 'Missions this hole' })).toBeVisible()
  await page.getByRole('button', { name: 'Enter Hole Results' }).click()
  await expect(page.getByRole('heading', { name: 'Hole Results' })).toBeVisible()

  const scoreButtons = page.locator('.hole-score-button-group .hole-score-button')
  const scoreButtonCount = await scoreButtons.count()
  for (let index = 0; index < scoreButtonCount; index += 13) {
    await scoreButtons.nth(index).click()
  }

  const publicCards = page.locator('.hole-public-resolution-card')
  const publicCardCount = await publicCards.count()
  for (let index = 0; index < publicCardCount; index += 1) {
    const card = publicCards.nth(index)
    await card.getByRole('button', { name: 'No' }).first().click()
  }

  await page.getByRole('button', { name: 'Save Hole & View Recap' }).click()
  await expect(page.getByRole('heading', { name: /Hole \d+ Recap/ })).toBeVisible()
})
