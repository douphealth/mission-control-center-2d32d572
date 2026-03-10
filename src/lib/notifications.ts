// ─── Notification Engine ─────────────────────────────────────────────────────
// Handles both browser push notifications and in-app toast reminders for tasks.

import { db } from '@/lib/db';
import type { Task } from '@/lib/db';
import { toast } from 'sonner';

const REMINDER_OFFSETS: Record<string, number> = {
  'at-time': 0,
  '5min': 5 * 60_000,
  '15min': 15 * 60_000,
  '30min': 30 * 60_000,
  '1hr': 60 * 60_000,
  '2hr': 2 * 60 * 60_000,
  '1day': 24 * 60 * 60_000,
};

const REMINDER_LABELS: Record<string, string> = {
  'none': 'No reminder',
  'at-time': 'At due time',
  '5min': '5 minutes before',
  '15min': '15 minutes before',
  '30min': '30 minutes before',
  '1hr': '1 hour before',
  '2hr': '2 hours before',
  '1day': '1 day before',
};

export { REMINDER_LABELS };

/** Get a human-readable label for any reminder key (including custom) */
export function getReminderLabel(key: string): string {
  if (REMINDER_LABELS[key]) return REMINDER_LABELS[key];
  if (key.startsWith('custom:')) {
    const mins = parseInt(key.split(':')[1], 10);
    if (isNaN(mins)) return key;
    if (mins < 60) return `${mins} minutes before`;
    if (mins === 60) return '1 hour before';
    if (mins < 1440) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m ? `${h}h ${m}m before` : `${h} hours before`;
    }
    const d = Math.floor(mins / 1440);
    const rem = mins % 1440;
    if (rem === 0) return `${d} day${d > 1 ? 's' : ''} before`;
    return `${d}d ${Math.floor(rem / 60)}h before`;
  }
  return key;
}

/** Get offset in ms for a reminder key */
function getOffsetMs(key: string): number {
  if (REMINDER_OFFSETS[key] !== undefined) return REMINDER_OFFSETS[key];
  if (key.startsWith('custom:')) {
    const mins = parseInt(key.split(':')[1], 10);
    if (!isNaN(mins)) return mins * 60_000;
  }
  return 0;
}

/** Request browser notification permission (call once on user action) */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Get the due datetime in ms */
function getDueMs(task: Task): number | null {
  if (!task.dueDate) return null;
  const dateStr = task.dueDate;
  const timeStr = task.allDay === false && task.startTime ? task.startTime : '09:00';
  const dueMs = new Date(`${dateStr}T${timeStr}`).getTime();
  return isNaN(dueMs) ? null : dueMs;
}

/** Fire a notification (browser + in-app toast) */
function fireNotification(task: Task, label: string) {
  const body = `${label} — ${task.title}`;

  toast.info(`🔔 Reminder: ${task.title}`, {
    description: label,
    duration: 10_000,
  });

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Mission Control Reminder', {
        body,
        icon: '/favicon.ico',
        tag: `task-${task.id}-${Date.now()}`,
      });
    } catch {
      // Fallback
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Start the notification checker loop (call once from a top-level component) */
export function startNotificationLoop() {
  if (intervalId) return;

  const check = async () => {
    try {
      const now = Date.now();
      const tasks = await db.tasks.toArray();

      for (const task of tasks) {
        if (task.status === 'done') continue;

        // ── New multi-reminder system ──
        const reminders = task.reminders;
        if (reminders && reminders.length > 0) {
          const dueMs = getDueMs(task);
          if (!dueMs) continue;

          const fired = new Set(task.remindersFired || []);
          let newFired = false;

          for (const key of reminders) {
            if (key === 'none' || fired.has(key)) continue;
            const offset = getOffsetMs(key);
            const triggerAt = dueMs - offset;

            if (now >= triggerAt) {
              fireNotification(task, getReminderLabel(key));
              fired.add(key);
              newFired = true;
            }
          }

          if (newFired) {
            await db.tasks.update(task.id, { remindersFired: Array.from(fired) });
          }
          continue;
        }

        // ── Legacy single-reminder fallback ──
        if (!task.reminder || task.reminder === 'none') continue;
        if (task.reminderFired) continue;

        const dueMs = getDueMs(task);
        if (!dueMs) continue;
        const offset = REMINDER_OFFSETS[task.reminder] ?? 0;
        const triggerAt = dueMs - offset;

        if (now >= triggerAt) {
          fireNotification(task, REMINDER_LABELS[task.reminder] || task.reminder);
          await db.tasks.update(task.id, { reminderFired: true });
        }
      }
    } catch (e) {
      console.error('Notification check error:', e);
    }
  };

  check();
  intervalId = setInterval(check, 30_000);
}

/** Stop the notification loop */
export function stopNotificationLoop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
