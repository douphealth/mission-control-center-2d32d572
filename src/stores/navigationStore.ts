// Navigation & UI state — lightweight Zustand store
// Prevents full-app re-renders when navigating between sections

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationState {
  activeSection: string;
  setActiveSection: (section: string) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Recent sections for Command Palette
  recentSections: string[];
  pushRecent: (section: string) => void;

  // Command palette state
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Import modal state
  importModalOpen: boolean;
  setImportModalOpen: (open: boolean) => void;

  // URL navigator — injected by DashboardLayout
  _navigate: ((path: string) => void) | null;
  _setNavigate: (fn: (path: string) => void) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      activeSection: 'dashboard',
      setActiveSection: (section) => {
        set({ activeSection: section });
        get().pushRecent(section);
        // Navigate via injected router fn if available
        const nav = get()._navigate;
        if (nav) nav(`/${section}`);
      },

      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      recentSections: [],
      pushRecent: (section) => {
        const recent = get().recentSections.filter((s) => s !== section);
        recent.unshift(section);
        set({ recentSections: recent.slice(0, 8) });
      },

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      importModalOpen: false,
      setImportModalOpen: (open) => set({ importModalOpen: open }),

      _navigate: null,
      _setNavigate: (fn) => set({ _navigate: fn }),
    }),
    {
      name: 'mc-navigation-v1',
      partialize: (state) => ({
        recentSections: state.recentSections,
        sidebarCollapsed: state.sidebarCollapsed,
        activeSection: state.activeSection,
      }),
    }
  )
);
