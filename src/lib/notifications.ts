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

/** Request browser notification permission (call once on user action) */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Get the exact trigger time for a task's reminder */
function getReminderTime(task: Task): number | null {
  if (!task.reminder || task.reminder === 'none' || !task.dueDate) return null;

  const offset = REMINDER_OFFSETS[task.reminder] ?? 0;

  // Build the due datetime
  const dateStr = task.dueDate; // YYYY-MM-DD
  const timeStr = task.allDay === false && task.startTime ? task.startTime : '09:00';
  const dueMs = new Date(`${dateStr}T${timeStr}`).getTime();
  if (isNaN(dueMs)) return null;

  return dueMs - offset;
}

/** Fire a notification (browser + in-app toast) */
function fireNotification(task: Task) {
  const label = REMINDER_LABELS[task.reminder || 'at-time'];
  const body = `${label} — ${task.title}`;

  // In-app toast
  toast.info(`🔔 Reminder: ${task.title}`, {
    description: label,
    duration: 10_000,
  });

  // Browser push notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Mission Control Reminder', {
        body,
        icon: '/favicon.ico',
        tag: `task-${task.id}`,
      });
    } catch {
      // Fallback: some browsers block Notification constructor
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
        if (!task.reminder || task.reminder === 'none') continue;
        if (task.reminderFired) continue;

        const triggerAt = getReminderTime(task);
        if (triggerAt === null) continue;

        if (now >= triggerAt) {
          fireNotification(task);
          // Mark as fired so we don't re-fire
          await db.tasks.update(task.id, { reminderFired: true });
        }
      }
    } catch (e) {
      console.error('Notification check error:', e);
    }
  };

  // Check every 30 seconds
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
