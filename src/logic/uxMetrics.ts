import type { HoleDefinition, HoleUxMetrics } from '../types/game.ts'

function createEmptyHoleUxMetrics(holeNumber: number): HoleUxMetrics {
  return {
    holeNumber,
    startedAtMs: null,
    completedAtMs: null,
    durationMs: null,
    tapsToComplete: 0,
    publicResolutionStartedAtMs: null,
    publicResolutionCompletedAtMs: null,
    publicResolutionDurationMs: null,
  }
}

function updateHoleMetrics(
  holeUxMetrics: HoleUxMetrics[],
  holeIndex: number,
  updater: (current: HoleUxMetrics) => HoleUxMetrics,
): HoleUxMetrics[] {
  const current = holeUxMetrics[holeIndex]
  if (!current) {
    return holeUxMetrics
  }

  const next = [...holeUxMetrics]
  next[holeIndex] = updater(current)
  return next
}

export function buildHoleUxMetrics(
  holes: HoleDefinition[],
  existingHoleUxMetrics: HoleUxMetrics[] = [],
): HoleUxMetrics[] {
  return holes.map((hole, holeIndex) => {
    const existing = existingHoleUxMetrics[holeIndex]
    if (!existing || existing.holeNumber !== hole.holeNumber) {
      return createEmptyHoleUxMetrics(hole.holeNumber)
    }

    return {
      holeNumber: hole.holeNumber,
      startedAtMs:
        typeof existing.startedAtMs === 'number' ? existing.startedAtMs : null,
      completedAtMs:
        typeof existing.completedAtMs === 'number' ? existing.completedAtMs : null,
      durationMs: typeof existing.durationMs === 'number' ? existing.durationMs : null,
      tapsToComplete:
        typeof existing.tapsToComplete === 'number' && existing.tapsToComplete >= 0
          ? Math.round(existing.tapsToComplete)
          : 0,
      publicResolutionStartedAtMs:
        typeof existing.publicResolutionStartedAtMs === 'number'
          ? existing.publicResolutionStartedAtMs
          : null,
      publicResolutionCompletedAtMs:
        typeof existing.publicResolutionCompletedAtMs === 'number'
          ? existing.publicResolutionCompletedAtMs
          : null,
      publicResolutionDurationMs:
        typeof existing.publicResolutionDurationMs === 'number'
          ? existing.publicResolutionDurationMs
          : null,
    }
  })
}

export function incrementHoleTapCount(
  holeUxMetrics: HoleUxMetrics[],
  holeIndex: number,
): HoleUxMetrics[] {
  return updateHoleMetrics(holeUxMetrics, holeIndex, (current) => ({
    ...current,
    tapsToComplete: current.tapsToComplete + 1,
  }))
}

export function markHoleStartedAt(
  holeUxMetrics: HoleUxMetrics[],
  holeIndex: number,
  startedAtMs: number,
): HoleUxMetrics[] {
  return updateHoleMetrics(holeUxMetrics, holeIndex, (current) => {
    if (typeof current.startedAtMs === 'number') {
      return current
    }

    return {
      ...current,
      startedAtMs,
    }
  })
}

export function markHoleCompletedAt(
  holeUxMetrics: HoleUxMetrics[],
  holeIndex: number,
  completedAtMs: number,
): HoleUxMetrics[] {
  return updateHoleMetrics(holeUxMetrics, holeIndex, (current) => ({
    ...current,
    completedAtMs,
    durationMs:
      typeof current.startedAtMs === 'number'
        ? Math.max(0, completedAtMs - current.startedAtMs)
        : current.durationMs,
  }))
}

export function markPublicResolutionStartedAt(
  holeUxMetrics: HoleUxMetrics[],
  holeIndex: number,
  startedAtMs: number,
): HoleUxMetrics[] {
  return updateHoleMetrics(holeUxMetrics, holeIndex, (current) => {
    if (typeof current.publicResolutionStartedAtMs === 'number') {
      return current
    }

    return {
      ...current,
      publicResolutionStartedAtMs: startedAtMs,
    }
  })
}

export function markPublicResolutionCompletedAt(
  holeUxMetrics: HoleUxMetrics[],
  holeIndex: number,
  completedAtMs: number,
): HoleUxMetrics[] {
  return updateHoleMetrics(holeUxMetrics, holeIndex, (current) => ({
    ...current,
    publicResolutionCompletedAtMs: completedAtMs,
    publicResolutionDurationMs:
      typeof current.publicResolutionStartedAtMs === 'number'
        ? Math.max(0, completedAtMs - current.publicResolutionStartedAtMs)
        : current.publicResolutionDurationMs,
  }))
}
