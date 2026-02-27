import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Home, CheckSquare, Calendar, FileText, Timer, Globe, Github,
  Hammer, Link2, BarChart3, Settings, DollarSign, Lightbulb, KeyRound,
  ArrowRight, Clock, Zap, Hash, Flame, Moon, Upload, Download,
  ExternalLink, Star, TrendingUp
} from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import Fuse from 'fuse.js';

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, emoji: '🏠', keywords: ['home', 'overview', 'main'] },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, emoji: '✅', keywords: ['todo', 'checklist', 'work'] },
  { id: 'calendar', label: 'Calendar', icon: Calendar, emoji: '📅', keywords: ['date', 'schedule', 'events'] },
  { id: 'notes', label: 'Notes', icon: FileText, emoji: '📝', keywords: ['write', 'document', 'memo'] },
  { id: 'habits', label: 'Habit Tracker', icon: Flame, emoji: '🔥', keywords: ['streak', 'daily', 'routine'] },
  { id: 'focus', label: 'Focus Timer', icon: Timer, emoji: '🍅', keywords: ['pomodoro', 'timer', 'concentrate'] },
  { id: 'websites', label: 'My Websites', icon: Globe, emoji: '🌐', keywords: ['sites', 'domains', 'hosting'] },
  { id: 'github', label: 'GitHub Projects', icon: Github, emoji: '🐙', keywords: ['repos', 'code', 'git'] },
  { id: 'builds', label: 'Build Projects', icon: Hammer, emoji: '🛠️', keywords: ['deploy', 'bolt', 'lovable'] },
  { id: 'links', label: 'Links Hub', icon: Link2, emoji: '🔗', keywords: ['bookmarks', 'urls', 'resources'] },
  { id: 'projects', label: 'Kanban Board', icon: BarChart3, emoji: '📊', keywords: ['board', 'kanban', 'columns'] },
  { id: 'payments', label: 'Payments', icon: DollarSign, emoji: '💰', keywords: ['money', 'invoice', 'billing'] },
  { id: 'ideas', label: 'Ideas Board', icon: Lightbulb, emoji: '💡', keywords: ['brainstorm', 'concepts', 'innovation'] },
  { id: 'credentials', label: 'Credential Vault', icon: KeyRound, emoji: '🔐', keywords: ['passwords', 'secrets', 'keys'] },
  { id: 'seo', label: 'SEO Center', icon: TrendingUp, emoji: '🔍', keywords: ['search', 'optimization', 'ranking'] },
  { id: 'cloudflare', label: 'Cloudflare', icon: Globe, emoji: '☁️', keywords: ['cdn', 'dns', 'protection'] },
  { id: 'vercel', label: 'Vercel', icon: Globe, emoji: '🚀', keywords: ['deploy', 'hosting', 'nextjs'] },
  { id: 'openclaw', label: 'OpenClaw', icon: Github, emoji: '🐙', keywords: ['tool', 'platform'] },
  { id: 'settings', label: 'Settings', icon: Settings, emoji: '⚙️', keywords: ['preferences', 'config', 'account'] },
];

interface CommandItem {
  id: string;
  type: 'navigate' | 'action' | 'data' | 'recent';
  label: string;
  sub: string;
  action: () => void;
  emoji: string;
  icon?: any;
  keywords?: string[];
  priority?: number;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onImport: () => void;
}

// Natural language query patterns
const nlPatterns: { pattern: RegExp; handler: (ctx: any) => CommandItem[] }[] = [
  {
    pattern: /tasks?\s*(due|for)\s*(today|this week|tomorrow)/i,
    handler: (ctx) => {
      const today = new Date().toISOString().split('T')[0];
      const tasks = ctx.tasks.filter((t: any) => t.status !== 'done' && t.dueDate <= today);
      return tasks.map((t: any) => ({
        id: `task-${t.id}`,
        type: 'data' as const,
        label: t.title,
        sub: `${t.priority} · ${t.dueDate}`,
        action: () => { ctx.setActiveSection('tasks'); ctx.onClose(); },
        emoji: '✅',
        priority: 10,
      }));
    },
  },
  {
    pattern: /overdue|late|past\s*due/i,
    handler: (ctx) => {
      const today = new Date().toISOString().split('T')[0];
      const overdue = ctx.tasks.filter((t: any) => t.status !== 'done' && t.dueDate < today);
      return overdue.map((t: any) => ({
        id: `overdue-${t.id}`,
        type: 'data' as const,
        label: `⚠️ ${t.title}`,
        sub: `Overdue since ${t.dueDate}`,
        action: () => { ctx.setActiveSection('tasks'); ctx.onClose(); },
        emoji: '🔴',
        priority: 10,
      }));
    },
  },
  {
    pattern: /unpaid|pending\s*(payment|invoice)/i,
    handler: (ctx) => {
      const pending = ctx.payments.filter((p: any) => p.status === 'pending' || p.status === 'overdue');
      return pending.map((p: any) => ({
        id: `payment-${p.id}`,
        type: 'data' as const,
        label: p.title,
        sub: `$${p.amount} · ${p.status}`,
        action: () => { ctx.setActiveSection('payments'); ctx.onClose(); },
        emoji: '💰',
        priority: 10,
      }));
    },
  },
];

export default function CommandPalette({ open, onClose, onImport }: CommandPaletteProps) {
  const { websites, tasks, repos, buildProjects, links, notes, payments, exportAllData, toggleTheme } = useDashboard();
  const { setActiveSection, recentSections } = useNavigationStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'navigate' | 'data' | 'actions'>('all');

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setActiveTab('all');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const ctx = useMemo(() => ({
    tasks, payments, setActiveSection, onClose
  }), [tasks, payments, setActiveSection, onClose]);

  const allItems = useMemo(() => {
    const items: CommandItem[] = [];

    // Recent sections (high priority)
    recentSections.slice(0, 4).forEach((id, i) => {
      const sec = sections.find(s => s.id === id);
      if (sec) {
        items.push({
          id: `recent-${id}`,
          type: 'recent',
          label: sec.label,
          sub: 'Recently visited',
          action: () => { setActiveSection(sec.id); onClose(); },
          emoji: sec.emoji,
          icon: Clock,
          priority: 100 - i,
        });
      }
    });

    // Navigation sections
    sections.forEach(s => {
      items.push({
        id: `nav-${s.id}`,
        type: 'navigate',
        label: s.label,
        sub: 'Go to section',
        action: () => { setActiveSection(s.id); onClose(); },
        emoji: s.emoji,
        icon: ArrowRight,
        keywords: s.keywords,
        priority: 50,
      });
    });

    // Actions
    items.push({
      id: 'action-import',
      type: 'action',
      label: 'Bulk Import (CSV/JSON)',
      sub: 'Import data from file',
      action: () => { onImport(); onClose(); },
      emoji: '📥',
      icon: Upload,
      keywords: ['upload', 'csv', 'json'],
      priority: 40,
    });
    items.push({
      id: 'action-export',
      type: 'action',
      label: 'Export All Data',
      sub: 'Download backup JSON',
      action: async () => {
        const data = await exportAllData();
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `mission-control-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        onClose();
      },
      emoji: '📤',
      icon: Download,
      keywords: ['backup', 'save', 'download'],
      priority: 40,
    });
    items.push({
      id: 'action-theme',
      type: 'action',
      label: 'Toggle Dark Mode',
      sub: 'Switch between light & dark',
      action: () => { toggleTheme(); onClose(); },
      emoji: '🌙',
      icon: Moon,
      keywords: ['theme', 'dark', 'light', 'mode'],
      priority: 30,
    });

    // Data items
    websites.forEach(w => items.push({
      id: `site-${w.id}`,
      type: 'data',
      label: w.name,
      sub: w.url,
      action: () => { window.open(w.url, '_blank'); onClose(); },
      emoji: '🌐',
      icon: ExternalLink,
      keywords: [w.category, w.hostingProvider],
      priority: 20,
    }));
    tasks.filter(t => t.status !== 'done').forEach(t => items.push({
      id: `task-${t.id}`,
      type: 'data',
      label: t.title,
      sub: `${t.priority} · ${t.dueDate}`,
      action: () => { setActiveSection('tasks'); onClose(); },
      emoji: '✅',
      keywords: [t.category, t.linkedProject],
      priority: 20,
    }));
    repos.forEach(r => items.push({
      id: `repo-${r.id}`,
      type: 'data',
      label: r.name,
      sub: r.description?.slice(0, 50) || '',
      action: () => { window.open(r.url, '_blank'); onClose(); },
      emoji: '🐙',
      icon: ExternalLink,
      keywords: [r.language, ...(r.topics || [])],
      priority: 15,
    }));
    buildProjects.forEach(b => items.push({
      id: `build-${b.id}`,
      type: 'data',
      label: b.name,
      sub: `${b.platform} · ${b.status}`,
      action: () => { setActiveSection('builds'); onClose(); },
      emoji: '🛠️',
      keywords: b.techStack,
      priority: 15,
    }));
    links.forEach(l => items.push({
      id: `link-${l.id}`,
      type: 'data',
      label: l.title,
      sub: l.url,
      action: () => { window.open(l.url, '_blank'); onClose(); },
      emoji: '🔗',
      icon: ExternalLink,
      keywords: [l.category],
      priority: 10,
    }));
    notes.forEach(n => items.push({
      id: `note-${n.id}`,
      type: 'data',
      label: n.title,
      sub: n.content?.slice(0, 40) || '',
      action: () => { setActiveSection('notes'); onClose(); },
      emoji: '📝',
      keywords: n.tags,
      priority: 10,
    }));

    return items;
  }, [websites, tasks, repos, buildProjects, links, notes, recentSections, setActiveSection, onClose, onImport, exportAllData, toggleTheme]);

  // Fuse.js fuzzy search
  const fuse = useMemo(() => new Fuse(allItems, {
    keys: [
      { name: 'label', weight: 0.5 },
      { name: 'sub', weight: 0.2 },
      { name: 'type', weight: 0.1 },
      { name: 'keywords', weight: 0.2 },
    ],
    threshold: 0.35,
    includeScore: true,
    sortFn: (a, b) => a.score - b.score,
  }), [allItems]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) {
      // Show recent first, then navigation, filtered by tab
      let items = allItems;
      if (activeTab !== 'all') {
        items = items.filter(i => activeTab === 'actions' ? i.type === 'action' : i.type === activeTab);
      }
      return items
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 12);
    }

    // Check natural language patterns first
    for (const nlp of nlPatterns) {
      if (nlp.pattern.test(q)) {
        const results = nlp.handler(ctx);
        if (results.length > 0) return results.slice(0, 10);
      }
    }

    // Fuzzy search
    let results = fuse.search(q).map(r => r.item);
    if (activeTab !== 'all') {
      results = results.filter(i => activeTab === 'actions' ? i.type === 'action' : i.type === activeTab);
    }
    return results.slice(0, 12);
  }, [query, allItems, fuse, activeTab, ctx]);

  useEffect(() => { setSelectedIndex(0); }, [query, activeTab]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIndex]) { filtered[selectedIndex].action(); }
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      e.preventDefault();
      const tabs: typeof activeTab[] = ['all', 'navigate', 'data', 'actions'];
      const next = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length];
      setActiveTab(next);
    }
  }, [filtered, selectedIndex, onClose, activeTab]);

  const typeConfig: Record<string, { label: string; color: string }> = {
    recent: { label: 'Recent', color: 'bg-warning/10 text-warning' },
    navigate: { label: 'Navigate', color: 'bg-primary/10 text-primary' },
    action: { label: 'Action', color: 'bg-accent/10 text-accent' },
    data: { label: 'Data', color: 'bg-secondary text-muted-foreground' },
  };

  const tabs = [
    { id: 'all' as const, label: 'All', count: allItems.length },
    { id: 'navigate' as const, label: 'Navigate', count: allItems.filter(i => i.type === 'navigate').length },
    { id: 'data' as const, label: 'Data', count: allItems.filter(i => i.type === 'data').length },
    { id: 'actions' as const, label: 'Actions', count: allItems.filter(i => i.type === 'action').length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl bg-card/95 backdrop-blur-2xl rounded-2xl shadow-[var(--shadow-xl)] border border-border/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40">
              <Search size={17} className="text-primary flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search, navigate, or type a command..."
                className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/50"
              />
              <kbd className="text-[10px] text-muted-foreground/40 bg-secondary px-1.5 py-0.5 rounded font-mono border border-border/30">ESC</kbd>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30 bg-secondary/20">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[9px] px-1 rounded ${activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
              {/* Section labels */}
              {!query && activeTab === 'all' && recentSections.length > 0 && (
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={10} /> Recent
                </div>
              )}

              {filtered.map((item, i) => {
                const tc = typeConfig[item.type] || typeConfig.data;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.1, delay: i * 0.015 }}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                      selectedIndex === i
                        ? 'bg-primary/8 border-l-2 border-primary'
                        : 'border-l-2 border-transparent hover:bg-secondary/40'
                    }`}
                  >
                    <span className="text-base flex-shrink-0 w-7 text-center">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-foreground truncate">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground/50 truncate">{item.sub}</div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-semibold flex-shrink-0 ${tc.color}`}>
                      {tc.label}
                    </span>
                    {selectedIndex === i && (
                      <ArrowRight size={12} className="text-primary flex-shrink-0 ml-1" />
                    )}
                  </motion.button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="text-sm font-semibold text-foreground/60">No results for "{query}"</div>
                  <div className="text-[11px] text-muted-foreground/40 mt-1">
                    Try "tasks due today" or "unpaid invoices"
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground/40 bg-secondary/10">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary font-mono text-[9px]">↑↓</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary font-mono text-[9px]">↵</kbd> Select</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-secondary font-mono text-[9px]">Tab</kbd> Filter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-primary" />
                <span className="font-semibold text-primary/60">Fuzzy Search</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
