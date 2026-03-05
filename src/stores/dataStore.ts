// ─── Domain Data Store ─────────────────────────────────────────────────────────
// Replaces the monolithic DashboardContext's data state with a Zustand store.
// Each domain's data is fetched via Dexie live queries; CRUD ops are grouped
// into domain-specific actions for fine-grained re-render control.

import { create } from 'zustand';
import { db, genId } from '@/lib/db';
import type {
    Website, Task, GitHubRepo, BuildProject, LinkItem, Note,
    Payment, Idea, CredentialVault, CustomModule, HabitTracker,
    UserSettings, WidgetLayout,
} from '@/lib/db';
import { isSupabaseConnected, pushToSupabase } from '@/lib/supabase';
import { isDuplicate, deduplicateItems } from '@/lib/dedup';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface DataState {
    // ─── Loading ──────────────────────────────────────────────────────────────
    isLoading: boolean;
    setIsLoading: (v: boolean) => void;

    // ─── Dashboard layout ──────────────────────────────────────────────────────
    dashboardLayout: WidgetLayout[];
    setDashboardLayout: (layout: WidgetLayout[]) => void;
    saveDashboardLayout: (layout: WidgetLayout[]) => Promise<void>;

    // ─── Generic CRUD ──────────────────────────────────────────────────────────
    addItem: <T extends { id: string }>(table: string, item: Omit<T, 'id'>) => Promise<string>;
    updateItem: <T extends { id: string }>(table: string, id: string, changes: Partial<T>) => Promise<void>;
    deleteItem: (table: string, id: string) => Promise<void>;
    bulkAddItems: <T extends { id: string }>(table: string, items: Omit<T, 'id'>[]) => Promise<void>;

    // ─── Settings ─────────────────────────────────────────────────────────────
    updateSettings: (changes: Partial<UserSettings>) => Promise<void>;

    // ─── Export/Import ────────────────────────────────────────────────────────
    exportAllData: () => Promise<string>;
    importAllData: (json: string) => Promise<void>;

    // ─── Backward compat ──────────────────────────────────────────────────────
    updateData: (partial: Record<string, any>) => Promise<void>;

    // ─── Push debounce ────────────────────────────────────────────────────────
    _schedulePush: () => void;
}

// ─── Table resolver ─────────────────────────────────────────────────────────────

function getTable(tableName: string) {
    const tables: Record<string, any> = {
        websites: db.websites,
        tasks: db.tasks,
        repos: db.repos,
        buildProjects: db.buildProjects,
        links: db.links,
        notes: db.notes,
        payments: db.payments,
        ideas: db.ideas,
        credentials: db.credentials,
        customModules: db.customModules,
        habits: db.habits,
    };
    return tables[tableName];
}

// ─── Supabase push debounce ─────────────────────────────────────────────────────

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush() {
    if (!isSupabaseConnected()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
        pushToSupabase().then(r => {
            if (r.success) console.log(`☁️ Auto-pushed ${r.synced} items`);
            else console.warn('☁️ Auto-push failed:', r.error);
        });
    }, 2000);
}

// ─── Store ───────────────────────────────────────────────────────────────────────

export const useDataStore = create<DataState>((set, _get) => ({
    isLoading: true,
    setIsLoading: (v) => set({ isLoading: v }),

    dashboardLayout: [],
    setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
    saveDashboardLayout: async (layout) => {
        await db.settings.update('default', { dashboardLayout: layout });
        set({ dashboardLayout: layout });
    },

    // ─── Generic CRUD ──────────────────────────────────────────────────────────
    addItem: async <T extends { id: string }>(table: string, item: Omit<T, 'id'>): Promise<string> => {
        const id = genId();
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        // ─── Duplicate check ───────────────────────────────────────────────
        if (await isDuplicate(table, item)) {
            console.warn(`⚠️ Duplicate detected in "${table}", skipping:`, item);
            return '';
        }
        await tableRef.put({ ...item, id });
        schedulePush();
        return id;
    },

    updateItem: async <T extends { id: string }>(table: string, id: string, changes: Partial<T>): Promise<void> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        await tableRef.update(id, changes);
        schedulePush();
    },

    deleteItem: async (table: string, id: string): Promise<void> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        await tableRef.delete(id);
        schedulePush();
    },

    bulkAddItems: async <T extends { id: string }>(table: string, items: Omit<T, 'id'>[]): Promise<void> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        // ─── Deduplicate before inserting ───────────────────────────────────
        const unique = await deduplicateItems(table, items);
        if (unique.length === 0) {
            console.warn(`⚠️ All ${items.length} items in "${table}" are duplicates, skipping bulk add`);
            return;
        }
        if (unique.length < items.length) {
            console.log(`🧹 Dedup: filtered out ${items.length - unique.length} duplicate(s) from "${table}" bulk add`);
        }
        const withIds = unique.map(item => ({ ...item, id: genId() }));
        await tableRef.bulkPut(withIds);
        schedulePush();
    },

    // ─── Settings ─────────────────────────────────────────────────────────────
    updateSettings: async (changes) => {
        await db.settings.update('default', changes);
        // Sync individual Zustand stores
        const { useSettingsStore } = await import('@/stores/settingsStore');
        if (changes.userName || changes.userRole || changes.theme) {
            await useSettingsStore.getState().updateSettings(changes);
        }
        const { useNavigationStore } = await import('@/stores/navigationStore');
        if (changes.sidebarCollapsed !== undefined) {
            useNavigationStore.getState().setSidebarCollapsed(changes.sidebarCollapsed);
        }
    },

    // ─── Export ────────────────────────────────────────────────────────────────
    exportAllData: async (): Promise<string> => {
        const data = {
            websites: await db.websites.toArray(),
            tasks: await db.tasks.toArray(),
            repos: await db.repos.toArray(),
            buildProjects: await db.buildProjects.toArray(),
            links: await db.links.toArray(),
            notes: await db.notes.toArray(),
            payments: await db.payments.toArray(),
            ideas: await db.ideas.toArray(),
            credentials: await db.credentials.toArray(),
            customModules: await db.customModules.toArray(),
            habits: await db.habits.toArray(),
            settings: await db.settings.get('default'),
            exportedAt: new Date().toISOString(),
            version: '9.0',
        };
        return JSON.stringify(data, null, 2);
    },

    // ─── Import ────────────────────────────────────────────────────────────────
    importAllData: async (json: string): Promise<void> => {
        const data = JSON.parse(json);
        const tableMap: Record<string, any> = {
            websites: db.websites,
            tasks: db.tasks,
            repos: db.repos,
            buildProjects: db.buildProjects,
            links: db.links,
            notes: db.notes,
            payments: db.payments,
            ideas: db.ideas,
            credentials: db.credentials,
            customModules: db.customModules,
            habits: db.habits,
        };
        for (const [key, table] of Object.entries(tableMap)) {
            if (data[key]) {
                await table.clear();
                await table.bulkPut(data[key]);
            }
        }
        if (data.settings) await db.settings.put({ ...data.settings, id: 'default' });
        // Reload settings
        const { useSettingsStore } = await import('@/stores/settingsStore');
        await useSettingsStore.getState().loadSettings();
    },

    // ─── Backward compat ──────────────────────────────────────────────────────
    updateData: async (partial: Record<string, any>): Promise<void> => {
        const tableMap: Record<string, any> = {
            websites: db.websites,
            tasks: db.tasks,
            repos: db.repos,
            buildProjects: db.buildProjects,
            links: db.links,
            notes: db.notes,
            payments: db.payments,
            ideas: db.ideas,
            credentials: db.credentials,
            customModules: db.customModules,
            habits: db.habits,
        };
        for (const [key, value] of Object.entries(partial)) {
            if (key === 'userName' || key === 'userRole') {
                await db.settings.update('default', { [key]: value });
                const { useSettingsStore } = await import('@/stores/settingsStore');
                await useSettingsStore.getState().updateSettings({ [key]: value } as any);
            } else if (tableMap[key] && Array.isArray(value)) {
                await tableMap[key].clear();
                if (value.length > 0) await tableMap[key].bulkPut(value);
            }
        }
        schedulePush();
    },

    _schedulePush: schedulePush,
}));
