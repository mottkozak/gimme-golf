import { buildLeaderboardEntries } from './leaderboard.ts'
import { formatPlayerNames } from './playerNames.ts'
import type { GameMode, RoundState } from '../types/game.ts'

export interface RoundRecapLeaderboardRow {
  rank: number
  playerName: string
  adjustedScore: number
  gamePoints: number
}

export interface RoundRecapPayload {
  winnerNames: string
  topLeaderboardRows: RoundRecapLeaderboardRow[]
  holeCount: number
  gameModeLabel: string
}

export type NativeShareResult = 'shared' | 'unsupported' | 'cancelled'

interface NativeShareOptions {
  title: string
  text: string
  url: string
  imageFile: File | null
}

const RECAP_IMAGE_FILE_NAME = 'gimme-golf-round-recap.png'

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

export function buildRoundRecapPayload(roundState: RoundState): RoundRecapPayload {
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

  const winningAdjustedScore = leaderboardRows[0]?.adjustedScore
  const winnerNames =
    typeof winningAdjustedScore === 'number'
      ? formatPlayerNames(
          leaderboardRows
            .filter((row) => row.adjustedScore === winningAdjustedScore)
            .map((row) => row.playerName),
        )
      : '-'

  return {
    winnerNames,
    topLeaderboardRows: leaderboardRows.slice(0, 3).map((row, index) => ({
      rank: index + 1,
      playerName: row.playerName,
      adjustedScore: row.adjustedScore,
      gamePoints: row.gamePoints,
    })),
    holeCount: roundState.holes.length > 0 ? roundState.holes.length : roundState.config.holeCount,
    gameModeLabel: formatGameModeLabel(roundState.config.gameMode),
  }
}

export function formatRoundRecapText(payload: RoundRecapPayload, appUrl: string): string {
  const recapRows =
    payload.topLeaderboardRows.length > 0
      ? payload.topLeaderboardRows.map(
          (row) =>
            `${row.rank}. ${row.playerName} - Adjusted ${row.adjustedScore} | Points ${formatScoreWithSign(row.gamePoints)}`,
        )
      : ['No leaderboard rows available.']

  return [
    'Gimme Golf Round Recap',
    `Winner: ${payload.winnerNames}`,
    `Mode: ${payload.gameModeLabel} | Holes: ${payload.holeCount}`,
    'Top 3 Leaders:',
    ...recapRows,
    `Play the app: ${appUrl}`,
  ].join('\n')
}

export function renderRoundRecapCanvas(
  payload: RoundRecapPayload,
  appUrl: string,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  const backgroundGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  backgroundGradient.addColorStop(0, '#0f2719')
  backgroundGradient.addColorStop(1, '#1f4d34')
  context.fillStyle = backgroundGradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const panelPadding = 64
  const panelX = panelPadding
  const panelY = panelPadding
  const panelWidth = canvas.width - panelPadding * 2
  const panelHeight = canvas.height - panelPadding * 2

  drawRoundedRect(context, panelX, panelY, panelWidth, panelHeight, 36)
  context.fillStyle = 'rgba(246, 250, 247, 0.94)'
  context.fill()

  context.fillStyle = '#1a3b28'
  context.font = '700 54px Inter, Arial, sans-serif'
  context.fillText('Gimme Golf Round Recap', panelX + 54, panelY + 102)

  context.font = '600 34px Inter, Arial, sans-serif'
  context.fillStyle = '#234832'
  const winnerText = `Winner: ${payload.winnerNames}`
  const winnerBottomY = drawWrappedText(
    context,
    winnerText,
    panelX + 54,
    panelY + 166,
    panelWidth - 108,
    44,
    2,
  )

  context.font = '500 28px Inter, Arial, sans-serif'
  context.fillStyle = '#2b5a3f'
  context.fillText(
    `${payload.gameModeLabel} mode · ${payload.holeCount} holes`,
    panelX + 54,
    winnerBottomY + 16,
  )

  const rowStartY = winnerBottomY + 72
  const rowHeight = 114
  const rowsToDraw = payload.topLeaderboardRows.length > 0 ? payload.topLeaderboardRows : []

  context.font = '700 30px Inter, Arial, sans-serif'
  context.fillStyle = '#1a3b28'
  context.fillText('Top 3', panelX + 54, rowStartY - 18)

  rowsToDraw.forEach((row, index) => {
    const rowY = rowStartY + index * (rowHeight + 16)

    drawRoundedRect(context, panelX + 42, rowY, panelWidth - 84, rowHeight, 20)
    context.fillStyle = 'rgba(28, 70, 47, 0.1)'
    context.fill()

    context.fillStyle = '#1f4730'
    context.font = '700 30px Inter, Arial, sans-serif'
    context.fillText(`#${row.rank}`, panelX + 72, rowY + 66)

    context.font = '700 32px Inter, Arial, sans-serif'
    context.fillText(row.playerName, panelX + 168, rowY + 54)

    context.font = '500 26px Inter, Arial, sans-serif'
    context.fillStyle = '#2b5a3f'
    context.fillText(`Adjusted: ${row.adjustedScore}`, panelX + 168, rowY + 90)
    context.fillText(
      `Points: ${formatScoreWithSign(row.gamePoints)}`,
      panelX + panelWidth - 360,
      rowY + 90,
    )
  })

  const footerUrl = appUrl.length > 64 ? `${appUrl.slice(0, 61)}...` : appUrl
  context.fillStyle = '#2b5a3f'
  context.font = '500 24px Inter, Arial, sans-serif'
  context.fillText(`Play: ${footerUrl}`, panelX + 54, panelY + panelHeight - 58)

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
  if (typeof File === 'undefined') {
    return null
  }

  return new File([blob], RECAP_IMAGE_FILE_NAME, { type: 'image/png' })
}

export async function tryNativeShareRecap(options: NativeShareOptions): Promise<NativeShareResult> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported'
  }

  const shareData: ShareData = {
    title: options.title,
    text: options.text,
    url: options.url,
  }

  try {
    if (
      options.imageFile &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [options.imageFile] })
    ) {
      await navigator.share({
        ...shareData,
        files: [options.imageFile],
      })
      return 'shared'
    }

    await navigator.share(shareData)
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled'
    }
    return 'unsupported'
  }
}

export async function copyRecapTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
    return false
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadRecapImage(blob: Blob): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return false
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = RECAP_IMAGE_FILE_NAME
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)

  return true
}
