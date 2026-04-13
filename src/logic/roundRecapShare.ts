import { buildLeaderboardEntries, getAdjustedScoreLeaders } from './leaderboard.ts'
import { formatPlayerNames } from './playerNames.ts'
import { computeRoundAwards } from './awards.ts'
import type { RecapShareTheme } from './roundRecapViewModel.ts'
import {
  copyTextToClipboard,
  createCanvasElement,
  createFileFromBlob,
  downloadBlobAsFile,
  saveBlobToDocuments,
  saveTextToDocuments,
  shareRecapViaNativeOrWeb,
  type PlatformShareResult,
} from '../platform/recapSharing.ts'
import type { GameMode, RoundState } from '../types/game.ts'

export interface RoundRecapLeaderboardRow {
  rank: number
  playerName: string
  realScore: number
  adjustedScore: number
  gamePoints: number
}

export interface RoundRecapPayload {
  shareTheme: RecapShareTheme
  themeTitle: string
  themeSubtitle: string
  winnerNames: string
  bestMomentLine: string
  roundPersonalityLine: string
  chaosTierLabel: string
  topLeaderboardRows: RoundRecapLeaderboardRow[]
  holeCount: number
  gameModeLabel: string
}

export type NativeShareResult = PlatformShareResult

interface NativeShareOptions {
  title: string
  text: string
  url: string
  imageFile: File | null
}

const RECAP_IMAGE_FILE_NAME = 'gimme-golf-round-recap.png'
const RECAP_JSON_FILE_NAME = 'gimme-golf-round-recap.json'

interface RoundRecapBuildOptions {
  theme?: RecapShareTheme
}

function formatGameModeLabel(gameMode: GameMode): string {
  return gameMode === 'powerUps' ? 'Power Ups' : 'Cards'
}

function formatScoreWithSign(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

function getPlayerNameFallback(playerName: string, playerIndex: number): string {
  const trimmedName = playerName.trim()
  return trimmedName.length > 0 ? trimmedName : `Player ${playerIndex + 1}`
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const clampedRadius = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + clampedRadius, y)
  context.lineTo(x + width - clampedRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius)
  context.lineTo(x + width, y + height - clampedRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height)
  context.lineTo(x + clampedRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius)
  context.lineTo(x, y + clampedRadius)
  context.quadraticCurveTo(x, y, x + clampedRadius, y)
  context.closePath()
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/).filter((entry) => entry.length > 0)
  if (words.length === 0) {
    return startY
  }

  let currentLine = ''
  let currentY = startY
  let lineCount = 0

  for (const word of words) {
    const nextLine = currentLine.length === 0 ? word : `${currentLine} ${word}`
    const measuredWidth = context.measureText(nextLine).width
    if (measuredWidth <= maxWidth) {
      currentLine = nextLine
      continue
    }

    context.fillText(currentLine, x, currentY)
    lineCount += 1

    if (lineCount >= maxLines) {
      return currentY + lineHeight
    }

    currentLine = word
    currentY += lineHeight
  }

  context.fillText(currentLine, x, currentY)
  return currentY + lineHeight
}

export function formatSignedPoints(value: number): string {
  return formatScoreWithSign(value)
}

function getThemeCopy(theme: RecapShareTheme): Pick<RoundRecapPayload, 'themeTitle' | 'themeSubtitle'> {
  if (theme === 'chaos') {
    return {
      themeTitle: 'Chaos Recap',
      themeSubtitle: 'Wild swings and public-card drama.',
    }
  }

  if (theme === 'comeback') {
    return {
      themeTitle: 'Comeback Recap',
      themeSubtitle: 'Momentum shifts and clutch closes.',
    }
  }

  return {
    themeTitle: 'Champion Recap',
    themeSubtitle: 'A clean finish and winning line.',
  }
}

export function buildRoundRecapPayload(
  roundState: RoundState,
  options: RoundRecapBuildOptions = {},
): RoundRecapPayload {
  const shareTheme: RecapShareTheme = options.theme ?? 'champion'
  const themeCopy = getThemeCopy(shareTheme)
  const playerIndexById = Object.fromEntries(
    roundState.players.map((player, index) => [player.id, index]),
  )
  const leaderboardRows = buildLeaderboardEntries(
    roundState.players,
    roundState.totalsByPlayerId,
    'adjustedScore',
  ).map((row) => {
    const playerIndex = playerIndexById[row.playerId] ?? 0
    return {
      ...row,
      playerName: getPlayerNameFallback(row.playerName, playerIndex),
    }
  })

  const adjustedLeaders = getAdjustedScoreLeaders(leaderboardRows)
  const winnerNames =
    adjustedLeaders.length > 0 ? formatPlayerNames(adjustedLeaders.map((row) => row.playerName)) : '-'
  const awardsSummary = computeRoundAwards(roundState)
  const awardById = Object.fromEntries(awardsSummary.awards.map((award) => [award.awardId, award]))
  const totalPublicImpact = Object.values(awardsSummary.statsByPlayerId).reduce(
    (total, stats) => total + stats.publicImpactMagnitude,
    0,
  )
  const holesWithPublicCards = roundState.holeCards.filter((hole) => hole.publicCards.length > 0).length
  const chaosIntensity = Math.min(
    100,
    Math.round(
      (Math.min(totalPublicImpact, roundState.holes.length * 4) / Math.max(1, roundState.holes.length * 4)) * 70 +
        (holesWithPublicCards / Math.max(1, roundState.holes.length)) * 30,
    ),
  )
  const chaosTierLabel =
    chaosIntensity >= 75 ? 'Wild' : chaosIntensity >= 45 ? 'Active' : chaosIntensity >= 20 ? 'Spicy' : 'Calm'
  const comebackLine =
    awardById.biggestComeback?.supportingStat ?? `${winnerNames} closed the gap when it counted.`
  const bestMomentLine =
    shareTheme === 'chaos'
      ? `${chaosTierLabel} chaos • ${totalPublicImpact} public swing`
      : shareTheme === 'comeback'
        ? comebackLine
        : `Winner spotlight: ${winnerNames}`

  return {
    shareTheme,
    themeTitle: themeCopy.themeTitle,
    themeSubtitle: themeCopy.themeSubtitle,
    winnerNames,
    bestMomentLine,
    roundPersonalityLine: awardsSummary.roundPersonalityLine,
    chaosTierLabel,
    topLeaderboardRows: leaderboardRows.slice(0, 3).map((row, index) => ({
      rank: index + 1,
      playerName: row.playerName,
      realScore: row.realScore,
      adjustedScore: row.adjustedScore,
      gamePoints: row.gamePoints,
    })),
    holeCount: roundState.holes.length > 0 ? roundState.holes.length : roundState.config.holeCount,
    gameModeLabel: formatGameModeLabel(roundState.config.gameMode),
  }
}

export function formatRoundRecapText(
  payload: RoundRecapPayload,
  storeUrls: { ios: string; android: string },
): string {
  const recapRows =
    payload.topLeaderboardRows.length > 0
      ? payload.topLeaderboardRows.map(
          (row) =>
            `${row.rank}. ${row.playerName} - Adjusted ${row.adjustedScore} | Points ${formatScoreWithSign(row.gamePoints)}`,
        )
      : ['No leaderboard rows available.']

  return [
    `Gimme Golf ${payload.themeTitle}`,
    `Podium Winner: ${payload.winnerNames}`,
    `Round Moment: ${payload.bestMomentLine}`,
    `Round Personality: ${payload.roundPersonalityLine}`,
    `Format: ${payload.gameModeLabel} | Holes: ${payload.holeCount}`,
    'Final Leaderboard (Top 3):',
    ...recapRows,
    'Download Gimme Golf:',
    `App Store (iOS): ${storeUrls.ios}`,
    `Google Play (Android): ${storeUrls.android}`,
  ].join('\n')
}

export function renderRoundRecapCanvas(
  payload: RoundRecapPayload,
  appUrl: string,
): HTMLCanvasElement | null {
  const canvas = createCanvasElement(1080, 1080)
  if (!canvas) {
    return null
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  const backgroundGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  if (payload.shareTheme === 'chaos') {
    backgroundGradient.addColorStop(0, '#e8dece')
    backgroundGradient.addColorStop(1, '#dfd4c3')
  } else if (payload.shareTheme === 'comeback') {
    backgroundGradient.addColorStop(0, '#ebe2d4')
    backgroundGradient.addColorStop(1, '#e2d7c8')
  } else {
    backgroundGradient.addColorStop(0, '#efe7da')
    backgroundGradient.addColorStop(1, '#e4dbcd')
  }
  context.fillStyle = backgroundGradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const panelPadding = 64
  const panelX = panelPadding
  const panelY = panelPadding
  const panelWidth = canvas.width - panelPadding * 2
  const panelHeight = canvas.height - panelPadding * 2

  drawRoundedRect(context, panelX, panelY, panelWidth, panelHeight, 36)
  context.fillStyle = '#f8f2e8'
  context.fill()
  context.strokeStyle = '#a69a88'
  context.lineWidth = 4
  context.stroke()

  const podiumRows = payload.topLeaderboardRows.slice(0, 3)
  const winnerRow = podiumRows[0] ?? null
  const winnerLabel = winnerRow
    ? `${winnerRow.playerName} ${winnerRow.rank === 1 ? 'wins' : 'tops'} the round!`
    : `${payload.winnerNames} wins the round!`

  context.fillStyle = '#1f3428'
  context.font = '700 54px Neuton, Georgia, serif'
  context.fillText('Gimme Golf Round Recap', panelX + 54, panelY + 98)

  context.fillStyle = '#1f4d35'
  context.font = '700 46px Neuton, Georgia, serif'
  const winnerBottomY = drawWrappedText(context, winnerLabel, panelX + 54, panelY + 158, panelWidth - 108, 52, 2)

  const podiumWrapX = panelX + 54
  const podiumWrapY = winnerBottomY + 26
  const podiumWrapWidth = panelWidth - 108
  const podiumWrapHeight = 268
  drawRoundedRect(context, podiumWrapX, podiumWrapY, podiumWrapWidth, podiumWrapHeight, 24)
  context.fillStyle = '#fbf7ef'
  context.fill()
  context.strokeStyle = '#b5a99a'
  context.lineWidth = 2
  context.stroke()

  context.fillStyle = '#24543b'
  context.font = '700 24px Figtree, Arial, sans-serif'
  context.fillText('Podium', podiumWrapX + 26, podiumWrapY + 42)

  const podiumSlotWidth = (podiumWrapWidth - 72) / 3
  const slotStartX = podiumWrapX + 18
  const slotBaseY = podiumWrapY + podiumWrapHeight - 36
  const podiumLayout = [
    { row: podiumRows[1], place: 2, medal: '🥈', blockHeight: 96, fill: '#a8a19b' },
    { row: podiumRows[0], place: 1, medal: '🥇', blockHeight: 142, fill: '#c99a35' },
    { row: podiumRows[2], place: 3, medal: '🥉', blockHeight: 114, fill: '#ab7044' },
  ]

  podiumLayout.forEach((slot, index) => {
    if (!slot.row) {
      return
    }
    const slotX = slotStartX + index * (podiumSlotWidth + 18)
    const blockY = slotBaseY - slot.blockHeight

    context.fillStyle = '#2a5a40'
    context.font = '600 24px Figtree, Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText(slot.medal, slotX + podiumSlotWidth / 2, blockY - 22)

    context.fillStyle = '#1f372c'
    context.font = '700 24px Figtree, Arial, sans-serif'
    context.fillText(slot.row.playerName, slotX + podiumSlotWidth / 2, blockY - 2)

    drawRoundedRect(context, slotX, blockY + 14, podiumSlotWidth, slot.blockHeight, 14)
    context.fillStyle = slot.fill
    context.fill()
    context.strokeStyle = '#786f65'
    context.lineWidth = 1.5
    context.stroke()

    context.fillStyle = '#f8f3e8'
    context.font = '700 52px Figtree, Arial, sans-serif'
    context.fillText(String(slot.place), slotX + podiumSlotWidth / 2, blockY + 88)
    context.textAlign = 'left'
  })

  if (winnerRow) {
    const statY = podiumWrapY + podiumWrapHeight + 24
    const statWidth = (panelWidth - 132) / 3
    const statHeight = 140
    const statData = [
      { label: 'Total Strokes', value: String(winnerRow.realScore), icon: '⛳' },
      { label: 'Game Points', value: formatScoreWithSign(winnerRow.gamePoints), icon: '✨' },
      { label: 'Adjusted Score', value: String(winnerRow.adjustedScore), icon: '📊' },
    ]

    statData.forEach((stat, index) => {
      const statX = panelX + 54 + index * (statWidth + 12)
      drawRoundedRect(context, statX, statY, statWidth, statHeight, 18)
      context.fillStyle = '#fcf9f2'
      context.fill()
      context.strokeStyle = '#b7ab9b'
      context.lineWidth = 2
      context.stroke()

      context.fillStyle = '#2b5a3f'
      context.font = '500 22px Figtree, Arial, sans-serif'
      context.textAlign = 'center'
      context.fillText(stat.icon, statX + statWidth / 2, statY + 34)

      context.fillStyle = '#1d422d'
      context.font = '700 34px Figtree, Arial, sans-serif'
      context.fillText(stat.value, statX + statWidth / 2, statY + 78)

      context.fillStyle = '#365f49'
      context.font = '600 18px Figtree, Arial, sans-serif'
      context.fillText(stat.label, statX + statWidth / 2, statY + 112)
      context.textAlign = 'left'
    })
  }

  const footerUrl = appUrl.length > 64 ? `${appUrl.slice(0, 61)}...` : appUrl
  context.fillStyle = '#3e6651'
  context.font = '600 20px Figtree, Arial, sans-serif'
  context.fillText(`Download: ${footerUrl}`, panelX + 54, panelY + panelHeight - 72)

  return canvas
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

export async function buildRoundRecapImageBlob(
  payload: RoundRecapPayload,
  appUrl: string,
): Promise<Blob | null> {
  const canvas = renderRoundRecapCanvas(payload, appUrl)
  if (!canvas) {
    return null
  }

  return canvasToPngBlob(canvas)
}

export function createRecapImageFile(blob: Blob): File | null {
  return createFileFromBlob(blob, RECAP_IMAGE_FILE_NAME, 'image/png')
}

export async function tryNativeShareRecap(options: NativeShareOptions): Promise<NativeShareResult> {
  return shareRecapViaNativeOrWeb(options)
}

export async function copyRecapTextToClipboard(text: string): Promise<boolean> {
  return copyTextToClipboard(text)
}

export function downloadRecapImage(blob: Blob): boolean {
  return downloadBlobAsFile(blob, RECAP_IMAGE_FILE_NAME)
}

export async function saveRecapImageToDevice(blob: Blob): Promise<boolean> {
  return saveBlobToDocuments(blob, `${Date.now()}-${RECAP_IMAGE_FILE_NAME}`)
}

export async function saveRoundStateSnapshotToDevice(roundState: RoundState): Promise<boolean> {
  const exportedAtIso = new Date().toISOString()
  const payload = JSON.stringify(
    {
      exportedAtIso,
      roundState,
    },
    null,
    2,
  )

  return saveTextToDocuments(payload, `${Date.now()}-${RECAP_JSON_FILE_NAME}`)
}
