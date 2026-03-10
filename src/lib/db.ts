// Enterprise-grade IndexedDB persistence layer using Dexie.js
// Replaces localStorage for all data — supports larger datasets, offline-first, and proper indexing.

import Dexie, { type Table } from 'dexie';

// ─── Core Entity Types ─────────────────────────────────────────────────────────

export interface Website {
    id: string;
    name: string;
    url: string;
    wpAdminUrl: string;
    wpUsername: string;
    wpPassword: string;
    hostingProvider: string;
    hostingLoginUrl: string;
    hostingUsername: string;
    hostingPassword: string;
    category: string;
    status: 'active' | 'maintenance' | 'down' | 'archived';
    notes: string;
    plugins: string[];
    dateAdded: string;
    lastUpdated: string;
    favicon?: string;
    tags?: string[];
}

export interface Task {
    id: string;
    title: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'todo' | 'in-progress' | 'blocked' | 'done';
    dueDate: string;
    category: string;
    description: string;
    linkedProject: string;
    subtasks: { id: string; title: string; done: boolean }[];
    createdAt: string;
    completedAt?: string;
    tags?: string[];
    recurring?: boolean;
    recurringInterval?: string;
    startTime?: string;   // HH:MM — calendar time support
    endTime?: string;     // HH:MM — calendar time support
    allDay?: boolean;     // defaults to true if not set
    gcalEventId?: string; // Google Calendar event ID if pushed
    reminder?: 'none' | 'at-time' | '5min' | '15min' | '30min' | '1hr' | '2hr' | '1day';
    reminderFired?: boolean; // prevents re-firing
}

export interface GitHubRepo {
    id: string;
    name: string;
    url: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    status: 'active' | 'stable' | 'archived' | 'paused';
    demoUrl: string;
    progress: number;
    topics: string[];
    lastUpdated: string;
    /** URL of the dev platform where code was built (bolt.new, lovable, replit, aistudio, etc.) */
    devPlatformUrl?: string;
    /** URL of the deployment gateway (Cloudways, Vercel, Netlify, Railway, etc.) */
    deploymentUrl?: string;
}

export interface BuildProject {
    id: string;
    name: string;
    platform: 'bolt' | 'lovable' | 'replit' | 'vercel' | 'other';
    projectUrl: string;
    deployedUrl: string;
    description: string;
    techStack: string[];
    status: 'ideation' | 'building' | 'testing' | 'deployed';
    startedDate: string;
    lastWorkedOn: string;
    nextSteps: string;
    githubRepo: string;
}

export interface LinkItem {
    id: string;
    title: string;
    url: string;
    category: string;
    status: 'active' | 'archived';
    description: string;
    dateAdded: string;
    pinned: boolean;
    favicon?: string;
    tags?: string[];
}

export interface Note {
    id: string;
    title: string;
    content: string;
    color: string;
    pinned: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Payment {
    id: string;
    title: string;
    amount: number;
    currency: string;
    type: 'income' | 'expense' | 'invoice' | 'subscription';
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    category: string;
    from: string;
    to: string;
    dueDate: string;
    paidDate: string;
    recurring: boolean;
    recurringInterval: string;
    linkedProject: string;
    notes: string;
    createdAt: string;
}

export interface Idea {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    status: 'spark' | 'exploring' | 'validated' | 'building' | 'parked';
    tags: string[];
    linkedProject: string;
    votes: number;
    createdAt: string;
    updatedAt: string;
}

export interface CredentialVault {
    id: string;
    label: string;
    service: string;
    url: string;
    username: string;
    password: string; // encrypted
    apiKey: string;   // encrypted
    notes: string;
    category: string;
    createdAt: string;
    tags?: string[];
}

export interface WidgetLayout {
    id: string;
    widgetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    visible: boolean;
}

export interface UserSettings {
    id: string;
    userName: string;
    userRole: string;
    theme: 'light' | 'dark' | 'system';
    sidebarCollapsed: boolean;
    dashboardLayout: WidgetLayout[];
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    encryptionKey?: string;
    lastSync?: string;
}

export interface CustomModule {
    id: string;
    name: string;
    icon: string;
    description: string;
    fields: { key: string; label: string; type: 'text' | 'url' | 'number' | 'date' | 'select' | 'tags' | 'textarea' | 'boolean'; options?: string[] }[];
    data: Record<string, any>[];
    createdAt: string;
    order: number;
    visible: boolean;
    color?: string;
}

export interface HabitTracker {
    id: string;
    name: string;
    icon: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    completions: string[]; // ISO date strings
    streak: number;
    createdAt: string;
    color?: string;
}

// ─── Database Class ─────────────────────────────────────────────────────────────

class MissionControlDB extends Dexie {
    websites!: Table<Website>;
    tasks!: Table<Task>;
    repos!: Table<GitHubRepo>;
    buildProjects!: Table<BuildProject>;
    links!: Table<LinkItem>;
    notes!: Table<Note>;
    payments!: Table<Payment>;
    ideas!: Table<Idea>;
    credentials!: Table<CredentialVault>;
    settings!: Table<UserSettings>;
    customModules!: Table<CustomModule>;
    habits!: Table<HabitTracker>;

    constructor() {
        super('MissionControlDB');

        this.version(1).stores({
            websites: 'id, name, status, category, dateAdded',
            tasks: 'id, title, priority, status, dueDate, category, createdAt',
            repos: 'id, name, status, language, lastUpdated',
            buildProjects: 'id, name, platform, status, startedDate',
            links: 'id, title, category, status, pinned, dateAdded',
            notes: 'id, title, pinned, createdAt, updatedAt',
            payments: 'id, type, status, category, dueDate, createdAt',
            ideas: 'id, priority, status, votes, createdAt',
            credentials: 'id, service, category, createdAt',
            settings: 'id',
            customModules: 'id, name, order, visible',
            habits: 'id, name, frequency, createdAt',
        });

        this.version(2).stores({
            tasks: 'id, title, priority, status, dueDate, category, createdAt, gcalEventId',
        });
    }
}

export const db = new MissionControlDB();

// ─── Migration from localStorage ─────────────────────────────────────────────

export async function migrateFromLocalStorage(): Promise<boolean> {
    try {
        const raw = localStorage.getItem('mission-control-data');
        if (!raw) return false;

        const data = JSON.parse(raw);
        const existing = await db.settings.get('default');
        if (existing) return false; // Already migrated

        // Migrate all entities
        if (data.websites?.length) await db.websites.bulkPut(data.websites);
        if (data.tasks?.length) await db.tasks.bulkPut(data.tasks);
        if (data.repos?.length) await db.repos.bulkPut(data.repos);
        if (data.buildProjects?.length) await db.buildProjects.bulkPut(data.buildProjects);
        if (data.links?.length) await db.links.bulkPut(data.links);
        if (data.notes?.length) await db.notes.bulkPut(data.notes);
        if (data.payments?.length) await db.payments.bulkPut(data.payments);
        if (data.ideas?.length) await db.ideas.bulkPut(data.ideas);
        if (data.credentials?.length) await db.credentials.bulkPut(data.credentials);

        // Migrate settings
        await db.settings.put({
            id: 'default',
            userName: data.userName || 'Alex',
            userRole: data.userRole || 'Digital Creator & Developer',
            theme: (localStorage.getItem('mc-theme') as any) || 'dark',
            sidebarCollapsed: false,
            dashboardLayout: [],
        });

        console.log('✅ Migrated from localStorage to IndexedDB');
        return true;
    } catch (e) {
        console.error('Migration failed:', e);
        return false;
    }
}

// ─── ID Generator ─────────────────────────────────────────────────────────────

export function genId(): string {
    return crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
