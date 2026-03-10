// ─── Deduplication Engine ───────────────────────────────────────────────────────
// Content-based fingerprinting to prevent duplicate entries across all tables.
// Each entity type has specific "identity" fields that define what makes it unique.
// Two items are considered duplicates if their fingerprints match, regardless of
// differing IDs (which are randomly generated).

import { db } from '@/lib/db';
import type {
    Website, Task, GitHubRepo, BuildProject, LinkItem, Note,
    Payment, Idea, CredentialVault, CustomModule, HabitTracker,
} from '@/lib/db';

// ─── Normalization ──────────────────────────────────────────────────────────────

function norm(s: string | undefined | null): string {
    return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normUrl(url: string | undefined | null): string {
    let u = norm(url);
    u = u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    return u;
}

// ─── Fingerprint Functions ──────────────────────────────────────────────────────
// Each returns a string that uniquely identifies the "content" of an item.
// If two items have the same fingerprint, they are duplicates.

function fpWebsite(item: Partial<Website>): string {
    return `w|${normUrl(item.url)}|${norm(item.name)}`;
}

function fpTask(item: Partial<Task>): string {
    // Include dueDate in fingerprint — two tasks with the same title on the same date are duplicates
    return `t|${norm(item.title)}|${norm(item.dueDate)}|${norm(item.category)}|${norm(item.linkedProject)}`;
}

function fpRepo(item: Partial<GitHubRepo>): string {
    return `r|${normUrl(item.url)}|${norm(item.name)}`;
}

function fpBuild(item: Partial<BuildProject>): string {
    return `bp|${norm(item.name)}|${normUrl(item.projectUrl)}`;
}

function fpLink(item: Partial<LinkItem>): string {
    return `l|${normUrl(item.url)}|${norm(item.title)}`;
}

function fpNote(item: Partial<Note>): string {
    return `n|${norm(item.title)}|${norm(item.content)?.slice(0, 100)}`;
}

function fpPayment(item: Partial<Payment>): string {
    return `p|${norm(item.title)}|${item.amount ?? 0}|${norm(item.type)}|${norm(item.from)}|${norm(item.to)}`;
}

function fpIdea(item: Partial<Idea>): string {
    return `i|${norm(item.title)}|${norm(item.category)}`;
}

function fpCredential(item: Partial<CredentialVault>): string {
    return `c|${norm(item.label)}|${norm(item.service)}|${normUrl(item.url)}`;
}

function fpCustomModule(item: Partial<CustomModule>): string {
    return `cm|${norm(item.name)}`;
}

function fpHabit(item: Partial<HabitTracker>): string {
    return `h|${norm(item.name)}|${norm(item.frequency)}`;
}

// ─── Table-to-fingerprint mapping ───────────────────────────────────────────────

type FingerprintFn = (item: any) => string;

const FINGERPRINT_MAP: Record<string, FingerprintFn> = {
    websites: fpWebsite,
    tasks: fpTask,
    repos: fpRepo,
    buildProjects: fpBuild,
    links: fpLink,
    notes: fpNote,
    payments: fpPayment,
    ideas: fpIdea,
    credentials: fpCredential,
    customModules: fpCustomModule,
    habits: fpHabit,
};

/**
 * Get the fingerprint function for a given table name.
 */
export function getFingerprint(table: string): FingerprintFn | null {
    return FINGERPRINT_MAP[table] ?? null;
}

/**
 * Build a Set of fingerprints from existing items in a Dexie table.
 */
export async function getExistingFingerprints(tableName: string): Promise<Set<string>> {
    const fp = FINGERPRINT_MAP[tableName];
    if (!fp) return new Set();

    const tableRef = getTableRef(tableName);
    if (!tableRef) return new Set();

    const items = await tableRef.toArray();
    return new Set(items.map((item: any) => fp(item)));
}

/**
 * Filter out items that already exist (by content fingerprint) in the given table.
 * Returns only the items that are NOT duplicates.
 */
export async function deduplicateItems<T>(tableName: string, items: T[]): Promise<T[]> {
    const fp = FINGERPRINT_MAP[tableName];
    if (!fp) return items; // No fingerprint function = no dedup, pass everything through

    const existing = await getExistingFingerprints(tableName);

    // Also dedup within the incoming batch itself
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const item of items) {
        const hash = fp(item);
        if (!existing.has(hash) && !seen.has(hash)) {
            seen.add(hash);
            unique.push(item);
        }
    }

    return unique;
}

/**
 * Check if a single item already exists in the given table (by content fingerprint).
 */
export async function isDuplicate(tableName: string, item: any): Promise<boolean> {
    const fp = FINGERPRINT_MAP[tableName];
    if (!fp) return false;

    const existing = await getExistingFingerprints(tableName);
    return existing.has(fp(item));
}

// ─── Table reference resolver (mirrors dataStore) ───────────────────────────────

function getTableRef(tableName: string) {
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

/**
 * Deduplicate an entire table in-place: remove items that have the same
 * fingerprint as an earlier item (keep the first occurrence by ID sort order).
 * Returns the number of duplicates removed.
 */
export async function deduplicateTable(tableName: string): Promise<number> {
    const fp = FINGERPRINT_MAP[tableName];
    if (!fp) return 0;

    const tableRef = getTableRef(tableName);
    if (!tableRef) return 0;

    const items = await tableRef.toArray();
    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const item of items) {
        const hash = fp(item);
        if (seen.has(hash)) {
            toDelete.push(item.id);
        } else {
            seen.add(hash);
        }
    }

    if (toDelete.length > 0) {
        await tableRef.bulkDelete(toDelete);
        console.log(`🧹 Dedup: removed ${toDelete.length} duplicate(s) from "${tableName}"`);
    }

    return toDelete.length;
}

/**
 * Deduplicate ALL tables. Returns total duplicates removed.
 */
export async function deduplicateAll(): Promise<number> {
    const tables = Object.keys(FINGERPRINT_MAP);
    let total = 0;
    for (const table of tables) {
        total += await deduplicateTable(table);
    }
    if (total > 0) {
        console.log(`🧹 Total dedup: removed ${total} duplicate(s) across all tables`);
    }
    return total;
}
