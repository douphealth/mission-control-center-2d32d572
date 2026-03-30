/**
 * Recurring task expansion — generates date instances for recurring tasks.
 * Used by both CalendarPage (visual) and GCal sync (push).
 */

import type { Task } from '@/lib/db';

export interface RecurrenceInstance {
  date: string;        // YYYY-MM-DD
  occurrenceIndex: number;
}

/**
 * Generate all occurrences of a recurring task within a date range.
 * Returns an array of dates (YYYY-MM-DD) when the task should appear.
 */
export function expandRecurringTask(
  task: Task,
  rangeStart: string, // YYYY-MM-DD
  rangeEnd: string,   // YYYY-MM-DD
  maxOccurrences = 365,
): RecurrenceInstance[] {
  if (!task.recurring || !task.recurringInterval || !task.dueDate) return [];

  const instances: RecurrenceInstance[] = [];
  const rStart = new Date(rangeStart + 'T00:00:00');
  const rEnd = new Date(rangeEnd + 'T00:00:00');
  const baseDate = new Date((task.startDate || task.dueDate) + 'T00:00:00');

  // End conditions
  const endByDate = task.recurringEndType === 'date' && task.recurringEndDate
    ? new Date(task.recurringEndDate + 'T00:00:00')
    : null;
  const endByCount = task.recurringEndType === 'count' && task.recurringEndCount
    ? task.recurringEndCount
    : null;

  let count = 0;
  let current = new Date(baseDate);

  // Safety: don't loop forever
  const hardLimit = Math.min(maxOccurrences, 1000);

  while (count < hardLimit) {
    const dateStr = fmtDate(current);
    const d = new Date(current);

    // Check end conditions
    if (endByDate && d > endByDate) break;
    if (endByCount && count >= endByCount) break;
    if (d > rEnd) break;

    // Weekday filter for 'weekdays' interval
    const isWeekday = d.getDay() >= 1 && d.getDay() <= 5;

    if (d >= rStart) {
      if (task.recurringInterval === 'weekdays') {
        if (isWeekday) {
          instances.push({ date: dateStr, occurrenceIndex: count });
        }
      } else {
        instances.push({ date: dateStr, occurrenceIndex: count });
      }
    }

    count++;

    // Advance to next occurrence
    switch (task.recurringInterval) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekdays':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
      case 'custom':
        current.setDate(current.getDate() + (task.recurringCustomDays || 1));
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }

  return instances;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convert a recurring interval to an RFC 5545 RRULE string for Google Calendar.
 */
export function toRRule(task: Task): string | null {
  if (!task.recurring || !task.recurringInterval) return null;

  let freq: string;
  let interval = 1;

  switch (task.recurringInterval) {
    case 'daily': freq = 'DAILY'; break;
    case 'weekdays': freq = 'WEEKLY'; return `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR${rruleEnd(task)}`;
    case 'weekly': freq = 'WEEKLY'; break;
    case 'biweekly': freq = 'WEEKLY'; interval = 2; break;
    case 'monthly': freq = 'MONTHLY'; break;
    case 'yearly': freq = 'YEARLY'; break;
    case 'custom': freq = 'DAILY'; interval = task.recurringCustomDays || 1; break;
    default: return null;
  }

  const parts = [`RRULE:FREQ=${freq}`];
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  parts.push(rruleEnd(task).replace(/^;/, ''));

  return parts.filter(Boolean).join(';');
}

function rruleEnd(task: Task): string {
  if (task.recurringEndType === 'date' && task.recurringEndDate) {
    const d = task.recurringEndDate.replace(/-/g, '');
    return `;UNTIL=${d}T235959Z`;
  }
  if (task.recurringEndType === 'count' && task.recurringEndCount) {
    return `;COUNT=${task.recurringEndCount}`;
  }
  return '';
}
