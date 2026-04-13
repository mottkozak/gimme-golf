export function createDraftId(position: number): string {
  const timestamp = Date.now().toString(36)
  return `player-${position}-${timestamp}`
}

export function normalizeSetupPlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function isDefaultSetupPlayerName(playerName: string, position: number): boolean {
  const normalizedName = normalizeSetupPlayerName(playerName)
  if (!normalizedName) {
    return true
  }

  return normalizedName.toLocaleLowerCase() === `golfer ${position}`.toLocaleLowerCase()
}

export function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const name of names) {
    const normalizedName = normalizeSetupPlayerName(name)
    if (!normalizedName) {
      continue
    }

    const normalizedKey = normalizedName.toLocaleLowerCase()
    if (seen.has(normalizedKey)) {
      continue
    }

    seen.add(normalizedKey)
    deduped.push(normalizedName)
  }

  return deduped
}
