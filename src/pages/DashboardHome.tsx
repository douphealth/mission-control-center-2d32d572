import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useCallback, useMemo } from 'react';
import * as RGL from 'react-grid-layout';
// @ts-ignore
const Responsive = RGL.Responsive || RGL.default?.Responsive;
// @ts-ignore
const WidthProvider = RGL.WidthProvider || RGL.default?.WidthProvider;

import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Github, Hammer, CheckSquare, TrendingUp,
  Clock, Zap, Calendar, FileText, Target, Sparkles, Settings2,
  DollarSign, Lightbulb, Eye, EyeOff, ArrowUpRight, ArrowDownRight,
  Pin, Lock, Unlock, ExternalLink, Activity, GripVertical, Flame,
  ChevronRight, BarChart3, ArrowUp, ArrowDown, X, LayoutGrid,
  RotateCcw, ChevronDown
} from 'lucide-react';
import {
  widgetDefinitions, getDefaultLayouts, loadSavedLayout, saveLayout,
  loadWidgetVisibility, saveWidgetVisibility,
} from '@/lib/widgetRegistry';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;
const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const priorityConfig: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/8', label: 'Critical', dot: 'bg-destructive' },
  high: { color: 'text-warning', bg: 'bg-warning/8', label: 'High', dot: 'bg-warning' },
  medium: { color: 'text-info', bg: 'bg-info/8', label: 'Medium', dot: 'bg-info' },
  low: { color: 'text-success', bg: 'bg-success/8', label: 'Low', dot: 'bg-success' },
};

// ─── Mini sparkline bars ───────────────────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((v, i) => (
        <motion.div
          key={i}
          className="rounded-sm w-[4px] min-h-[2px]"
          style={{ backgroundColor: color, opacity: 0.15 + (v / max) * 0.85 }}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max((v / max) * 100, 8)}%` }}
          transition={{ duration: 0.5, delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

// ─── Progress ring ─────────────────────────────────────────────────
function ProgressRing({ value, max, color, size = 44 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-border/40" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
        initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

export default function DashboardHome() {
  const {
    websites, repos, buildProjects, tasks, links, notes, payments, ideas, habits,
  } = useDashboard();
  const { setActiveSection } = useNavigationStore();
  const { userName } = useSettingsStore();

  const [layouts, setLayouts] = useState(() => loadSavedLayout() || { lg: getDefaultLayouts(12), md: getDefaultLayouts(10), sm: getDefaultLayouts(6), xs: getDefaultLayouts(4) });
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => loadWidgetVisibility());
  const [configOpen, setConfigOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [configTab, setConfigTab] = useState<string>('all');

  const handleLayoutChange = useCallback((_current: any, allLayouts: any) => {
    setLayouts(allLayouts);
    saveLayout(allLayouts);
  }, []);

  const toggleWidgetVisibility = (id: string) => {
    const next = { ...visibility, [id]: !visibility[id] };
    setVisibility(next);
    saveWidgetVisibility(next);
  };

  const resetLayout = () => {
    const fresh = { lg: getDefaultLayouts(12), md: getDefaultLayouts(10), sm: getDefaultLayouts(6), xs: getDefaultLayouts(4) };
    setLayouts(fresh);
    saveLayout(fresh);
  };

  const showAll = () => {
    const next: Record<string, boolean> = {};
    widgetDefinitions.forEach(w => { next[w.id] = true; });
    setVisibility(next);
    saveWidgetVisibility(next);
  };

  const hideAll = () => {
    const next: Record<string, boolean> = {};
    widgetDefinitions.forEach(w => { next[w.id] = false; });
    setVisibility(next);
    saveWidgetVisibility(next);
  };

  // ─── Data ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const activeSites = websites.filter(w => w.status === 'active').length;
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const dueToday = tasks.filter(t => t.dueDate === today && t.status !== 'done').length;
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate < today).length;
  const completedToday = tasks.filter(t => t.completedAt === today).length;
  const totalIncome = payments.filter(p => p.type === 'income' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalExpenses = payments.filter(p => (p.type === 'expense' || p.type === 'subscription') && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  // Fake sparkline data based on real counts
  const siteSparkline = useMemo(() => [2, 3, 3, 4, activeSites, activeSites + 1, activeSites], [activeSites]);
  const revenueSparkline = useMemo(() => [800, 1200, 900, 1500, 2000, totalIncome * 0.7, totalIncome].map(v => Math.max(v, 0)), [totalIncome]);
  const taskSparkline = useMemo(() => [5, 8, 6, 4, 7, openTasks + 2, openTasks], [openTasks]);

  const stats = [
    { label: 'Active Sites', value: activeSites, sub: `${websites.length} total`, change: '+2', trend: 'up' as const, icon: Globe, accent: 'hsl(var(--info))', section: 'websites', sparkline: siteSparkline },
    { label: 'Revenue', value: fmt(totalIncome), sub: `${fmt(totalExpenses)} expenses`, change: '+15.8%', trend: 'up' as const, icon: DollarSign, accent: 'hsl(var(--success))', section: 'payments', sparkline: revenueSparkline },
    { label: 'Open Tasks', value: openTasks, sub: dueToday > 0 ? `${dueToday} due today` : 'All on track', change: overdueTasks > 0 ? `${overdueTasks} overdue` : 'On track', trend: overdueTasks > 0 ? 'down' as const : 'up' as const, icon: CheckSquare, accent: overdueTasks > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--success))', section: 'tasks', sparkline: taskSparkline },
    { label: 'Repositories', value: repos.length, sub: `${repos.filter(r => r.status === 'active').length} active`, change: `${repos.filter(r => r.status === 'active').length} active`, trend: 'up' as const, icon: Github, accent: 'hsl(var(--accent))', section: 'github', sparkline: [1, 2, 2, 3, repos.length - 1, repos.length, repos.length] },
  ];

  const todayTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => {
    const p: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (p[a.priority] || 3) - (p[b.priority] || 3);
  }).slice(0, 6);

  const upcomingDeadlines = tasks.filter(t => t.status !== 'done' && t.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  const pinnedNotes = notes.filter(n => n.pinned).slice(0, 3);
  const topIdeas = ideas.filter(i => i.status !== 'parked').sort((a, b) => b.votes - a.votes).slice(0, 4);
  const quickLinks = links.filter(l => l.pinned).slice(0, 6);

  const quotes = [
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Ship fast, iterate faster.', author: 'Reid Hoffman' },
    { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
    { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
    { text: 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', author: 'Mark Zuckerberg' },
  ];
  const quote = quotes[new Date().getDate() % quotes.length];
  const statusColors: Record<string, string> = { 'todo': 'bg-muted-foreground/30', 'in-progress': 'bg-info', 'blocked': 'bg-destructive', 'done': 'bg-success' };

  // ─── Widget Header ──────────────────────────────────────────────
  const WidgetHeader = ({ icon: Icon, title, actionLabel, actionSection, rightContent }: any) => (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center shadow-sm">
          <Icon size={16} className="text-foreground/60" />
        </div>
        <div>
          <h3 className="font-semibold text-[13px] text-foreground tracking-tight">{title}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        {actionSection && (
          <button onClick={() => setActiveSection(actionSection)} className="text-[11px] text-muted-foreground hover:text-primary font-medium transition-colors flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-secondary/50">
            {actionLabel || 'View All'} <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  );

  // ─── Widget Base ────────────────────────────────────────────────
  const widgetBase = 'h-full rounded-2xl border border-border/40 bg-card shadow-[var(--shadow-xs)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-md)] hover:border-border/70';

  const renderWidget = (widgetId: string, i: number) => {
    switch (widgetId) {
      case 'stats':
        return (
          <div className={`${widgetBase} p-0`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 h-full">
              {stats.map((s, si) => (
                <motion.div key={s.label} {...fadeUp(si)}
                  className={`p-5 cursor-pointer group relative overflow-hidden transition-all duration-300 hover:bg-gradient-to-b hover:from-transparent hover:to-secondary/20 ${si < stats.length - 1 ? 'lg:border-r border-b lg:border-b-0 border-border/30' : ''}`}
                  onClick={() => setActiveSection(s.section)}>
                  {/* Subtle corner glow on hover */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" style={{ backgroundColor: `${s.accent}20` }} />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.accent}10` }}>
                          <s.icon size={15} style={{ color: s.accent }} />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[28px] font-extrabold text-foreground tracking-tighter leading-none mb-1">{s.value}</div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${s.trend === 'up' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                            {s.trend === 'up' ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                            {s.change}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">{s.sub}</span>
                        </div>
                      </div>
                      <MiniChart data={s.sparkline} color={s.accent} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'tasks-focus':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Zap} title="Today's Focus" actionSection="tasks"
              rightContent={
                <div className="flex items-center gap-1.5">
                  {dueToday > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/8 px-2 py-0.5 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                      {dueToday} due
                    </span>
                  )}
                  {completedToday > 0 && (
                    <span className="text-[10px] font-semibold text-success bg-success/8 px-2 py-0.5 rounded-md">{completedToday} done</span>
                  )}
                </div>
              }
            />
            {/* Task completion progress */}
            <div className="mb-4 px-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">Completion</span>
                <span className="text-[10px] font-semibold text-foreground">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto space-y-0.5">
              {todayTasks.map((task, ti) => {
                const pc = priorityConfig[task.priority] || priorityConfig.medium;
                return (
                  <motion.div key={task.id} {...fadeUp(ti)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-all group cursor-pointer">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pc.dot} ring-2 ring-offset-1 ring-offset-card ${pc.bg}`} />
                    <span className="text-[13px] text-foreground flex-1 truncate font-medium">{task.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${pc.bg} ${pc.color}`}>{pc.label}</span>
                    <span className={`text-[10px] font-mono flex-shrink-0 tabular-nums ${task.dueDate < today ? 'text-destructive font-bold' : 'text-muted-foreground/40'}`}>
                      {task.dueDate === today ? 'Today' : task.dueDate}
                    </span>
                  </motion.div>
                );
              })}
              {todayTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground/40">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={spring} className="text-4xl mb-3">🎉</motion.div>
                  <p className="text-sm font-semibold text-foreground/60">All caught up!</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5">No pending tasks</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'deadlines':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Calendar} title="Upcoming Deadlines" actionLabel="Calendar" actionSection="calendar" />
            <div className="flex-1 overflow-auto space-y-0.5">
              {upcomingDeadlines.map((task, ti) => {
                const daysLeft = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
                const urgency = daysLeft <= 1 ? 'destructive' : daysLeft <= 3 ? 'warning' : 'muted-foreground';
                return (
                  <motion.div key={task.id} {...fadeUp(ti)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-all">
                    <div className="w-8 text-center">
                      <div className="text-[10px] text-muted-foreground/50 font-medium leading-none">{new Date(task.dueDate).toLocaleDateString('en', { month: 'short' })}</div>
                      <div className={`text-base font-bold leading-tight text-${urgency}`}>{new Date(task.dueDate).getDate()}</div>
                    </div>
                    <div className="h-8 w-px bg-border/40" />
                    <span className="text-[13px] text-foreground flex-1 truncate font-medium">{task.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${daysLeft <= 1 ? 'bg-destructive/8 text-destructive' : daysLeft <= 3 ? 'bg-warning/8 text-warning' : 'bg-secondary text-muted-foreground'}`}>
                      {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                    </span>
                  </motion.div>
                );
              })}
              {upcomingDeadlines.length === 0 && <div className="text-center py-12 text-muted-foreground/40 text-sm font-medium">No upcoming deadlines 🌟</div>}
            </div>
          </div>
        );

      case 'finance':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={DollarSign} title="Finance Overview" actionLabel="Details" actionSection="payments" />
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { label: 'Income', value: totalIncome, icon: ArrowUpRight, color: 'hsl(var(--success))', textColor: 'text-success', bgColor: 'bg-success/6' },
                { label: 'Expenses', value: totalExpenses, icon: ArrowDownRight, color: 'hsl(var(--destructive))', textColor: 'text-destructive', bgColor: 'bg-destructive/6' },
                { label: 'Pending', value: pendingAmount, icon: Clock, color: 'hsl(var(--warning))', textColor: 'text-warning', bgColor: 'bg-warning/6' },
              ].map(d => (
                <motion.div key={d.label} whileHover={{ y: -2 }} className={`text-center p-3.5 rounded-xl ${d.bgColor} border border-border/20 transition-all cursor-default`}>
                  <d.icon size={14} className={`${d.textColor} mx-auto mb-2 opacity-60`} />
                  <div className={`text-lg font-bold ${d.textColor} tabular-nums leading-tight`}>{fmt(d.value)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-medium">{d.label}</div>
                </motion.div>
              ))}
            </div>
            {/* Net profit with ring */}
            <div className="mt-auto flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-secondary/40 to-secondary/20 border border-border/20">
              <div className="relative flex items-center justify-center">
                <ProgressRing value={totalIncome} max={totalIncome + totalExpenses} color="hsl(var(--success))" />
                <DollarSign size={14} className="absolute text-success" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground font-medium">Net Profit</div>
                <div className={`text-xl font-extrabold tabular-nums ${totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totalIncome - totalExpenses)}</div>
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Activity} title="Recent Activity" />
            <div className="flex-1 overflow-auto">
              {[
                { text: 'Deployed SaaS Landing Page', time: '2h ago', emoji: '🚀', type: 'deploy' },
                { text: 'Completed SSL renewal', time: '5h ago', emoji: '✅', type: 'security' },
                { text: '3 commits to ai-mission-control', time: '8h ago', emoji: '🐙', type: 'code' },
                { text: 'New blog post draft added', time: '1d ago', emoji: '📝', type: 'content' },
                { text: 'WooCommerce v9.2 update', time: '1d ago', emoji: '🔌', type: 'update' },
                { text: 'Fixed responsive layout', time: '2d ago', emoji: '🔧', type: 'fix' },
              ].map((a, ai) => (
                <motion.div key={ai} {...fadeUp(ai)} className="flex items-center gap-3 px-2 py-2.5 group">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center text-xs group-hover:bg-primary/10 transition-colors">{a.emoji}</div>
                    {ai < 5 && <div className="w-px h-3 bg-border/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-foreground block truncate font-medium">{a.text}</span>
                    <span className="text-[10px] text-muted-foreground/40 tabular-nums">{a.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'quick-links':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={ExternalLink} title="Quick Access" actionLabel="All Links" actionSection="links" />
            <div className="grid grid-cols-2 gap-2 flex-1 content-start">
              {quickLinks.map((link, li) => (
                <motion.a key={link.id} {...fadeUp(li)} href={link.url} target="_blank" rel="noopener noreferrer"
                  whileHover={{ y: -1, scale: 1.01 }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/20 hover:bg-secondary/50 transition-all group border border-border/20 hover:border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 group-hover:from-primary group-hover:to-primary group-hover:text-primary-foreground transition-all shadow-sm">
                    {link.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-foreground truncate block">{link.title}</span>
                    <span className="text-[9px] text-muted-foreground/40 truncate block">{link.category}</span>
                  </div>
                </motion.a>
              ))}
              {quickLinks.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground/40 text-sm">
                  <button onClick={() => setActiveSection('links')} className="text-primary hover:underline font-medium text-xs">Pin some links</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'platforms':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={BarChart3} title="Platform Status" />
            <div className="space-y-2 flex-1">
              {[
                { name: 'Cloudflare', section: 'cloudflare', ok: true, emoji: '☁️', uptime: '99.9%' },
                { name: 'Vercel', section: 'vercel', ok: true, emoji: '🚀', uptime: '99.8%' },
                { name: 'Google SC', section: 'seo', ok: false, emoji: '🔍', uptime: '—' },
                { name: 'OpenClaw', section: 'openclaw', ok: true, emoji: '🐙', uptime: '100%' },
              ].map(p => (
                <motion.button key={p.name} onClick={() => setActiveSection(p.section)} whileHover={{ x: 2 }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/40 transition-all border border-transparent hover:border-border/30">
                  <span className="text-lg">{p.emoji}</span>
                  <div className="text-left flex-1">
                    <div className="text-xs font-semibold text-foreground">{p.name}</div>
                    <div className={`text-[10px] font-medium flex items-center gap-1 ${p.ok ? 'text-success' : 'text-warning'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${p.ok ? 'bg-success' : 'bg-warning'} ${!p.ok ? 'animate-pulse' : ''}`} />
                      {p.ok ? 'Operational' : 'Warning'}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">{p.uptime}</span>
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 'ideas':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Lightbulb} title="Top Ideas" actionSection="ideas" />
            <div className="flex-1 overflow-auto space-y-1">
              {topIdeas.map((idea, ii) => (
                <motion.div key={idea.id} {...fadeUp(ii)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all group">
                  <div className="flex flex-col items-center">
                    <motion.span whileHover={{ scale: 1.1 }} className="text-xs font-extrabold text-primary bg-primary/8 w-8 h-8 rounded-lg flex items-center justify-center tabular-nums cursor-pointer">{idea.votes}</motion.span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-foreground truncate block font-semibold">{idea.title}</span>
                    <span className="text-[10px] text-muted-foreground/40">{idea.category}</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-semibold capitalize ${idea.status === 'validated' ? 'bg-success/8 text-success' : idea.status === 'exploring' ? 'bg-info/8 text-info' : 'bg-secondary text-muted-foreground'}`}>{idea.status}</span>
                </motion.div>
              ))}
              {topIdeas.length === 0 && <div className="text-center py-8 text-muted-foreground/40 text-sm">No active ideas</div>}
            </div>
          </div>
        );

      case 'notes-preview':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Pin} title="Pinned Notes" actionLabel="Notes" actionSection="notes" />
            <div className="flex-1 overflow-auto space-y-2">
              {pinnedNotes.map((note, ni) => {
                const colors = ['from-info/5 to-transparent', 'from-warning/5 to-transparent', 'from-success/5 to-transparent'];
                return (
                  <motion.button key={note.id} {...fadeUp(ni)} onClick={() => setActiveSection('notes')} whileHover={{ scale: 1.01 }}
                    className={`w-full text-left p-3.5 rounded-xl bg-gradient-to-r ${colors[ni % colors.length]} border border-border/20 hover:border-border/50 transition-all`}>
                    <div className="text-[12px] font-semibold text-foreground truncate">{note.title}</div>
                    <div className="text-[10px] text-muted-foreground/40 line-clamp-2 mt-1 leading-relaxed">{note.content.slice(0, 100)}</div>
                  </motion.button>
                );
              })}
              {pinnedNotes.length === 0 && <div className="text-center py-8 text-muted-foreground/40 text-sm">No pinned notes</div>}
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className={`${widgetBase} p-6 flex flex-col justify-center relative overflow-hidden`}>
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.02]" />
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative z-10">
              <Sparkles size={14} className="text-primary/30 mb-4" />
              <div className="text-[13px] font-medium text-foreground/70 italic leading-relaxed">"{quote.text}"</div>
              <div className="text-[10px] text-muted-foreground/30 mt-4 font-semibold tracking-wide uppercase">— {quote.author}</div>
            </div>
          </div>
        );

      case 'habits':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Flame} title="Habit Tracker" actionSection="habits" />
            <div className="flex-1 overflow-auto space-y-1">
              {habits.length > 0 ? habits.slice(0, 5).map((h, hi) => (
                <motion.div key={h.id} {...fadeUp(hi)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all">
                  <span className="text-lg">{h.icon}</span>
                  <span className="text-[12px] text-foreground flex-1 truncate font-medium">{h.name}</span>
                  <div className="flex items-center gap-1">
                    <Flame size={11} className="text-warning" />
                    <span className="text-[11px] font-bold text-warning tabular-nums">{h.streak}</span>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-12 text-muted-foreground/40 text-sm">
                  <p className="font-medium text-foreground/50">No habits yet</p>
                  <button onClick={() => setActiveSection('habits')} className="text-primary hover:underline text-xs mt-1">Start tracking</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'websites-summary':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Globe} title="Websites" actionLabel="Manage" actionSection="websites"
              rightContent={
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-success bg-success/8 px-2 py-0.5 rounded-md">{activeSites} live</span>
                </div>
              }
            />
            <div className="flex-1 overflow-auto space-y-0.5">
              {websites.slice(0, 5).map((w, wi) => (
                <motion.div key={w.id} {...fadeUp(wi)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all group cursor-pointer">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${w.status === 'active' ? 'bg-success' : w.status === 'maintenance' ? 'bg-warning' : 'bg-destructive'} ring-2 ring-offset-1 ring-offset-card ${w.status === 'active' ? 'ring-success/20' : w.status === 'maintenance' ? 'ring-warning/20' : 'ring-destructive/20'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-foreground truncate block font-semibold">{w.name}</span>
                    <span className="text-[10px] text-muted-foreground/40">{w.hostingProvider || w.category}</span>
                  </div>
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-secondary" onClick={e => e.stopPropagation()}>
                    <ExternalLink size={12} className="text-primary" />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        );

      default:
        return <div className={`${widgetBase} p-5 flex items-center justify-center text-muted-foreground/30 text-sm`}>Widget: {widgetId}</div>;
    }
  };

  const visibleWidgets = widgetDefinitions.filter(w => visibility[w.id] !== false);
  const categories = ['all', 'overview', 'productivity', 'business', 'platforms'] as const;
  const filteredWidgetDefs = configTab === 'all' ? widgetDefinitions : widgetDefinitions.filter(w => w.category === configTab);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground/60 mt-0.5">Welcome back, <span className="font-semibold text-foreground/80">{userName}</span>. Here's what's happening.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {completedToday > 0 && (
            <motion.div {...fadeUp(1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/6 border border-success/15 text-success text-[11px] font-semibold shadow-sm">
              <Target size={11} /> {completedToday} completed today
            </motion.div>
          )}
          {overdueTasks > 0 && (
            <motion.div {...fadeUp(2)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/6 border border-destructive/15 text-destructive text-[11px] font-semibold shadow-sm animate-pulse">
              ⚠️ {overdueTasks} overdue
            </motion.div>
          )}
          <div className="h-5 w-px bg-border/40 hidden sm:block" />
          <motion.button {...fadeUp(3)} onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm ${isLocked ? 'text-muted-foreground border-border/50 bg-card hover:bg-secondary' : 'text-primary bg-primary/6 border-primary/20'}`}>
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
            {isLocked ? 'Locked' : 'Editing'}
          </motion.button>
          <motion.button {...fadeUp(4)} onClick={() => setConfigOpen(!configOpen)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all border shadow-sm ${configOpen ? 'text-primary bg-primary/6 border-primary/20' : 'text-muted-foreground border-border/50 bg-card hover:bg-secondary'}`}>
            <LayoutGrid size={12} /> Customize
            <ChevronDown size={10} className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* ─── Widget Configurator (Enterprise Grade) ──────────────────── */}
      <AnimatePresence>
        {configOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-md)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-gradient-to-r from-secondary/20 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center">
                    <LayoutGrid size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Customize Dashboard</h3>
                    <p className="text-[10px] text-muted-foreground/50">Toggle widgets, reset layout, manage your view</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-md">{visibleWidgets.length}/{widgetDefinitions.length} active</span>
                  <button onClick={() => setConfigOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1 px-5 pt-4 pb-2 overflow-x-auto hide-scrollbar">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setConfigTab(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${configTab === cat ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                    {cat === 'all' ? 'All Widgets' : cat}
                  </button>
                ))}
              </div>

              {/* Widget grid */}
              <div className="px-5 py-3 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {filteredWidgetDefs.map(w => {
                    const isVisible = visibility[w.id] !== false;
                    return (
                      <motion.button
                        key={w.id}
                        onClick={() => toggleWidgetVisibility(w.id)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${isVisible
                          ? 'bg-primary/5 border-primary/20 shadow-sm'
                          : 'bg-secondary/20 border-border/20 hover:border-border/40 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <span className="text-base">{w.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-foreground truncate">{w.title}</div>
                          <div className="text-[9px] text-muted-foreground/40 truncate">{w.description}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isVisible ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {isVisible ? <Eye size={10} /> : <EyeOff size={10} className="text-muted-foreground/40" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-secondary/10">
                <div className="flex items-center gap-2">
                  <button onClick={showAll} className="text-[10px] font-semibold text-primary hover:underline">Show All</button>
                  <span className="text-muted-foreground/20">·</span>
                  <button onClick={hideAll} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Hide All</button>
                </div>
                <button onClick={resetLayout} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-secondary">
                  <RotateCcw size={10} /> Reset Layout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={50}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        margin={[14, 14]}
        containerPadding={[0, 0]}
        useCSSTransforms
      >
        {visibleWidgets.map((widget, i) => (
          <div key={widget.id} className="relative group">
            {!isLocked && (
              <div className="drag-handle absolute top-2.5 left-2.5 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-card/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all border border-border/30 shadow-sm">
                <GripVertical size={11} className="text-muted-foreground/50" />
              </div>
            )}
            {renderWidget(widget.id, i)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
