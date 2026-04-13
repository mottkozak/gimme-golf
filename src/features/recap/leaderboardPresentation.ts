export function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

export function getMissionSummaryFlavor(
  status: 'success' | 'failed',
  holeNumber: number,
  playerName: string,
): string {
  const successLines = [
    `${playerName} cashed it in with calm tempo.`,
    `${playerName} converted and grabbed the bonus clean.`,
    `${playerName} stepped up and closed the mission.`,
    `${playerName} played it like Sunday pressure.`,
  ]
  const failedLines = [
    `${playerName} pushed it right and missed the bonus.`,
    `${playerName} came up short on this one.`,
    `${playerName} had the look but couldn’t convert.`,
    `${playerName} left this mission on the table.`,
  ]

  const lines = status === 'success' ? successLines : failedLines
  const seed = holeNumber + playerName.length
  return lines[seed % lines.length]
}

export function getMissionResultCallout(status: 'success' | 'failed', points: number): string {
  if (status === 'success') {
    return `Reward collected: ${formatSignedPoints(points)} points swing in the right direction.`
  }

  return `No reward collected: ${formatSignedPoints(points)} was available on completion.`
}

export function formatDuration(ms: number | null): string {
  if (typeof ms !== 'number') {
    return 'Pending'
  }

  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}
