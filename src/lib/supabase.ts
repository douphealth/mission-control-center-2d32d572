// Full Supabase sync engine for Mission Control v8
// Handles: connection management, full two-way sync, real-time subscriptions

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { db } from './db';
import { deduplicateAll } from './dedup';

let supabaseClient: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let syncCallbacks: (() => void)[] = [];

const CLOUD_BASELINE_KEY = 'mc-cloud-baseline-ready';

function hasCloudBaseline(): boolean {
    try {
        return localStorage.getItem(CLOUD_BASELINE_KEY) === '1';
    } catch {
        return false;
    }
}

function markCloudBaselineReady(): void {
    try {
        localStorage.setItem(CLOUD_BASELINE_KEY, '1');
    } catch { }
}

function clearCloudBaseline(): void {
    try {
        localStorage.removeItem(CLOUD_BASELINE_KEY);
    } catch { }
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

// ─── Config management ─────────────────────────────────────────────────────────
    try {
        const url = localStorage.getItem('mc-supabase-url');
        const anonKey = localStorage.getItem('mc-supabase-anon-key');
        if (url && anonKey && url.startsWith('https://')) return { url, anonKey };
    } catch { }
    return null;
}

export function setSupabaseConfig(url: string, anonKey: string): void {
    localStorage.setItem('mc-supabase-url', url.trim());
    localStorage.setItem('mc-supabase-anon-key', anonKey.trim());
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
    }
    supabaseClient = null;
}

export function clearSupabaseConfig(): void {
    localStorage.removeItem('mc-supabase-url');
    localStorage.removeItem('mc-supabase-anon-key');
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
    }
    supabaseClient = null;
}

export function getSupabase(): SupabaseClient | null {
    if (supabaseClient) return supabaseClient;
    const config = getSupabaseConfig();
    if (!config) return null;
    try {
        supabaseClient = createClient(config.url, config.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
            },
            realtime: {
                params: { eventsPerSecond: 10 },
            },
        });
        return supabaseClient;
    } catch (e) {
        console.error('Failed to create Supabase client:', e);
        return null;
    }
}

export function isSupabaseConnected(): boolean {
    return getSupabaseConfig() !== null;
}

// ─── Connection test ───────────────────────────────────────────────────────────

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const client = createClient(url.trim(), anonKey.trim());
        const { error } = await client.from('mc_sync_log').select('id').limit(1);
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
            // PGRST116 = table doesn't exist yet — still means connection works
            throw error;
        }
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'Connection failed' };
    }
}

// ─── SQL schema for Supabase ──────────────────────────────────────────────────

export const SUPABASE_SCHEMA_SQL = `
-- Mission Control v8 Schema
-- Run this in your Supabase SQL editor to enable sync

CREATE TABLE IF NOT EXISTS mc_websites (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_tasks (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_repos (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_build_projects (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_links (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_notes (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_payments (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_ideas (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_credentials (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_custom_modules (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_habits (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_settings (data jsonb, id text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS mc_sync_log (id serial PRIMARY KEY, synced_at timestamptz DEFAULT now(), direction text, tables text[]);

-- Enable RLS (add your own policies as needed)
ALTER TABLE mc_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_build_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_custom_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (customize for production)
DROP POLICY IF EXISTS "allow_all_mc" ON mc_websites;
CREATE POLICY "allow_all_mc" ON mc_websites FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_tasks;
CREATE POLICY "allow_all_mc" ON mc_tasks FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_repos;
CREATE POLICY "allow_all_mc" ON mc_repos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_build_projects;
CREATE POLICY "allow_all_mc" ON mc_build_projects FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_links;
CREATE POLICY "allow_all_mc" ON mc_links FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_notes;
CREATE POLICY "allow_all_mc" ON mc_notes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_payments;
CREATE POLICY "allow_all_mc" ON mc_payments FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_ideas;
CREATE POLICY "allow_all_mc" ON mc_ideas FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_credentials;
CREATE POLICY "allow_all_mc" ON mc_credentials FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_custom_modules;
CREATE POLICY "allow_all_mc" ON mc_custom_modules FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_habits;
CREATE POLICY "allow_all_mc" ON mc_habits FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_settings;
CREATE POLICY "allow_all_mc" ON mc_settings FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_mc" ON mc_sync_log;
CREATE POLICY "allow_all_mc" ON mc_sync_log FOR ALL USING (true) WITH CHECK (true);
`;

// ─── Table map ─────────────────────────────────────────────────────────────────

const TABLE_MAP: Array<{ local: any; remote: string }> = [
    { local: db.websites, remote: 'mc_websites' },
    { local: db.tasks, remote: 'mc_tasks' },
    { local: db.repos, remote: 'mc_repos' },
    { local: db.buildProjects, remote: 'mc_build_projects' },
    { local: db.links, remote: 'mc_links' },
    { local: db.notes, remote: 'mc_notes' },
    { local: db.payments, remote: 'mc_payments' },
    { local: db.ideas, remote: 'mc_ideas' },
    { local: db.credentials, remote: 'mc_credentials' },
    { local: db.customModules, remote: 'mc_custom_modules' },
    { local: db.habits, remote: 'mc_habits' },
];

// ─── Preview: count what will happen ──────────────────────────────────────────

export interface SyncPreview {
    push: { table: string; count: number }[];
    pull: { table: string; newCount: number; updateCount: number }[];
    totalPush: number;
    totalPullNew: number;
    totalPullUpdate: number;
}

export async function getSyncPreview(): Promise<SyncPreview | null> {
    const client = getSupabase();
    if (!client) return null;

    const push: SyncPreview['push'] = [];
    const pull: SyncPreview['pull'] = [];

    for (const { local, remote } of TABLE_MAP) {
        const localItems = await local.toArray();
        push.push({ table: remote, count: localItems.length });

        const { data } = await client.from(remote).select('id, data');
        if (!data) { pull.push({ table: remote, newCount: 0, updateCount: 0 }); continue; }

        const localIds = new Set(localItems.map((i: any) => i.id));
        let newCount = 0;
        let updateCount = 0;
        for (const row of data) {
            if (localIds.has(row.id)) updateCount++;
            else newCount++;
        }
        pull.push({ table: remote, newCount, updateCount });
    }

    return {
        push,
        pull,
        totalPush: push.reduce((s, p) => s + p.count, 0),
        totalPullNew: pull.reduce((s, p) => s + p.newCount, 0),
        totalPullUpdate: pull.reduce((s, p) => s + p.updateCount, 0),
    };
}

// ─── Push local → Supabase (upsert, never deletes cloud data) ────────────────

export async function pushToSupabase(): Promise<{ success: boolean; synced: number; error?: string }> {
    const client = getSupabase();
    if (!client) return { success: false, synced: 0, error: 'Not connected' };

    let totalSynced = 0;
    const syncedTables: string[] = [];

    try {
        for (const { local, remote } of TABLE_MAP) {
            const items = await local.toArray();
            if (items.length === 0) continue;

            const rows = items.map((item: any) => ({ id: item.id, data: item }));
            const { error } = await client.from(remote).upsert(rows, { onConflict: 'id' });
            if (error) throw new Error(`${remote}: ${error.message}`);
            totalSynced += items.length;
            syncedTables.push(remote);
        }

        // Push settings
        const settings = await db.settings.get('default');
        if (settings) {
            const { error } = await client.from('mc_settings').upsert(
                [{ id: 'default', data: settings }],
                { onConflict: 'id' }
            );
            if (!error) syncedTables.push('mc_settings');
        }

        // Log sync
        await client.from('mc_sync_log').insert([{
            direction: 'push',
            tables: syncedTables,
        }]);

        syncCallbacks.forEach(cb => cb());
        return { success: true, synced: totalSynced };
    } catch (e: any) {
        return { success: false, synced: totalSynced, error: e?.message };
    }
}

// ─── Pull Supabase → local (SMART MERGE — never deletes local data) ──────────

export async function pullFromSupabase(): Promise<{ success: boolean; synced: number; added: number; updated: number; error?: string }> {
    const client = getSupabase();
    if (!client) return { success: false, synced: 0, added: 0, updated: 0, error: 'Not connected' };

    let totalAdded = 0;
    let totalUpdated = 0;

    try {
        for (const { local, remote } of TABLE_MAP) {
            const { data, error } = await client.from(remote).select('id, data');
            if (error) {
                if (error.code === '42P01') continue;
                throw new Error(`${remote}: ${error.message}`);
            }
            if (!data?.length) continue;

            // Get existing local IDs for smart merge
            const localItems = await local.toArray();
            const localMap = new Map(localItems.map((item: any) => [item.id, item]));

            for (const row of data) {
                const cloudItem = row.data;
                if (!cloudItem || !cloudItem.id) continue;

                const localItem = localMap.get(cloudItem.id);
                if (!localItem) {
                    // New from cloud — add without touching existing local data
                    await local.put(cloudItem);
                    totalAdded++;
                    continue;
                }

                // Update only when actual content changed (prevents endless re-renders)
                const localSerialized = JSON.stringify(localItem);
                const cloudSerialized = JSON.stringify(cloudItem);
                if (localSerialized !== cloudSerialized) {
                    await local.put(cloudItem);
                    totalUpdated++;
                }
            }
        }

        // Pull settings (merge, don't overwrite)
        const { data: settingsData } = await client.from('mc_settings').select('data').eq('id', 'default').single();
        if (settingsData?.data) {
            await db.settings.put({ ...settingsData.data, id: 'default' });
        }

        // Log sync
        await client.from('mc_sync_log').insert([{
            direction: 'pull',
            tables: TABLE_MAP.map(t => t.remote),
        }]);

        const removedDuplicates = await deduplicateAll();
        syncCallbacks.forEach(cb => cb());
        return { success: true, synced: totalAdded + totalUpdated + removedDuplicates, added: totalAdded, updated: totalUpdated };
    } catch (e: any) {
        return { success: false, synced: 0, added: 0, updated: 0, error: e?.message };
    }
}

// ─── Full two-way sync (merge both directions) ───────────────────────────────

export async function fullSync(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
    const pushResult = await pushToSupabase();
    if (!pushResult.success) return { success: false, pushed: 0, pulled: 0, error: `Push failed: ${pushResult.error}` };

    const pullResult = await pullFromSupabase();
    if (!pullResult.success) return { success: false, pushed: pushResult.synced, pulled: 0, error: `Pull failed: ${pullResult.error}` };

    return { success: true, pushed: pushResult.synced, pulled: pullResult.synced };
}

// ─── Real-time listeners ───────────────────────────────────────────────────────

export function startRealtimeSync(onRemoteChange?: () => void): boolean {
    const client = getSupabase();
    if (!client) return false;
    if (realtimeChannel) return true;

    const remoteTables = [...TABLE_MAP.map(t => t.remote), 'mc_settings'];
    let channel = client.channel('mission-control-realtime-sync');

    for (const table of remoteTables) {
        channel = channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            () => {
                onRemoteChange?.();
                syncCallbacks.forEach(cb => cb());
            }
        );
    }

    realtimeChannel = channel.subscribe();
    return true;
}

export function stopRealtimeSync(): void {
    if (!realtimeChannel) return;
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
}

// ─── Register callback for sync events ────────────────────────────────────────

export function onSyncComplete(callback: () => void) {
    syncCallbacks.push(callback);
    return () => { syncCallbacks = syncCallbacks.filter(cb => cb !== callback); };
}

// ─── Legacy: sync helpers (backward compat) ────────────────────────────────────

export async function syncToSupabase(table: string, data: any[]): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
        const { error } = await client.from(table).upsert(data, { onConflict: 'id' });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`Sync to ${table} failed:`, e);
        return false;
    }
}

export async function syncFromSupabase(table: string): Promise<any[] | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
        const { data, error } = await client.from(table).select('*');
        if (error) throw error;
        return data;
    } catch (e) {
        console.error(`Sync from ${table} failed:`, e);
        return null;
    }
}

// ─── Format last sync time ─────────────────────────────────────────────────────

export async function getLastSyncTime(): Promise<string | null> {
    const client = getSupabase();
    if (!client) return null;
    try {
        const { data } = await client
            .from('mc_sync_log')
            .select('synced_at')
            .order('synced_at', { ascending: false })
            .limit(1)
            .single();
        return data?.synced_at || null;
    } catch {
        return null;
    }
}
