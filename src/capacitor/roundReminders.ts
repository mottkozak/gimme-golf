import { LocalNotifications } from '@capacitor/local-notifications'
import type { RoundState } from '../types/game.ts'
import { isNative } from '../capacitor.ts'

const ACTIVE_ROUND_REMINDER_ID = 7101

interface SyncRoundReminderInput {
  enabled: boolean
  roundState: RoundState | null
}

function buildReminderBody(roundState: RoundState): string {
  const holeNumber = Math.min(
    Math.max(roundState.currentHoleIndex + 1, 1),
    Math.max(roundState.holes.length, 1),
  )
  const holeCount = roundState.config.holeCount
  return `You have an active round. Resume at Hole ${holeNumber} of ${holeCount}.`
}

function getNextReminderDate(): Date {
  const now = new Date()
  const nextReminderDate = new Date(now)
  nextReminderDate.setHours(10, 0, 0, 0)
  if (nextReminderDate.getTime() <= now.getTime()) {
    nextReminderDate.setDate(nextReminderDate.getDate() + 1)
  }
  return nextReminderDate
}

export async function clearRoundReminder(): Promise<void> {
  if (!isNative()) {
    return
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: ACTIVE_ROUND_REMINDER_ID }],
    })
  } catch {
    // Keep cancellations best effort.
  }
}

export async function syncRoundReminder({ enabled, roundState }: SyncRoundReminderInput): Promise<void> {
  if (!isNative()) {
    return
  }

  if (!enabled || !roundState) {
    await clearRoundReminder()
    return
  }

  try {
    const permissions = await LocalNotifications.checkPermissions()
    if (permissions.display !== 'granted') {
      const requestedPermissions = await LocalNotifications.requestPermissions()
      if (requestedPermissions.display !== 'granted') {
        await clearRoundReminder()
        return
      }
    }

    await LocalNotifications.cancel({
      notifications: [{ id: ACTIVE_ROUND_REMINDER_ID }],
    })

    await LocalNotifications.schedule({
      notifications: [
        {
          id: ACTIVE_ROUND_REMINDER_ID,
          title: 'Resume your Gimme Golf round',
          body: buildReminderBody(roundState),
          schedule: {
            at: getNextReminderDate(),
            allowWhileIdle: true,
          },
        },
      ],
    })
  } catch {
    // Keep reminders optional.
  }
}
