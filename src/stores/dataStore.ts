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
    duplicateItem: (table: string, id: string, overrides?: Record<string, any>) => Promise<string>;
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
let saveStatusCallbacks: ((status: 'saving' | 'saved' | 'error') => void)[] = [];

export function onSaveStatus(cb: (status: 'saving' | 'saved' | 'error') => void) {
    saveStatusCallbacks.push(cb);
    return () => { saveStatusCallbacks = saveStatusCallbacks.filter(c => c !== cb); };
}

function notifySaveStatus(status: 'saving' | 'saved' | 'error') {
    saveStatusCallbacks.forEach(cb => cb(status));
}

function schedulePush() {
    // Always mark local save as done immediately (IndexedDB write already happened)
    notifySaveStatus('saving');
    if (!isSupabaseConnected()) {
        // No cloud — still "saved" locally
        notifySaveStatus('saved');
        return;
    }
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
        pushToSupabase().then(r => {
            if (r.success) {
                console.log(`☁️ Auto-pushed ${r.synced} items`);
                notifySaveStatus('saved');
            } else {
                console.warn('☁️ Auto-push failed:', r.error);
                notifySaveStatus('error');
                // Retry once after 5s
                setTimeout(() => {
                    pushToSupabase().then(r2 => {
                        notifySaveStatus(r2.success ? 'saved' : 'error');
                    });
                }, 5000);
            }
        });
    }, 1000); // Reduced from 2s to 1s for faster cross-device sync
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

    duplicateItem: async (table: string, id: string, overrides: Record<string, any> = {}): Promise<string> => {
        const tableRef = getTable(table);
        if (!tableRef) throw new Error(`Unknown table: ${table}`);
        const original = await tableRef.get(id);
        if (!original) throw new Error(`Item not found: ${id}`);
        const newId = genId();
        const { id: _oldId, ...rest } = original;
        const now = new Date().toISOString().split('T')[0];
        const clone = { ...rest, id: newId, ...overrides };
        // Add " (Copy)" to name/title/label fields
        if (clone.title && !overrides.title) clone.title = `${clone.title} (Copy)`;
        else if (clone.name && !overrides.name) clone.name = `${clone.name} (Copy)`;
        else if (clone.label && !overrides.label) clone.label = `${clone.label} (Copy)`;
        // Reset dates
        if (clone.createdAt && !overrides.createdAt) clone.createdAt = now;
        if (clone.dateAdded && !overrides.dateAdded) clone.dateAdded = now;
        if (clone.lastUpdated && !overrides.lastUpdated) clone.lastUpdated = now;
        if (clone.updatedAt && !overrides.updatedAt) clone.updatedAt = now;
        await tableRef.put(clone);
        schedulePush();
        return newId;
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
        schedulePush();
    },

    // ─── Export ────────────────────────────────────────────────────────────────
    exportAllData: async (): Promise<string> => {
        const [websites, tasks, repos, buildProjects, links, notes, payments, ideas, credentials, customModules, habits, settings] = await Promise.all([
            db.websites.toArray(),
            db.tasks.toArray(),
            db.repos.toArray(),
            db.buildProjects.toArray(),
            db.links.toArray(),
            db.notes.toArray(),
            db.payments.toArray(),
            db.ideas.toArray(),
            db.credentials.toArray(),
            db.customModules.toArray(),
            db.habits.toArray(),
            db.settings.get('default'),
        ]);
        const data = {
            websites, tasks, repos, buildProjects, links, notes, payments, ideas,
            credentials, customModules, habits, settings,
            _meta: {
                exportedAt: new Date().toISOString(),
                version: '9.1',
                counts: {
                    websites: websites.length, tasks: tasks.length, repos: repos.length,
                    buildProjects: buildProjects.length, links: links.length, notes: notes.length,
                    payments: payments.length, ideas: ideas.length, credentials: credentials.length,
                    customModules: customModules.length, habits: habits.length,
                },
                totalItems: websites.length + tasks.length + repos.length + buildProjects.length +
                    links.length + notes.length + payments.length + ideas.length +
                    credentials.length + customModules.length + habits.length,
            },
            // Legacy compat fields
            exportedAt: new Date().toISOString(),
            version: '9.1',
        };
        return JSON.stringify(data, null, 2);
    },

    // ─── Import ────────────────────────────────────────────────────────────────
    importAllData: async (json: string): Promise<void> => {
        const data = JSON.parse(json);
        // Validate it's a Mission Control backup
        if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
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
        // Use a transaction for atomicity
        await db.transaction('rw', Object.values(tableMap), async () => {
            for (const [key, table] of Object.entries(tableMap)) {
                if (data[key] && Array.isArray(data[key])) {
                    await table.clear();
                    if (data[key].length > 0) await table.bulkPut(data[key]);
                }
            }
        });
        if (data.settings) await db.settings.put({ ...data.settings, id: 'default' });
        // Reload settings
        const { useSettingsStore } = await import('@/stores/settingsStore');
        await useSettingsStore.getState().loadSettings();
        schedulePush();
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
