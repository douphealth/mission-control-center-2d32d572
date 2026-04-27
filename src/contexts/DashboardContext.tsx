import React, { createContext, useContext, useEffect, useRef } from 'react';
import { db, genId, migrateFromLocalStorage } from '@/lib/db';
import type { Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment, Idea, CredentialVault, CustomModule, HabitTracker, UserSettings, WidgetLayout } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDataStore } from '@/stores/dataStore';
import { isSupabaseConnected, pullFromSupabase, startRealtimeSync, stopRealtimeSync } from '@/lib/supabase';
import { deduplicateAll } from '@/lib/dedup';

// Re-export types for convenience
export type { Website, Task, GitHubRepo, BuildProject, LinkItem, Note, Payment, Idea, CredentialVault, CustomModule, HabitTracker, UserSettings, WidgetLayout };

interface DashboardContextValue {
  // Data (from Dexie live queries — reactive)
  websites: Website[];
  tasks: Task[];
  repos: GitHubRepo[];
  buildProjects: BuildProject[];
  links: LinkItem[];
  notes: Note[];
  payments: Payment[];
  ideas: Idea[];
  credentials: CredentialVault[];
  customModules: CustomModule[];
  habits: HabitTracker[];

  // Settings (from Zustand stores — backward compat)
  userName: string;
  userRole: string;
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  dashboardLayout: WidgetLayout[];

  // Navigation (from Zustand — backward compat)
  activeSection: string;
  setActiveSection: (s: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;

  // Theme
  toggleTheme: () => void;
  setTheme: (t: 'light' | 'dark' | 'system') => void;

  // CRUD — delegated to dataStore
  addItem: <T extends { id: string }>(table: string, item: Omit<T, 'id'>) => Promise<string>;
  updateItem: <T extends { id: string }>(table: string, id: string, changes: Partial<T>) => Promise<void>;
  deleteItem: (table: string, id: string) => Promise<void>;
  duplicateItem: (table: string, id: string, overrides?: Record<string, any>) => Promise<string>;
  bulkAddItems: <T extends { id: string }>(table: string, items: Omit<T, 'id'>[]) => Promise<void>;

  // Settings
  updateSettings: (changes: Partial<UserSettings>) => Promise<void>;
  saveDashboardLayout: (layout: WidgetLayout[]) => Promise<void>;

  // Data loading state
  isLoading: boolean;

  // Export / Import
  exportAllData: () => Promise<string>;
  importAllData: (json: string) => Promise<void>;

  // Utility
  genId: () => string;

  // Delete with undo toast
  deleteItemWithUndo: (table: string, id: string, label: string) => Promise<void>;

  // Backward-compat
  updateData: (partial: Record<string, any>) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ─── Default data seeder ────────────────────────────────────────────────────────

async function seedDefaults() {
  }
  const [wCount, tCount, rCount, bCount, lCount, nCount, pCount, iCount, cCount, sCount] = await Promise.all([
    db.websites.count(), db.tasks.count(), db.repos.count(), db.buildProjects.count(),
    db.links.count(), db.notes.count(), db.payments.count(), db.ideas.count(),
    db.credentials.count(), db.settings.count(),
  ]);
  if (wCount + tCount + rCount + bCount + lCount + nCount + pCount + iCount + cCount + sCount > 0) return;

  const now = new Date().toISOString().split('T')[0];
  const id = genId;

  await db.websites.bulkPut([
    { id: id(), name: 'Digital Marketing Agency', url: 'https://agency-demo.com', wpAdminUrl: 'https://agency-demo.com/wp-admin/', wpUsername: 'admin', wpPassword: '', hostingProvider: 'SiteGround', hostingLoginUrl: 'https://my.siteground.com', hostingUsername: '', hostingPassword: '', category: 'Client Site', status: 'active', notes: 'Main client project', plugins: ['Elementor', 'Yoast SEO', 'WP Rocket'], dateAdded: '2025-09-15', lastUpdated: now },
    { id: id(), name: 'E-Commerce Fashion Store', url: 'https://fashion-store.com', wpAdminUrl: 'https://fashion-store.com/wp-admin/', wpUsername: 'shop_admin', wpPassword: '', hostingProvider: 'Cloudways', hostingLoginUrl: 'https://platform.cloudways.com', hostingUsername: '', hostingPassword: '', category: 'E-Commerce', status: 'active', notes: 'WooCommerce store, 500+ products', plugins: ['WooCommerce', 'Elementor', 'Mailchimp'], dateAdded: '2025-06-10', lastUpdated: now },
    { id: id(), name: 'Personal Portfolio', url: 'https://myportfolio.dev', wpAdminUrl: '', wpUsername: '', wpPassword: '', hostingProvider: 'Vercel', hostingLoginUrl: 'https://vercel.com/dashboard', hostingUsername: '', hostingPassword: '', category: 'Personal', status: 'maintenance', notes: 'Redesigning', plugins: [], dateAdded: '2024-12-01', lastUpdated: now },
    { id: id(), name: 'Tech Blog', url: 'https://techinsights-blog.com', wpAdminUrl: 'https://techinsights-blog.com/wp-admin/', wpUsername: 'editor', wpPassword: '', hostingProvider: 'SiteGround', hostingLoginUrl: 'https://my.siteground.com', hostingUsername: '', hostingPassword: '', category: 'Blog', status: 'active', notes: 'Publishing 2 articles/week', plugins: ['Yoast SEO', 'WP Rocket'], dateAdded: '2025-03-20', lastUpdated: now },
    { id: id(), name: 'SaaS Landing Page', url: 'https://saas-product.io', wpAdminUrl: '', wpUsername: '', wpPassword: '', hostingProvider: 'Vercel', hostingLoginUrl: 'https://vercel.com/dashboard', hostingUsername: '', hostingPassword: '', category: 'SaaS', status: 'active', notes: 'Next.js + Tailwind, connected to Stripe', plugins: [], dateAdded: '2026-01-05', lastUpdated: now },
  ]);

  await db.tasks.bulkPut([
    { id: id(), title: 'Fix checkout bug on fashion store', priority: 'critical', status: 'in-progress', dueDate: now, category: 'Bug Fix', description: 'Payment gateway timeout on mobile', linkedProject: 'E-Commerce Fashion Store', subtasks: [{ id: id(), title: 'Reproduce the bug', done: true }, { id: id(), title: 'Apply gateway fix', done: false }], createdAt: now },
    { id: id(), title: 'Write blog post: AI in 2026', priority: 'high', status: 'todo', dueDate: '2026-02-27', category: 'Content', description: 'Draft 2000-word article', linkedProject: 'Tech Blog', subtasks: [], createdAt: now },
    { id: id(), title: 'Deploy portfolio redesign', priority: 'high', status: 'blocked', dueDate: '2026-02-25', category: 'Deployment', description: 'Waiting for assets', linkedProject: 'Personal Portfolio', subtasks: [], createdAt: now },
    { id: id(), title: 'Update WooCommerce plugins', priority: 'medium', status: 'todo', dueDate: '2026-02-28', category: 'Maintenance', description: 'Security update', linkedProject: 'E-Commerce Fashion Store', subtasks: [], createdAt: now },
    { id: id(), title: 'Set up email automation', priority: 'medium', status: 'todo', dueDate: '2026-03-01', category: 'Marketing', description: 'Mailchimp welcome series', linkedProject: 'E-Commerce Fashion Store', subtasks: [{ id: id(), title: 'Design templates', done: false }, { id: id(), title: 'Set up triggers', done: false }], createdAt: now },
    { id: id(), title: 'Review client feedback', priority: 'medium', status: 'in-progress', dueDate: now, category: 'Client', description: 'Round 2 revisions', linkedProject: 'Digital Marketing Agency', subtasks: [], createdAt: now },
    { id: id(), title: 'Optimize images site-wide', priority: 'medium', status: 'todo', dueDate: '2026-03-03', category: 'Performance', description: 'Convert to WebP, lazy load', linkedProject: 'Tech Blog', subtasks: [], createdAt: now },
    { id: id(), title: 'Update SSL certificates', priority: 'low', status: 'done', dueDate: '2026-02-20', category: 'Security', description: 'Renew certs', linkedProject: '', subtasks: [], createdAt: '2026-02-15', completedAt: '2026-02-19' },
  ]);

  await db.repos.bulkPut([
    { id: id(), name: 'ai-mission-control', url: 'https://github.com/alexdev/ai-mission-control', description: 'Personal dashboard for managing all digital work', language: 'TypeScript', stars: 24, forks: 3, status: 'active', demoUrl: 'https://mission-control.vercel.app', progress: 85, topics: ['dashboard', 'react', 'typescript'], lastUpdated: now },
    { id: id(), name: 'wp-starter-theme', url: 'https://github.com/alexdev/wp-starter-theme', description: 'Modern WordPress starter theme with Tailwind', language: 'PHP', stars: 156, forks: 42, status: 'stable', demoUrl: '', progress: 100, topics: ['wordpress', 'theme'], lastUpdated: '2025-11-15' },
    { id: id(), name: 'ecommerce-api', url: 'https://github.com/alexdev/ecommerce-api', description: 'RESTful API with Stripe integration', language: 'JavaScript', stars: 8, forks: 1, status: 'active', demoUrl: '', progress: 60, topics: ['api', 'node', 'express'], lastUpdated: now },
    { id: id(), name: 'portfolio-next', url: 'https://github.com/alexdev/portfolio-next', description: 'Portfolio with Next.js 15 and Framer Motion', language: 'TypeScript', stars: 12, forks: 5, status: 'active', demoUrl: 'https://myportfolio.dev', progress: 90, topics: ['portfolio', 'nextjs'], lastUpdated: now },
  ]);

  await db.buildProjects.bulkPut([
    { id: id(), name: 'AI Content Generator', platform: 'bolt', projectUrl: 'https://bolt.new/ai-content-gen', deployedUrl: 'https://ai-content-gen.vercel.app', description: 'Generate blog posts with AI', techStack: ['React', 'Supabase', 'OpenAI'], status: 'building', startedDate: '2026-01-15', lastWorkedOn: now, nextSteps: 'Add content templates', githubRepo: '' },
    { id: id(), name: 'Client Portal App', platform: 'lovable', projectUrl: 'https://lovable.dev/projects/client-portal', deployedUrl: 'https://client-portal.lovable.app', description: 'Portal for project updates & invoices', techStack: ['Next.js', 'Prisma', 'Tailwind'], status: 'testing', startedDate: '2025-12-01', lastWorkedOn: now, nextSteps: 'Final QA', githubRepo: '' },
    { id: id(), name: 'Invoice Generator', platform: 'bolt', projectUrl: 'https://bolt.new/invoice-gen', deployedUrl: 'https://invoice-gen.vercel.app', description: 'Beautiful PDF invoices', techStack: ['React', 'PDF-lib', 'Tailwind'], status: 'deployed', startedDate: '2025-10-20', lastWorkedOn: '2026-01-10', nextSteps: 'Add recurring invoicing', githubRepo: '' },
  ]);

  await db.links.bulkPut([
    { id: id(), title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs', category: 'Documentation', status: 'active', description: 'Official Tailwind documentation', dateAdded: '2025-06-01', pinned: true },
    { id: id(), title: 'Supabase Dashboard', url: 'https://supabase.com/dashboard', category: 'Tools', status: 'active', description: 'Database and auth management', dateAdded: '2025-07-15', pinned: true },
    { id: id(), title: 'Stripe Dashboard', url: 'https://dashboard.stripe.com', category: 'Tools', status: 'active', description: 'Payment processing', dateAdded: '2025-09-05', pinned: true },
    { id: id(), title: 'Figma', url: 'https://figma.com', category: 'Design', status: 'active', description: 'UI/UX design tool', dateAdded: '2025-01-10', pinned: false },
    { id: id(), title: 'MDN Web Docs', url: 'https://developer.mozilla.org', category: 'Documentation', status: 'active', description: 'Web technology reference', dateAdded: '2024-11-20', pinned: false },
    { id: id(), title: 'Vercel Docs', url: 'https://vercel.com/docs', category: 'Documentation', status: 'active', description: 'Vercel platform docs', dateAdded: '2025-08-22', pinned: false },
  ]);

  await db.notes.bulkPut([
    { id: id(), title: 'Project Ideas for Q1 2026', content: '• AI-powered SEO audit tool\n• Client reporting dashboard\n• WordPress plugin marketplace\n• Newsletter automation system', color: 'blue', pinned: true, tags: ['ideas', 'planning'], createdAt: '2026-01-02', updatedAt: now },
    { id: id(), title: 'Meeting Notes — Client Alpha', content: 'Date: Feb 20, 2026\nKey Points:\n- Website redesign approved\n- Budget: $15k\n- Deadline: March 30', color: 'amber', pinned: false, tags: ['meeting', 'client'], createdAt: '2026-02-20', updatedAt: '2026-02-20' },
    { id: id(), title: 'Quick Reference Links', content: 'Cloudflare API: https://api.cloudflare.com/client/v4/\nVercel API: https://api.vercel.com/\nUseful: npm run build && npm run preview', color: 'green', pinned: true, tags: ['reference'], createdAt: '2026-01-15', updatedAt: now },
  ]);

  await db.payments.bulkPut([
    { id: id(), title: 'Agency Redesign Invoice', amount: 5000, currency: 'USD', type: 'income', status: 'pending', category: 'Freelance', from: 'Client Alpha Corp', to: 'Alex', dueDate: '2026-03-01', paidDate: '', recurring: false, recurringInterval: '', linkedProject: 'Digital Marketing Agency', notes: 'Phase 2 deposit', createdAt: now },
    { id: id(), title: 'SiteGround Hosting', amount: 14.99, currency: 'USD', type: 'subscription', status: 'paid', category: 'Hosting', from: '', to: 'SiteGround', dueDate: '2026-03-15', paidDate: '2026-02-15', recurring: true, recurringInterval: 'monthly', linkedProject: '', notes: '', createdAt: now },
    { id: id(), title: 'Fashion Store Revenue', amount: 3200, currency: 'USD', type: 'income', status: 'paid', category: 'E-Commerce', from: 'Fashion Store Sales', to: 'Alex', dueDate: '', paidDate: '2026-02-25', recurring: true, recurringInterval: 'monthly', linkedProject: 'E-Commerce Fashion Store', notes: 'February sales', createdAt: now },
    { id: id(), title: 'Logo Design for Client', amount: 800, currency: 'USD', type: 'income', status: 'overdue', category: 'Freelance', from: 'Beta Inc.', to: 'Alex', dueDate: '2026-02-15', paidDate: '', recurring: false, recurringInterval: '', linkedProject: '', notes: 'Follow up needed', createdAt: now },
    { id: id(), title: 'Domain Renewal — saas-product.io', amount: 35, currency: 'USD', type: 'expense', status: 'paid', category: 'Domains', from: '', to: 'Namecheap', dueDate: '2026-01-05', paidDate: '2026-01-05', recurring: true, recurringInterval: 'yearly', linkedProject: 'SaaS Landing Page', notes: '', createdAt: now },
    { id: id(), title: 'Figma Pro Subscription', amount: 12, currency: 'USD', type: 'subscription', status: 'paid', category: 'Tools', from: '', to: 'Figma', dueDate: '2026-03-20', paidDate: '2026-02-20', recurring: true, recurringInterval: 'monthly', linkedProject: '', notes: '', createdAt: now },
  ]);

  await db.ideas.bulkPut([
    { id: id(), title: 'AI-Powered SEO Audit Tool', description: 'Automated SEO auditing with GPT', category: 'SaaS Product', priority: 'high', status: 'exploring', tags: ['AI', 'SEO'], linkedProject: '', votes: 5, createdAt: '2026-01-15', updatedAt: now },
    { id: id(), title: 'Client Reporting Automation', description: 'Auto-generate PDF reports from analytics', category: 'Tool', priority: 'high', status: 'validated', tags: ['automation', 'reports'], linkedProject: 'Client Portal App', votes: 8, createdAt: '2025-12-10', updatedAt: now },
    { id: id(), title: 'Personal Finance Dashboard', description: 'Track income, expenses, investments in one view', category: 'Personal', priority: 'medium', status: 'spark', tags: ['finance', 'dashboard'], linkedProject: '', votes: 2, createdAt: '2026-02-18', updatedAt: now },
  ]);

  await db.credentials.bulkPut([
    { id: id(), label: 'Cloudflare Account', service: 'Cloudflare', url: 'https://dash.cloudflare.com', username: 'alex@email.com', password: '', apiKey: '', notes: 'Main account managing 4 domains', category: 'Infrastructure', createdAt: now },
    { id: id(), label: 'Vercel Account', service: 'Vercel', url: 'https://vercel.com/dashboard', username: 'alex@email.com', password: '', apiKey: '', notes: 'Pro plan, 3 projects', category: 'Hosting', createdAt: now },
    { id: id(), label: 'GitHub Account', service: 'GitHub', url: 'https://github.com', username: 'alexdev', password: '', apiKey: '', notes: 'Personal access token for API', category: 'Development', createdAt: now },
    { id: id(), label: 'Stripe Account', service: 'Stripe', url: 'https://dashboard.stripe.com', username: 'alex@email.com', password: '', apiKey: '', notes: 'Connected to SaaS Landing Page', category: 'Payments', createdAt: now },
  ]);

  await db.settings.put({
    id: 'default',
    userName: 'Alex',
    userRole: 'Digital Creator & Developer',
    theme: 'dark',
    sidebarCollapsed: false,
    dashboardLayout: [],
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// This is now a thin compatibility layer. All CRUD and state management is
// delegated to Zustand stores (dataStore, settingsStore, navigationStore).
// Live queries stay here because they require React hooks context.

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // Zustand stores
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen, sidebarCollapsed } = useNavigationStore();
  const { userName, userRole, theme, toggleTheme, setTheme, loadSettings } = useSettingsStore();
  const { isLoading, setIsLoading, dashboardLayout, setDashboardLayout, addItem, updateItem, deleteItem, deleteItemWithUndo, duplicateItem, bulkAddItems, updateSettings, saveDashboardLayout, exportAllData, importAllData, updateData } = useDataStore();

  const initialized = useRef(false);

  // Initialize DB, load settings, and auto-pull from Supabase
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        await migrateFromLocalStorage();

        // Always hydrate local DB from cloud first when connected,
        // so this device shows the latest shared state immediately.
        if (isSupabaseConnected()) {
          await pullFromSupabase();
        }

        await seedDefaults();
        // ─── Deduplicate all tables after migration/seeding ──────────────────────
        await deduplicateAll();
        await loadSettings();

        // Load dashboard layout into Zustand
        const settings = await db.settings.get('default');
        if (settings?.dashboardLayout) {
          setDashboardLayout(settings.dashboardLayout);
        }
      } catch (e) {
        console.error('DB init error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadSettings, setIsLoading, setDashboardLayout]);

  // Continuous cloud pull for cross-device consistency (realtime + heartbeat)
  useEffect(() => {
    if (isLoading || !isSupabaseConnected()) return;

    let pulling = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const safePull = async () => {
      if (pulling) return;
      pulling = true;
      try {
        await pullFromSupabase();
      } finally {
        pulling = false;
      }
    };

    const realtimeStarted = startRealtimeSync(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void safePull();
      }, 900);
    });

    // Fallback polling only if realtime is unavailable
    const heartbeat = !realtimeStarted ? setInterval(() => {
      void safePull();
    }, 60000) : null;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (heartbeat) clearInterval(heartbeat);
      stopRealtimeSync();
    };
  }, [isLoading]);

  // Live queries — reactive to DB changes (must be in React component)
  const websites = useLiveQuery(() => db.websites.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const repos = useLiveQuery(() => db.repos.toArray(), []) ?? [];
  const buildProjects = useLiveQuery(() => db.buildProjects.toArray(), []) ?? [];
  const links = useLiveQuery(() => db.links.toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];
  const ideas = useLiveQuery(() => db.ideas.toArray(), []) ?? [];
  const credentials = useLiveQuery(() => db.credentials.toArray(), []) ?? [];
  const customModules = useLiveQuery(() => db.customModules.toArray(), []) ?? [];
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];

  const value: DashboardContextValue = {
    websites, tasks, repos, buildProjects, links, notes, payments, ideas, credentials, customModules, habits,
    userName, userRole, theme, sidebarCollapsed, dashboardLayout,
    activeSection, setActiveSection, sidebarOpen, setSidebarOpen,
    toggleTheme, setTheme,
    addItem, updateItem, deleteItem, deleteItemWithUndo, duplicateItem, bulkAddItems,
    updateSettings, saveDashboardLayout,
    isLoading,
    exportAllData, importAllData,
    genId,
    updateData,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
