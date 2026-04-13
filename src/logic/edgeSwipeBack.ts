export interface EdgeSwipeBackThresholds {
  edgeZonePx: number
  minDistancePx: number
  maxVerticalDriftPx: number
  minHorizontalRatio: number
  maxDurationMs: number
}

export interface EdgeSwipeBackSample {
  startX: number
  startY: number
  endX: number
  endY: number
  durationMs: number
}

const SWIPE_BLOCKED_TARGET_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[contenteditable="true"]',
  '[data-swipe-ignore="true"]',
].join(', ')

export const DEFAULT_EDGE_SWIPE_BACK_THRESHOLDS: EdgeSwipeBackThresholds = {
  edgeZonePx: 72,
  minDistancePx: 70,
  maxVerticalDriftPx: 88,
  minHorizontalRatio: 1,
  maxDurationMs: 900,
}

function isBlockedSwipeStartTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  return target.closest(SWIPE_BLOCKED_TARGET_SELECTOR) !== null
}

export function shouldCaptureEdgeSwipeBackStart(
  startX: number,
  target: EventTarget | null,
  thresholds: EdgeSwipeBackThresholds = DEFAULT_EDGE_SWIPE_BACK_THRESHOLDS,
): boolean {
  if (startX > thresholds.edgeZonePx) {
    return false
  }

  return !isBlockedSwipeStartTarget(target)
}

export function isEdgeSwipeBackGesture(
  sample: EdgeSwipeBackSample,
  thresholds: EdgeSwipeBackThresholds = DEFAULT_EDGE_SWIPE_BACK_THRESHOLDS,
): boolean {
  const deltaX = sample.endX - sample.startX
  const deltaY = sample.endY - sample.startY
  const absDeltaY = Math.abs(deltaY)

  if (sample.durationMs > thresholds.maxDurationMs) {
    return false
  }

  if (deltaX < thresholds.minDistancePx) {
    return false
  }

  if (absDeltaY > thresholds.maxVerticalDriftPx) {
    return false
  }

  if (deltaX < absDeltaY * thresholds.minHorizontalRatio) {
    return false
  }

  return true
}
