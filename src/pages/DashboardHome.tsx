import { useDashboard } from '@/contexts/DashboardContext';
import { useState, useCallback } from 'react';
import * as RGL from 'react-grid-layout';
// @ts-ignore
const Responsive = RGL.Responsive || RGL.default?.Responsive;
// @ts-ignore
const WidthProvider = RGL.WidthProvider || RGL.default?.WidthProvider;

import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Github, Hammer, CheckSquare, TrendingUp, TrendingDown,
  Clock, ArrowRight, Zap, Calendar, FileText, Target, Sparkles, Settings2,
  DollarSign, Lightbulb, Eye, EyeOff, ArrowUpRight, ArrowDownRight,
  Pin, Lock, Unlock, ExternalLink, Activity, GripVertical, Flame,
  Plus, ChevronRight, MoreHorizontal, BarChart3, Users, CreditCard,
  ArrowUp, ArrowDown
} from 'lucide-react';
import {
  widgetDefinitions, getDefaultLayouts, loadSavedLayout, saveLayout,
  loadWidgetVisibility, saveWidgetVisibility,
} from '@/lib/widgetRegistry';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/8', label: 'Critical' },
  high: { color: 'text-warning', bg: 'bg-warning/8', label: 'High' },
  medium: { color: 'text-info', bg: 'bg-info/8', label: 'Medium' },
  low: { color: 'text-success', bg: 'bg-success/8', label: 'Low' },
};

export default function DashboardHome() {
  const {
    websites, repos, buildProjects, tasks, links, notes, payments, ideas, habits,
    setActiveSection, userName,
  } = useDashboard();

  const [layouts, setLayouts] = useState(() => loadSavedLayout() || { lg: getDefaultLayouts(12), md: getDefaultLayouts(10), sm: getDefaultLayouts(6), xs: getDefaultLayouts(4) });
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => loadWidgetVisibility());
  const [configOpen, setConfigOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  const handleLayoutChange = useCallback((_current: any, allLayouts: any) => {
    setLayouts(allLayouts);
    saveLayout(allLayouts);
  }, []);

  const toggleWidgetVisibility = (id: string) => {
    const next = { ...visibility, [id]: !visibility[id] };
    setVisibility(next);
    saveWidgetVisibility(next);
  };

  // ─── Data ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const activeSites = websites.filter(w => w.status === 'active').length;
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const dueToday = tasks.filter(t => t.dueDate === today && t.status !== 'done').length;
  const activeBuilds = buildProjects.filter(b => b.status !== 'deployed').length;
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate < today).length;
  const completedToday = tasks.filter(t => t.completedAt === today).length;
  const totalIncome = payments.filter(p => p.type === 'income' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalExpenses = payments.filter(p => (p.type === 'expense' || p.type === 'subscription') && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const stats = [
    { label: 'Active Sites', value: activeSites, total: websites.length, change: '+2', trend: 'up' as const, icon: Globe, accent: 'hsl(var(--info))', section: 'websites' },
    { label: 'Total Revenue', value: fmt(totalIncome), change: '+15.8%', trend: 'up' as const, icon: DollarSign, accent: 'hsl(var(--success))', section: 'payments' },
    { label: 'Open Tasks', value: openTasks, change: overdueTasks > 0 ? `${overdueTasks} overdue` : 'On track', trend: overdueTasks > 0 ? 'down' as const : 'up' as const, icon: CheckSquare, accent: overdueTasks > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--success))', section: 'tasks' },
    { label: 'Repositories', value: repos.length, change: `${repos.filter(r => r.status === 'active').length} active`, trend: 'up' as const, icon: Github, accent: 'hsl(var(--accent))', section: 'github' },
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
    { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  ];
  const quote = quotes[new Date().getDate() % quotes.length];

  const statusColors: Record<string, string> = { 'todo': 'bg-muted-foreground/40', 'in-progress': 'bg-info', 'blocked': 'bg-destructive', 'done': 'bg-success' };

  // ─── Widget Header ─────────────────────────────────────────────────
  const WidgetHeader = ({ icon: Icon, title, action, actionLabel, actionSection }: any) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
          <Icon size={15} className="text-foreground/70" />
        </div>
        <h3 className="font-semibold text-sm text-foreground tracking-tight">{title}</h3>
      </div>
      {actionSection && (
        <button onClick={() => setActiveSection(actionSection)} className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors flex items-center gap-1">
          {actionLabel || 'View All'} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );

  // ─── Widgets ──────────────────────────────────────────────────────────
  const widgetBase = 'h-full rounded-2xl border border-border/50 bg-card overflow-hidden transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-border/80';

  const renderWidget = (widgetId: string, i: number) => {
    switch (widgetId) {
      case 'stats':
        return (
          <div className={`${widgetBase} p-0`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 h-full">
              {stats.map((s, si) => (
                <motion.div key={s.label} {...fadeUp(si)}
                  className={`p-5 cursor-pointer group hover:bg-secondary/30 transition-all relative ${si < stats.length - 1 ? 'lg:border-r border-b lg:border-b-0 border-border/40' : ''}`}
                  onClick={() => setActiveSection(s.section)}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.accent}12` }}>
                      <s.icon size={18} style={{ color: s.accent }} />
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.trend === 'up' ? 'bg-success/8 text-success' : 'bg-destructive/8 text-destructive'}`}>
                      {s.trend === 'up' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                      {s.change}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground tracking-tight mb-0.5">{s.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'tasks-focus':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Zap} title="Today's Focus" actionSection="tasks" />
            {dueToday > 0 && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-destructive/5 border border-destructive/10">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-medium text-destructive">{dueToday} task{dueToday > 1 ? 's' : ''} due today</span>
              </div>
            )}
            <div className="flex-1 overflow-auto space-y-1">
              {todayTasks.map((task, ti) => {
                const pc = priorityConfig[task.priority] || priorityConfig.medium;
                return (
                  <motion.div key={task.id} {...fadeUp(ti)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-all group cursor-pointer">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[task.status] || 'bg-muted-foreground/30'}`} />
                    <span className="text-[13px] text-foreground flex-1 truncate">{task.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${pc.bg} ${pc.color}`}>{pc.label}</span>
                    <span className={`text-[11px] font-mono flex-shrink-0 ${task.dueDate < today ? 'text-destructive font-semibold' : 'text-muted-foreground/50'}`}>{task.dueDate}</span>
                  </motion.div>
                );
              })}
              {todayTasks.length === 0 && (
                <div className="text-center py-10 text-muted-foreground/50">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm font-medium">All caught up!</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'deadlines':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Calendar} title="Upcoming" actionLabel="Calendar" actionSection="calendar" />
            <div className="flex-1 overflow-auto space-y-1">
              {upcomingDeadlines.map((task, ti) => {
                const daysLeft = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <motion.div key={task.id} {...fadeUp(ti)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-all">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[task.status] || 'bg-muted-foreground/30'}`} />
                    <span className="text-[13px] text-foreground flex-1 truncate">{task.title}</span>
                    <span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${daysLeft <= 1 ? 'bg-destructive/8 text-destructive' : daysLeft <= 3 ? 'bg-warning/8 text-warning' : 'bg-secondary text-muted-foreground'}`}>
                      {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                    </span>
                  </motion.div>
                );
              })}
              {upcomingDeadlines.length === 0 && <div className="text-center py-10 text-muted-foreground/50 text-sm">No upcoming deadlines 🌟</div>}
            </div>
          </div>
        );

      case 'finance':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={DollarSign} title="Finance Overview" actionLabel="Details" actionSection="payments" />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Income', value: totalIncome, icon: ArrowUpRight, color: 'text-success', bg: 'bg-success/6', border: 'border-success/10' },
                { label: 'Expenses', value: totalExpenses, icon: ArrowDownRight, color: 'text-destructive', bg: 'bg-destructive/6', border: 'border-destructive/10' },
                { label: 'Pending', value: pendingAmount, icon: Clock, color: 'text-warning', bg: 'bg-warning/6', border: 'border-warning/10' },
              ].map(d => (
                <div key={d.label} className={`text-center p-3 rounded-xl ${d.bg} border ${d.border}`}>
                  <d.icon size={14} className={`${d.color} mx-auto mb-1.5`} />
                  <div className={`text-base font-bold ${d.color} tabular-nums`}>{fmt(d.value)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{d.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-auto p-4 rounded-xl bg-secondary/30 text-center border border-border/30">
              <div className="text-[10px] text-muted-foreground font-medium mb-1">Net Profit</div>
              <div className={`text-xl font-bold tabular-nums ${totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totalIncome - totalExpenses)}</div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Activity} title="Recent Activity" />
            <div className="flex-1 overflow-auto space-y-0.5">
              {[
                { text: 'Deployed SaaS Landing Page', time: '2h ago', emoji: '🚀' },
                { text: 'Completed SSL renewal', time: '5h ago', emoji: '✅' },
                { text: '3 commits to ai-mission-control', time: '8h ago', emoji: '🐙' },
                { text: 'New blog post draft added', time: '1d ago', emoji: '📝' },
                { text: 'WooCommerce v9.2 update', time: '1d ago', emoji: '🔌' },
                { text: 'Fixed responsive layout', time: '2d ago', emoji: '🔧' },
              ].map((a, ai) => (
                <motion.div key={ai} {...fadeUp(ai)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all">
                  <span className="text-sm flex-shrink-0">{a.emoji}</span>
                  <span className="text-[13px] text-foreground flex-1 truncate">{a.text}</span>
                  <span className="text-[11px] text-muted-foreground/50 flex-shrink-0 tabular-nums">{a.time}</span>
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
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-all group border border-transparent hover:border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    {link.title.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate block">{link.title}</span>
                    <span className="text-[10px] text-muted-foreground/50 truncate block">{link.category}</span>
                  </div>
                </motion.a>
              ))}
              {quickLinks.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground/50 text-sm">
                  <button onClick={() => setActiveSection('links')} className="text-primary hover:underline font-medium">Pin some links</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'platforms':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={BarChart3} title="Platforms" />
            <div className="grid grid-cols-2 gap-2 flex-1 content-start">
              {[
                { name: 'Cloudflare', section: 'cloudflare', ok: true, emoji: '☁️' },
                { name: 'Vercel', section: 'vercel', ok: true, emoji: '🚀' },
                { name: 'Google SC', section: 'seo', ok: false, emoji: '🔍' },
                { name: 'OpenClaw', section: 'openclaw', ok: true, emoji: '🐙' },
              ].map(p => (
                <button key={p.name} onClick={() => setActiveSection(p.section)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-all border border-transparent hover:border-border/50">
                  <span className="text-lg">{p.emoji}</span>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-semibold text-foreground">{p.name}</div>
                    <div className={`text-[10px] font-medium flex items-center gap-1 ${p.ok ? 'text-success' : 'text-warning'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${p.ok ? 'bg-success' : 'bg-warning'}`} />
                      {p.ok ? 'Operational' : 'Warning'}
                    </div>
                  </div>
                </button>
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
                <motion.div key={idea.id} {...fadeUp(ii)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all">
                  <span className="text-xs font-bold text-primary bg-primary/8 px-2 py-1 rounded-md tabular-nums">{idea.votes}↑</span>
                  <span className="text-[13px] text-foreground flex-1 truncate">{idea.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{idea.status}</span>
                </motion.div>
              ))}
              {topIdeas.length === 0 && <div className="text-center py-8 text-muted-foreground/50 text-sm">No active ideas</div>}
            </div>
          </div>
        );

      case 'notes-preview':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Pin} title="Pinned Notes" actionLabel="Notes" actionSection="notes" />
            <div className="flex-1 overflow-auto space-y-2">
              {pinnedNotes.map((note, ni) => (
                <motion.button key={note.id} {...fadeUp(ni)} onClick={() => setActiveSection('notes')}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary/40 transition-all border border-border/30 hover:border-border/60">
                  <div className="text-[13px] font-semibold text-foreground truncate">{note.title}</div>
                  <div className="text-[11px] text-muted-foreground/50 truncate mt-1">{note.content.slice(0, 80)}...</div>
                </motion.button>
              ))}
              {pinnedNotes.length === 0 && <div className="text-center py-8 text-muted-foreground/50 text-sm">No pinned notes</div>}
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className={`${widgetBase} p-6 flex flex-col justify-center`}>
            <Sparkles size={16} className="text-primary/40 mb-3" />
            <div className="text-sm font-medium text-foreground/80 italic leading-relaxed">"{quote.text}"</div>
            <div className="text-[11px] text-muted-foreground/40 mt-3 font-medium">— {quote.author}</div>
          </div>
        );

      case 'habits':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Flame} title="Habits" actionSection="habits" />
            <div className="flex-1 overflow-auto space-y-1">
              {habits.length > 0 ? habits.slice(0, 5).map((h, hi) => (
                <motion.div key={h.id} {...fadeUp(hi)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all">
                  <span className="text-base">{h.icon}</span>
                  <span className="text-[13px] text-foreground flex-1 truncate">{h.name}</span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-warning">
                    <Flame size={12} /> {h.streak}
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-10 text-muted-foreground/50 text-sm">
                  <p className="font-medium">No habits yet</p>
                  <button onClick={() => setActiveSection('habits')} className="text-primary hover:underline text-xs mt-1">Start tracking</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'websites-summary':
        return (
          <div className={`${widgetBase} p-5 flex flex-col`}>
            <WidgetHeader icon={Globe} title="My Websites" actionLabel="Manage" actionSection="websites" />
            <div className="flex-1 overflow-auto space-y-0.5">
              {websites.slice(0, 5).map((w, wi) => (
                <motion.div key={w.id} {...fadeUp(wi)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-all group">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${w.status === 'active' ? 'bg-success' : w.status === 'maintenance' ? 'bg-warning' : 'bg-destructive'}`} />
                  <span className="text-[13px] text-foreground flex-1 truncate">{w.name}</span>
                  <span className="text-[10px] text-muted-foreground/50 truncate max-w-[100px]">{w.category}</span>
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <ExternalLink size={13} className="text-primary" />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        );

      default:
        return <div className={`${widgetBase} p-5 flex items-center justify-center text-muted-foreground/40 text-sm`}>Widget: {widgetId}</div>;
    }
  };

  const visibleWidgets = widgetDefinitions.filter(w => visibility[w.id] !== false);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Welcome back, {userName}. Here's your overview.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status chips */}
          {completedToday > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/6 border border-success/10 text-success text-[11px] font-semibold">
              <Target size={11} /> {completedToday} done today
            </div>
          )}
          {overdueTasks > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/6 border border-destructive/10 text-destructive text-[11px] font-semibold">
              ⚠️ {overdueTasks} overdue
            </div>
          )}
          {/* Controls */}
          <button onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all border ${isLocked ? 'text-muted-foreground border-border/50 hover:bg-secondary' : 'text-primary bg-primary/6 border-primary/15'}`}>
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
            {isLocked ? 'Locked' : 'Editing'}
          </button>
          <button onClick={() => setConfigOpen(!configOpen)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary border border-border/50 font-medium">
            <Settings2 size={12} /> Widgets
          </button>
        </div>
      </motion.div>

      {/* Widget Configurator */}
      <AnimatePresence>
        {configOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Customize Dashboard</h3>
                <span className="text-[10px] text-muted-foreground font-medium">{visibleWidgets.length}/{widgetDefinitions.length} visible</span>
              </div>
              {['overview', 'productivity', 'business', 'platforms'].map(cat => (
                <div key={cat}>
                  <div className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2">{cat}</div>
                  <div className="flex flex-wrap gap-2">
                    {widgetDefinitions.filter(w => w.category === cat).map(w => (
                      <button key={w.id} onClick={() => toggleWidgetVisibility(w.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${visibility[w.id] !== false ? 'bg-primary/6 text-primary border-primary/15' : 'bg-secondary/40 text-muted-foreground/50 border-border/30 hover:text-muted-foreground'}`}>
                        {visibility[w.id] !== false ? <Eye size={11} /> : <EyeOff size={11} />}
                        {w.icon} {w.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
        margin={[12, 12]}
        containerPadding={[0, 0]}
        useCSSTransforms
      >
        {visibleWidgets.map((widget, i) => (
          <div key={widget.id} className="relative group">
            {!isLocked && (
              <div className="drag-handle absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-card/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity border border-border/30">
                <GripVertical size={12} className="text-muted-foreground/50" />
              </div>
            )}
            {renderWidget(widget.id, i)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
