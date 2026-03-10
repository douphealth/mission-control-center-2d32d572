/**
 * React hook for Google Calendar integration.
 * Provides reactive state, auto-sync, and easy connect/disconnect.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getGCalConfig,
    setGCalConfig,
    isGCalConnected,
    signInWithGoogle,
    signOutGoogle,
    listCalendars,
    syncGCalEvents,
    gCalEventToCalEvent,
    loadGisScript,
    pushTasksToGCal,
    taskIdToGCalId,
    type GoogleCalendarList,
    type GoogleCalendarEvent,
    type GCalConfig,
} from '@/lib/googleCalendar';
import { db, type Task } from '@/lib/db';
import { useDataStore } from '@/stores/dataStore';

export interface GCalSyncState {
    connected: boolean;
    connecting: boolean;
    syncing: boolean;
    email: string | null;
    clientId: string;
    calendars: GoogleCalendarList[];
    enabledCalendarIds: string[];
    events: ReturnType<typeof gCalEventToCalEvent>[];
    rawEvents: GoogleCalendarEvent[];
    lastSync: string | null;
    autoSync: boolean;
    error: string | null;
}

export function useGoogleCalendar(opts?: {
    autoFetch?: boolean;
    timeMin?: string;
    timeMax?: string;
}) {
    const autoFetch = opts?.autoFetch ?? true;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const syncLockRef = useRef(false);
    const storeUpdateItem = useDataStore(s => s.updateItem);

    const [state, setState] = useState<GCalSyncState>(() => {
        const cfg = getGCalConfig();
        return {
            connected: isGCalConnected(),
            connecting: false,
            syncing: false,
            email: cfg.connectedEmail,
            clientId: cfg.clientId,
            calendars: [],
            enabledCalendarIds: cfg.enabledCalendarIds,
            events: [],
            rawEvents: [],
            lastSync: cfg.lastSync,
            autoSync: cfg.autoSync,
            error: null,
        };
    });

    // Compute time range (default: ±60 days)
    const getTimeRange = useCallback(() => {
        const now = new Date();
        const min = opts?.timeMin || new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
        const max = opts?.timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
        return { min, max };
    }, [opts?.timeMin, opts?.timeMax]);

    // Fetch calendars list
    const fetchCalendars = useCallback(async () => {
        if (!isGCalConnected()) return;
        try {
            const cals = await listCalendars();
            setState(s => ({ ...s, calendars: cals }));

            // Auto-enable primary calendar if none enabled
            const cfg = getGCalConfig();
            if (cfg.enabledCalendarIds.length === 0) {
                const primaryCal = cals.find(c => c.primary);
                if (primaryCal) {
                    const ids = [primaryCal.id];
                    setGCalConfig({ enabledCalendarIds: ids });
                    setState(s => ({ ...s, enabledCalendarIds: ids }));
                }
            }
        } catch (e: any) {
            console.error('Failed to fetch calendars:', e);
        }
    }, []);

    // Sync events (bidirectional: push local tasks + pull GCal events)
    const syncEvents = useCallback(async (force = false) => {
        if (!isGCalConnected()) return;
        // Mutex: prevent concurrent syncs from creating duplicates
        if (syncLockRef.current) {
            console.log('⏳ Sync already in progress, skipping');
            return;
        }
        syncLockRef.current = true;

        setState(s => ({ ...s, syncing: true, error: null }));
        try {
            // ── Push local tasks to Google Calendar ──
            const allTasks = await db.tasks.toArray();
            const tasksToPush = allTasks.filter(t => t.dueDate && !t.gcalEventId);
            if (tasksToPush.length > 0) {
                const pushed = await pushTasksToGCal(tasksToPush);
                for (const [taskId, gcalId] of pushed) {
                    await storeUpdateItem<Task>('tasks', taskId, { gcalEventId: gcalId } as Partial<Task>);
                }
                if (pushed.size > 0) {
                    console.log(`📤 Pushed ${pushed.size} tasks to Google Calendar`);
                }
            }

            // ── Pull events from Google Calendar ──
            const { min, max } = getTimeRange();
            const rawEvents = await syncGCalEvents(min, max, force);

            // ── Enterprise-grade dedup: filter out events that originated from this app ──
            const updatedTasks = await db.tasks.toArray();

            // 1. Direct ID match: gcalEventId stored on local tasks
            const pushedGCalIds = new Set(
                updatedTasks.map(t => t.gcalEventId).filter(Boolean)
            );

            // 1b. Deterministic ID match: events we created have IDs derived from task IDs
            for (const t of updatedTasks) {
                pushedGCalIds.add(taskIdToGCalId(t.id));
            }

            // 2. Content-based match: match by normalized title + date
            //    Handles edge cases where gcalEventId wasn't stored (race conditions, etc.)
            const localTaskFingerprints = new Set(
                updatedTasks.map(t => {
                    const title = (t.title || '').trim().toLowerCase();
                    return `${title}|${t.dueDate || ''}`;
                })
            );

            const externalEvents = rawEvents.filter(ev => {
                // Skip if ID matches a pushed task
                if (pushedGCalIds.has(ev.id)) return false;

                // Content-based dedup: strip the 📋 prefix we add when pushing
                const rawTitle = (ev.summary || '').replace(/^📋\s*/, '').trim().toLowerCase();
                const evDate = ev.start.date || (ev.start.dateTime ? new Date(ev.start.dateTime).toISOString().split('T')[0] : '');
                const fp = `${rawTitle}|${evDate}`;

                if (localTaskFingerprints.has(fp)) {
                    // This GCal event matches a local task by content — it's a mirror, skip it
                    // Also backfill the gcalEventId if missing
                    const matchingTask = updatedTasks.find(t =>
                        (t.title || '').trim().toLowerCase() === rawTitle && t.dueDate === evDate && !t.gcalEventId
                    );
                    if (matchingTask) {
                        db.tasks.update(matchingTask.id, { gcalEventId: ev.id }).catch(() => {});
                        pushedGCalIds.add(ev.id); // prevent future re-checks
                    }
                    return false;
                }

                return true;
            });

            // Get calendar colors for mapping
            const calMap = new Map<string, string>();
            state.calendars.forEach(c => {
                if (c.backgroundColor) calMap.set(c.id, c.backgroundColor);
            });

            const events = externalEvents.map(ev =>
                gCalEventToCalEvent(ev, ev.calendarId ? calMap.get(ev.calendarId) : undefined)
            );

            setState(s => ({
                ...s,
                events,
                rawEvents,
                syncing: false,
                lastSync: new Date().toISOString(),
            }));
        } catch (e: any) {
            setState(s => ({ ...s, syncing: false, error: e.message }));
        } finally {
            syncLockRef.current = false;
        }
    }, [getTimeRange, state.calendars]);

    // Connect to Google
    const connect = useCallback(async (clientId: string) => {
        if (!clientId) return { success: false, error: 'Client ID is required' };

        setState(s => ({ ...s, connecting: true, error: null }));

        try {
            // Save client ID
            setGCalConfig({ clientId });

            const result = await signInWithGoogle(clientId);
            if (!result.success) {
                setState(s => ({ ...s, connecting: false, error: result.error || 'Auth failed' }));
                return { success: false, error: result.error };
            }

            // Save token
            setGCalConfig({
                accessToken: result.accessToken!,
                tokenExpiry: Date.now() + (result.expiresIn || 3600) * 1000,
                connectedEmail: result.email || null,
            });

            setState(s => ({
                ...s,
                connected: true,
                connecting: false,
                email: result.email || null,
                clientId,
            }));

            // Auto-fetch calendars and events
            setTimeout(() => {
                fetchCalendars();
                syncEvents(true);
            }, 500);

            return { success: true, email: result.email };
        } catch (e: any) {
            setState(s => ({ ...s, connecting: false, error: e.message }));
            return { success: false, error: e.message };
        }
    }, [fetchCalendars, syncEvents]);

    // Disconnect
    const disconnect = useCallback(() => {
        signOutGoogle();
        setState(s => ({
            ...s,
            connected: false,
            email: null,
            calendars: [],
            enabledCalendarIds: [],
            events: [],
            rawEvents: [],
            lastSync: null,
            error: null,
        }));
    }, []);

    // Toggle calendar
    const toggleCalendar = useCallback((calId: string) => {
        const cfg = getGCalConfig();
        const current = cfg.enabledCalendarIds;
        const next = current.includes(calId)
            ? current.filter(id => id !== calId)
            : [...current, calId];
        setGCalConfig({ enabledCalendarIds: next });
        setState(s => ({ ...s, enabledCalendarIds: next }));
        // Re-sync after toggling
        setTimeout(() => syncEvents(true), 200);
    }, [syncEvents]);

    // Set auto-sync
    const setAutoSync = useCallback((enabled: boolean) => {
        setGCalConfig({ autoSync: enabled });
        setState(s => ({ ...s, autoSync: enabled }));
    }, []);

    // Update client ID
    const setClientId = useCallback((id: string) => {
        setGCalConfig({ clientId: id });
        setState(s => ({ ...s, clientId: id }));
    }, []);

    // Auto-fetch on mount
    useEffect(() => {
        if (autoFetch && isGCalConnected()) {
            // Pre-load GIS script
            loadGisScript().catch(() => { });
            fetchCalendars();
            syncEvents();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-sync interval
    useEffect(() => {
        if (state.connected && state.autoSync) {
            const cfg = getGCalConfig();
            const ms = (cfg.syncIntervalMinutes || 5) * 60 * 1000;
            intervalRef.current = setInterval(() => {
                syncEvents(true);
            }, ms);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [state.connected, state.autoSync, syncEvents]);

    return {
        ...state,
        connect,
        disconnect,
        syncEvents,
        fetchCalendars,
        toggleCalendar,
        setAutoSync,
        setClientId,
    };
}
