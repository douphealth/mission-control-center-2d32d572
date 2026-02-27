// Settings store — theme, user prefs, persisted in Dexie
// Separated from data stores to prevent re-renders

import { create } from 'zustand';
import { db } from '@/lib/db';
import type { UserSettings } from '@/lib/db';

interface SettingsState {
  userName: string;
  userRole: string;
  theme: 'light' | 'dark' | 'system';
  isLoading: boolean;

  // Actions
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  updateSettings: (changes: Partial<UserSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  userName: 'Alex',
  userRole: 'Digital Creator & Developer',
  theme: 'dark',
  isLoading: true,

  setTheme: (t) => {
    set({ theme: t });
    db.settings.update('default', { theme: t });
    applyTheme(t);
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  updateSettings: async (changes) => {
    await db.settings.update('default', changes);
    if (changes.userName) set({ userName: changes.userName });
    if (changes.userRole) set({ userRole: changes.userRole });
    if (changes.theme) {
      set({ theme: changes.theme });
      applyTheme(changes.theme);
    }
  },

  loadSettings: async () => {
    const settings = await db.settings.get('default');
    if (settings) {
      set({
        userName: settings.userName || 'Alex',
        userRole: settings.userRole || 'Digital Creator & Developer',
        theme: settings.theme || 'dark',
        isLoading: false,
      });
      applyTheme(settings.theme || 'dark');
    } else {
      set({ isLoading: false });
      applyTheme('dark');
    }
  },
}));

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}
