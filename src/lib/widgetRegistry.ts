export interface WidgetDefinition {
  id: string;
  type: string;
  title: string;
  icon: string;
  category: 'overview' | 'productivity' | 'business' | 'platforms' | 'personal' | 'custom';
  defaultLayout: { w: number; h: number; minW?: number; minH?: number };
  description: string;
}

export const widgetDefinitions: WidgetDefinition[] = [
  // Overview
  { id: 'stats', type: 'stats', title: 'Overview Stats', icon: '📊', category: 'overview', defaultLayout: { w: 12, h: 4, minW: 8, minH: 3 }, description: 'Key metrics at a glance' },
  { id: 'activity', type: 'activity', title: 'Project Analytics', icon: '📈', category: 'overview', defaultLayout: { w: 7, h: 6, minW: 4, minH: 4 }, description: 'Weekly activity chart' },
  { id: 'quote', type: 'quote', title: 'Time Tracker', icon: '⏱️', category: 'overview', defaultLayout: { w: 5, h: 6, minW: 3, minH: 4 }, description: 'Timer & daily inspiration' },

  // Productivity
  { id: 'tasks-focus', type: 'tasks-focus', title: "Today's Focus", icon: '⚡', category: 'productivity', defaultLayout: { w: 5, h: 7, minW: 4, minH: 5 }, description: 'Priority tasks for today' },
  { id: 'deadlines', type: 'deadlines', title: 'Reminders', icon: '📅', category: 'productivity', defaultLayout: { w: 4, h: 7, minW: 3, minH: 5 }, description: 'Approaching due dates' },
  { id: 'habits', type: 'habits', title: 'Habit Tracker', icon: '🔥', category: 'productivity', defaultLayout: { w: 3, h: 7, minW: 3, minH: 5 }, description: 'Daily habits & streaks' },
  { id: 'calendar-mini', type: 'calendar-mini', title: 'Calendar', icon: '📆', category: 'productivity', defaultLayout: { w: 4, h: 5, minW: 3, minH: 4 }, description: 'Mini calendar view' },

  // Business
  { id: 'finance', type: 'finance', title: 'Finance Overview', icon: '💰', category: 'business', defaultLayout: { w: 5, h: 6, minW: 4, minH: 5 }, description: 'Income, expenses & profit' },
  { id: 'ideas', type: 'ideas', title: 'Project Progress', icon: '🎯', category: 'business', defaultLayout: { w: 4, h: 6, minW: 3, minH: 5 }, description: 'Progress ring & top ideas' },
  { id: 'notes-preview', type: 'notes-preview', title: 'Pinned Notes', icon: '📝', category: 'business', defaultLayout: { w: 3, h: 6, minW: 3, minH: 4 }, description: 'Quick note access' },

  // Platforms
  { id: 'platforms', type: 'platforms', title: 'Team & Collaboration', icon: '👥', category: 'platforms', defaultLayout: { w: 5, h: 5, minW: 4, minH: 4 }, description: 'Team activity & status' },
  { id: 'quick-links', type: 'quick-links', title: 'Projects', icon: '🚀', category: 'platforms', defaultLayout: { w: 4, h: 5, minW: 3, minH: 4 }, description: 'Build projects overview' },
  { id: 'websites-summary', type: 'websites-summary', title: 'Websites', icon: '🌐', category: 'platforms', defaultLayout: { w: 3, h: 5, minW: 3, minH: 4 }, description: 'Website status tracker' },
];

export function getDefaultLayouts(cols: number = 12): Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }> {
  // Hand-crafted optimal layout for beautiful tiling
  const hand: Record<string, { x: number; y: number; w: number; h: number }> = {
    'stats': { x: 0, y: 0, w: 12, h: 4 },
    'activity': { x: 0, y: 4, w: 7, h: 6 },
    'quote': { x: 7, y: 4, w: 5, h: 6 },
    'tasks-focus': { x: 0, y: 10, w: 5, h: 7 },
    'deadlines': { x: 5, y: 10, w: 4, h: 7 },
    'habits': { x: 9, y: 10, w: 3, h: 7 },
    'finance': { x: 0, y: 17, w: 5, h: 6 },
    'ideas': { x: 5, y: 17, w: 4, h: 6 },
    'notes-preview': { x: 9, y: 17, w: 3, h: 6 },
    'platforms': { x: 0, y: 23, w: 5, h: 5 },
    'quick-links': { x: 5, y: 23, w: 4, h: 5 },
    'websites-summary': { x: 9, y: 23, w: 3, h: 5 },
    'calendar-mini': { x: 8, y: 4, w: 4, h: 5 },
  };

  return widgetDefinitions.map(def => {
    const h = hand[def.id];
    if (h) {
      const w = Math.min(h.w, cols);
      const x = Math.min(h.x, cols - w);
      return { i: def.id, x, y: h.y, w, h: h.h, minW: def.defaultLayout.minW, minH: def.defaultLayout.minH };
    }
    return { i: def.id, x: 0, y: 999, w: Math.min(def.defaultLayout.w, cols), h: def.defaultLayout.h, minW: def.defaultLayout.minW, minH: def.defaultLayout.minH };
  });
}

const LAYOUT_KEY = 'mc-grid-layout-v9';
const VISIBILITY_KEY = 'mc-widget-visibility-v9';

export function loadSavedLayout() {
  try { const raw = localStorage.getItem(LAYOUT_KEY); if (raw) return JSON.parse(raw); } catch { }
  return null;
}
export function saveLayout(layouts: any) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layouts)); } catch { }
}
export function loadWidgetVisibility(): Record<string, boolean> {
  try { const raw = localStorage.getItem(VISIBILITY_KEY); if (raw) return JSON.parse(raw); } catch { }
  const defaults: Record<string, boolean> = {};
  widgetDefinitions.forEach(w => { defaults[w.id] = true; });
  return defaults;
}
export function saveWidgetVisibility(visibility: Record<string, boolean>) {
  try { localStorage.setItem(VISIBILITY_KEY, JSON.stringify(visibility)); } catch { }
}
