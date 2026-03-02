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
  RotateCcw, ChevronDown, Plus, Users
} from 'lucide-react';
import {
  widgetDefinitions, getDefaultLayouts, loadSavedLayout, saveLayout,
  loadWidgetVisibility, saveWidgetVisibility,
} from '@/lib/widgetRegistry';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const priorityConfig: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/8', label: 'Critical', dot: 'bg-destructive' },
  high: { color: 'text-warning', bg: 'bg-warning/8', label: 'High', dot: 'bg-warning' },
  medium: { color: 'text-info', bg: 'bg-info/8', label: 'Medium', dot: 'bg-info' },
  low: { color: 'text-success', bg: 'bg-success/8', label: 'Low', dot: 'bg-success' },
};

// ─── Pill-shaped bar chart (Dribbble style) ─────────────────────────
function PillBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <div className="flex items-end gap-2 h-[120px]">
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1">
          <motion.div
            className="w-full min-h-[6px]"
            style={{ backgroundColor: color, opacity: 0.2 + (v / max) * 0.8, borderRadius: '999px' }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((v / max) * 100, 8)}%` }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className="text-[10px] text-muted-foreground font-medium">{days[i % 7]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Large progress ring (Dribbble style "41% Project Ended") ──────
function LargeProgressRing({ value, max, color, size = 120 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-border/30" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-foreground tracking-tight">{pct}%</span>
        <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Complete</span>
      </div>
    </div>
  );
}

// ─── Small progress ring for finance ────────────────────────────────
function SmallProgressRing({ value, max, color, size = 48 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-border/30" />
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

  const taskSparkline = useMemo(() => [3, 5, 4, 7, 6, 8, openTasks], [openTasks]);

  const stats = [
    { label: 'Total Projects', value: websites.length + buildProjects.length, sub: 'Increased from last month', change: '+5.4%', trend: 'up' as const, icon: Globe, section: 'websites', isHero: true },
    { label: 'Ended Projects', value: doneTasks, sub: 'Increased from last month', change: '+3.2%', trend: 'up' as const, icon: CheckSquare, section: 'tasks', isHero: false },
    { label: 'Running Projects', value: openTasks, sub: 'Increased from last month', change: '+8.1%', trend: 'up' as const, icon: TrendingUp, section: 'tasks', isHero: false },
    { label: 'Pending Projects', value: overdueTasks || payments.filter(p => p.status === 'pending').length || 2, sub: 'On Discuss', change: '', trend: 'up' as const, icon: Clock, section: 'payments', isHero: false },
  ];

  const todayTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => {
    const p: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (p[a.priority] || 3) - (p[b.priority] || 3);
  }).slice(0, 6);

  const upcomingDeadlines = tasks.filter(t => t.status !== 'done' && t.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  const pinnedNotes = notes.filter(n => n.pinned).slice(0, 3);
  const topIdeas = ideas.filter(i => i.status !== 'parked').sort((a, b) => b.votes - a.votes).slice(0, 4);
  const quickLinks = links.filter(l => l.pinned).slice(0, 6);
  const recentBuilds = buildProjects.sort((a, b) => b.lastWorkedOn.localeCompare(a.lastWorkedOn)).slice(0, 5);

  const quotes = [
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Ship fast, iterate faster.', author: 'Reid Hoffman' },
    { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
    { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
    { text: 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', author: 'Mark Zuckerberg' },
  ];
  const quote = quotes[new Date().getDate() % quotes.length];
  const statusColors: Record<string, string> = { 'todo': 'bg-muted-foreground/30', 'in-progress': 'bg-info', 'blocked': 'bg-destructive', 'done': 'bg-success' };

  // ─── Widget Header — SOTA ─────────────────────────────────────────
  const WidgetHeader = ({ icon: Icon, title, actionLabel, actionSection, rightContent }: any) => (
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-bold text-[15px] text-foreground tracking-tight">{title}</h3>
      <div className="flex items-center gap-2">
        {rightContent}
        {actionSection && (
          <button onClick={() => setActiveSection(actionSection)} className="text-[11px] text-muted-foreground hover:text-primary font-semibold transition-colors flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-secondary/50">
            {actionLabel || 'View All'} <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  );

  // ─── Widget Base — 24px radius SOTA ────────────────────────────────
  const widgetBase = 'h-full bg-card border border-border/30 overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:border-border/60';
  const widgetRadius = { borderRadius: '24px' };

  const renderWidget = (widgetId: string, i: number) => {
    switch (widgetId) {
      case 'stats':
        return (
          <div className={`${widgetBase} p-0`} style={widgetRadius}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 h-full">
              {stats.map((s, si) => (
                <motion.div key={s.label} {...fadeUp(si)}
                  className={`p-7 cursor-pointer group relative overflow-hidden transition-all duration-300
                    ${si < stats.length - 1 ? 'lg:border-r border-b lg:border-b-0 border-border/20' : ''}
                    ${s.isHero ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground' : 'hover:bg-secondary/20'}`}
                  style={si === 0 ? { borderRadius: '24px 0 0 24px' } : si === stats.length - 1 ? { borderRadius: '0 24px 24px 0' } : {}}
                  onClick={() => setActiveSection(s.section)}>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs font-semibold ${s.isHero ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{s.label}</span>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.isHero ? 'bg-primary-foreground/15' : 'bg-secondary/60'}`}>
                        <ArrowUpRight size={14} className={s.isHero ? 'text-primary-foreground' : 'text-muted-foreground/60'} />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <motion.div
                          className={`text-4xl font-extrabold tracking-tighter leading-none mb-2 ${s.isHero ? '' : 'text-foreground'}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: si * 0.1 }}
                        >
                          {s.value}
                        </motion.div>
                        <div className="flex items-center gap-2">
                          {s.change && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full
                              ${s.isHero ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-success/10 text-success'}`}>
                              {s.trend === 'up' ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                              {s.change}
                            </span>
                          )}
                          <span className={`text-[10px] ${s.isHero ? 'text-primary-foreground/60' : 'text-muted-foreground/50'}`}>{s.sub}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'tasks-focus':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <WidgetHeader icon={Zap} title="Today's Focus" actionSection="tasks"
              rightContent={
                <div className="flex items-center gap-1.5">
                  {dueToday > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/8 px-2.5 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                      {dueToday} due
                    </span>
                  )}
                  {completedToday > 0 && (
                    <span className="text-[10px] font-semibold text-success bg-success/8 px-2.5 py-1 rounded-full">{completedToday} done</span>
                  )}
                </div>
              }
            />
            {/* Task completion progress */}
            <div className="mb-5 px-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground font-medium">Completion</span>
                <span className="text-[11px] font-bold text-foreground">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto space-y-1">
              {todayTasks.map((task, ti) => {
                const pc = priorityConfig[task.priority] || priorityConfig.medium;
                return (
                  <motion.div key={task.id} {...fadeUp(ti)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-secondary/40 transition-all group cursor-pointer">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pc.dot} ring-2 ring-offset-2 ring-offset-card ${pc.bg}`} />
                    <span className="text-[13px] text-foreground flex-1 truncate font-medium">{task.title}</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${pc.bg} ${pc.color}`}>{pc.label}</span>
                    <span className={`text-[10px] font-mono flex-shrink-0 tabular-nums ${task.dueDate < today ? 'text-destructive font-bold' : 'text-muted-foreground/40'}`}>
                      {task.dueDate === today ? 'Today' : task.dueDate}
                    </span>
                  </motion.div>
                );
              })}
              {todayTasks.length === 0 && (
                <div className="text-center py-14 text-muted-foreground/40">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl mb-4">🎉</motion.div>
                  <p className="text-sm font-semibold text-foreground/60">All caught up!</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-1">No pending tasks</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'deadlines':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <WidgetHeader icon={Calendar} title="Reminders" actionLabel="Calendar" actionSection="calendar" />
            <div className="flex-1 overflow-auto space-y-1">
              {upcomingDeadlines.length > 0 && (
                <div className="mb-5 p-5 rounded-2xl bg-secondary/30 border border-border/20">
                  <h4 className="text-sm font-bold text-foreground mb-1">{upcomingDeadlines[0].title}</h4>
                  <p className="text-[11px] text-muted-foreground mb-4">
                    Time : {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(Date.now() + 7200000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => setActiveSection('calendar')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-[var(--shadow-primary)]"
                  >
                    <Calendar size={13} /> Start Meeting
                  </button>
                </div>
              )}
              {upcomingDeadlines.slice(1).map((task, ti) => {
                const daysLeft = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <motion.div key={task.id} {...fadeUp(ti)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-secondary/40 transition-all">
                    <div className="w-9 text-center">
                      <div className="text-[9px] text-muted-foreground/50 font-medium leading-none">{new Date(task.dueDate).toLocaleDateString('en', { month: 'short' })}</div>
                      <div className={`text-base font-bold leading-tight ${daysLeft <= 1 ? 'text-destructive' : daysLeft <= 3 ? 'text-warning' : 'text-foreground'}`}>{new Date(task.dueDate).getDate()}</div>
                    </div>
                    <div className="h-8 w-px bg-border/30" />
                    <span className="text-[13px] text-foreground flex-1 truncate font-medium">{task.title}</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${daysLeft <= 1 ? 'bg-destructive/8 text-destructive' : daysLeft <= 3 ? 'bg-warning/8 text-warning' : 'bg-secondary text-muted-foreground'}`}>
                      {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                    </span>
                  </motion.div>
                );
              })}
              {upcomingDeadlines.length === 0 && <div className="text-center py-14 text-muted-foreground/40 text-sm font-medium">No upcoming deadlines 🌟</div>}
            </div>
          </div>
        );

      case 'finance':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <WidgetHeader icon={DollarSign} title="Finance Overview" actionLabel="Details" actionSection="payments" />
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Income', value: totalIncome, icon: ArrowUpRight, textColor: 'text-success', bgColor: 'bg-success/6' },
                { label: 'Expenses', value: totalExpenses, icon: ArrowDownRight, textColor: 'text-destructive', bgColor: 'bg-destructive/6' },
                { label: 'Pending', value: pendingAmount, icon: Clock, textColor: 'text-warning', bgColor: 'bg-warning/6' },
              ].map(d => (
                <motion.div key={d.label} whileHover={{ y: -2 }} className={`text-center p-4 rounded-2xl ${d.bgColor} border border-border/15 transition-all cursor-default`}>
                  <d.icon size={14} className={`${d.textColor} mx-auto mb-2.5 opacity-60`} />
                  <div className={`text-lg font-extrabold ${d.textColor} tabular-nums leading-tight`}>{fmt(d.value)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5 font-medium">{d.label}</div>
                </motion.div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-secondary/30 to-secondary/15 border border-border/15">
              <div className="relative flex items-center justify-center">
                <SmallProgressRing value={totalIncome} max={totalIncome + totalExpenses} color="hsl(var(--success))" />
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
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[15px] text-foreground tracking-tight">Project Analytics</h3>
            </div>
            <PillBars data={taskSparkline} color="hsl(var(--primary))" />
          </div>
        );

      case 'quick-links':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[15px] text-foreground tracking-tight">Project</h3>
              <button onClick={() => setActiveSection('builds')} className="text-[11px] text-primary font-semibold px-3 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/5 transition-all flex items-center gap-1">
                <Plus size={11} /> New
              </button>
            </div>
            <div className="flex-1 overflow-auto space-y-1.5">
              {recentBuilds.map((build, bi) => {
                const statusColor = build.status === 'deployed' ? 'text-success' : build.status === 'building' ? 'text-info' : 'text-warning';
                const icons = ['🔧', '🚀', '📦', '⚡', '🎯'];
                return (
                  <motion.div key={build.id} {...fadeUp(bi)} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-secondary/40 transition-all cursor-pointer">
                    <div className="w-9 h-9 rounded-xl bg-secondary/60 flex items-center justify-center text-base">
                      {icons[bi % icons.length]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] text-foreground font-semibold truncate block">{build.name}</span>
                      <span className="text-[10px] text-muted-foreground/50">Due date: {build.lastWorkedOn}</span>
                    </div>
                  </motion.div>
                );
              })}
              {recentBuilds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground/40 text-sm">
                  <button onClick={() => setActiveSection('builds')} className="text-primary hover:underline font-medium text-xs">Add a project</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'platforms':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[15px] text-foreground tracking-tight">Team Collaboration</h3>
              <button onClick={() => setActiveSection('settings')} className="text-[11px] text-muted-foreground font-semibold px-3 py-1.5 rounded-xl border border-border/30 hover:bg-secondary/50 transition-all flex items-center gap-1">
                <Plus size={11} /> Add Member
              </button>
            </div>
            <div className="flex-1 overflow-auto space-y-1">
              {[
                { name: 'Alexandra Deff', task: 'Github Project Repository', status: 'Completed', statusColor: 'text-success bg-success/8' },
                { name: 'Edwin Adenike', task: 'Integrate User Authentication', status: 'In Progress', statusColor: 'text-info bg-info/8' },
                { name: 'Isaac Oluwatemilorun', task: 'Develop Search and Filter', status: 'Pending', statusColor: 'text-warning bg-warning/8' },
                { name: 'David Oshodi', task: 'Responsive Layout for Homepage', status: 'In Progress', statusColor: 'text-info bg-info/8' },
              ].map((member, mi) => (
                <motion.div key={mi} {...fadeUp(mi)} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-secondary/40 transition-all">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold flex-shrink-0 shadow-sm">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-foreground font-semibold block truncate">{member.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 truncate block">Working on <strong className="text-foreground/70">{member.task}</strong></span>
                  </div>
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-semibold ${member.statusColor}`}>{member.status}</span>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'ideas':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[15px] text-foreground tracking-tight">Project Progress</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <LargeProgressRing value={doneTasks} max={totalTasks || 1} color="hsl(var(--primary))" />
              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground font-medium">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-info" />
                  <span className="text-[10px] text-muted-foreground font-medium">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                  <span className="text-[10px] text-muted-foreground font-medium">Pending</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notes-preview':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <WidgetHeader icon={Pin} title="Pinned Notes" actionLabel="Notes" actionSection="notes" />
            <div className="flex-1 overflow-auto space-y-2.5">
              {pinnedNotes.map((note, ni) => {
                const colors = ['from-primary/5 to-transparent', 'from-warning/5 to-transparent', 'from-info/5 to-transparent'];
                return (
                  <motion.button key={note.id} {...fadeUp(ni)} onClick={() => setActiveSection('notes')} whileHover={{ scale: 1.01 }}
                    className={`w-full text-left p-4 rounded-2xl bg-gradient-to-r ${colors[ni % colors.length]} border border-border/15 hover:border-border/40 transition-all`}>
                    <div className="text-[12px] font-semibold text-foreground truncate">{note.title}</div>
                    <div className="text-[10px] text-muted-foreground/40 line-clamp-2 mt-1.5 leading-relaxed">{note.content.slice(0, 100)}</div>
                  </motion.button>
                );
              })}
              {pinnedNotes.length === 0 && <div className="text-center py-10 text-muted-foreground/40 text-sm">No pinned notes</div>}
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className="h-full overflow-hidden transition-all duration-300" style={{ borderRadius: '24px', background: 'hsl(220 25% 12%)', color: 'hsl(210 15% 95%)' }}>
            <div className="p-7 h-full flex flex-col justify-between relative overflow-hidden">
              {/* Decorative gradient orbs */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-info/10 blur-2xl" />
              <div className="relative z-10">
                <div className="text-[11px] font-semibold text-primary mb-4 uppercase tracking-wider">Time Tracker</div>
                <div className="text-4xl font-extrabold tracking-tight tabular-nums text-white">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-3 mt-6">
                <button className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5" />
                </button>
                <button className="w-10 h-10 rounded-2xl bg-destructive/80 hover:bg-destructive flex items-center justify-center transition-all">
                  <div className="w-3 h-3 rounded-sm bg-white" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'habits':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <WidgetHeader icon={Flame} title="Habit Tracker" actionSection="habits" />
            <div className="flex-1 overflow-auto space-y-1">
              {habits.length > 0 ? habits.slice(0, 5).map((h, hi) => (
                <motion.div key={h.id} {...fadeUp(hi)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-secondary/40 transition-all">
                  <span className="text-lg">{h.icon}</span>
                  <span className="text-[12px] text-foreground flex-1 truncate font-medium">{h.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Flame size={12} className="text-warning" />
                    <span className="text-[11px] font-bold text-warning tabular-nums">{h.streak}</span>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-14 text-muted-foreground/40 text-sm">
                  <p className="font-medium text-foreground/50">No habits yet</p>
                  <button onClick={() => setActiveSection('habits')} className="text-primary hover:underline text-xs mt-1">Start tracking</button>
                </div>
              )}
            </div>
          </div>
        );

      case 'websites-summary':
        return (
          <div className={`${widgetBase} p-7 flex flex-col`} style={widgetRadius}>
            <WidgetHeader icon={Globe} title="Websites" actionLabel="Manage" actionSection="websites"
              rightContent={
                <span className="text-[10px] font-semibold text-success bg-success/8 px-2.5 py-1 rounded-full">{activeSites} live</span>
              }
            />
            <div className="flex-1 overflow-auto space-y-1">
              {websites.slice(0, 5).map((w, wi) => (
                <motion.div key={w.id} {...fadeUp(wi)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-secondary/40 transition-all group cursor-pointer">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${w.status === 'active' ? 'bg-success' : w.status === 'maintenance' ? 'bg-warning' : 'bg-destructive'} ring-2 ring-offset-2 ring-offset-card ${w.status === 'active' ? 'ring-success/20' : w.status === 'maintenance' ? 'ring-warning/20' : 'ring-destructive/20'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-foreground truncate block font-semibold">{w.name}</span>
                    <span className="text-[10px] text-muted-foreground/40">{w.hostingProvider || w.category}</span>
                  </div>
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-xl hover:bg-secondary" onClick={e => e.stopPropagation()}>
                    <ExternalLink size={12} className="text-primary" />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        );

      default:
        return <div className={`${widgetBase} p-7 flex items-center justify-center text-muted-foreground/30 text-sm`} style={widgetRadius}>Widget: {widgetId}</div>;
    }
  };

  const visibleWidgets = widgetDefinitions.filter(w => visibility[w.id] !== false);
  const categories = ['all', 'overview', 'productivity', 'business', 'platforms'] as const;
  const filteredWidgetDefs = configTab === 'all' ? widgetDefinitions : widgetDefinitions.filter(w => w.category === configTab);

  return (
    <div className="space-y-6">
      {/* Page Header — Dribbble style */}
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-[14px] text-muted-foreground/50 mt-1">Plan, prioritize, and accomplish your tasks with ease.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {completedToday > 0 && (
            <motion.div {...fadeUp(1)} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-success/6 border border-success/15 text-success text-[11px] font-semibold shadow-sm">
              <Target size={12} /> {completedToday} completed today
            </motion.div>
          )}
          {overdueTasks > 0 && (
            <motion.div {...fadeUp(2)} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-destructive/6 border border-destructive/15 text-destructive text-[11px] font-semibold shadow-sm animate-pulse">
              ⚠️ {overdueTasks} overdue
            </motion.div>
          )}
          <div className="h-6 w-px bg-border/30 hidden sm:block" />
          <motion.button {...fadeUp(3)} onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-4 py-2 rounded-2xl transition-all border shadow-sm ${isLocked ? 'text-muted-foreground border-border/40 bg-card hover:bg-secondary' : 'text-primary bg-primary/6 border-primary/20'}`}>
            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
            {isLocked ? 'Locked' : 'Editing'}
          </motion.button>
          <motion.button {...fadeUp(4)} onClick={() => setConfigOpen(!configOpen)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-4 py-2 rounded-2xl transition-all border shadow-sm ${configOpen ? 'text-primary bg-primary/6 border-primary/20' : 'text-muted-foreground border-border/40 bg-card hover:bg-secondary'}`}>
            <LayoutGrid size={13} /> Customize
            <ChevronDown size={10} className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* ─── Widget Configurator ──────────────────────────────────────── */}
      <AnimatePresence>
        {configOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border border-border/40 bg-card overflow-hidden" style={{ borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center justify-between px-7 py-5 border-b border-border/20 bg-gradient-to-r from-secondary/15 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/12 to-accent/8 flex items-center justify-center">
                    <LayoutGrid size={17} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Customize Dashboard</h3>
                    <p className="text-[10px] text-muted-foreground/45">Toggle widgets, reset layout, manage your view</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-xl">{visibleWidgets.length}/{widgetDefinitions.length} active</span>
                  <button onClick={() => setConfigOpen(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                    <X size={14} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-7 pt-5 pb-3 overflow-x-auto hide-scrollbar">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setConfigTab(cat)}
                    className={`px-4 py-2 rounded-2xl text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${configTab === cat ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                    {cat === 'all' ? 'All Widgets' : cat}
                  </button>
                ))}
              </div>
              <div className="px-7 py-4 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {filteredWidgetDefs.map(w => {
                    const isVisible = visibility[w.id] !== false;
                    return (
                      <motion.button key={w.id} onClick={() => toggleWidgetVisibility(w.id)}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        className={`flex items-center gap-3 p-4 rounded-2xl text-left transition-all border ${isVisible
                          ? 'bg-primary/5 border-primary/15 shadow-sm'
                          : 'bg-secondary/15 border-border/15 hover:border-border/35 opacity-60 hover:opacity-80'
                          }`}>
                        <span className="text-base">{w.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-foreground truncate">{w.title}</div>
                          <div className="text-[9px] text-muted-foreground/40 truncate">{w.description}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isVisible ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {isVisible ? <Eye size={11} /> : <EyeOff size={11} className="text-muted-foreground/40" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between px-7 py-4 border-t border-border/20 bg-secondary/5">
                <div className="flex items-center gap-2.5">
                  <button onClick={showAll} className="text-[10px] font-semibold text-primary hover:underline">Show All</button>
                  <span className="text-muted-foreground/15">·</span>
                  <button onClick={hideAll} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Hide All</button>
                </div>
                <button onClick={resetLayout} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-secondary">
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
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms
      >
        {visibleWidgets.map((widget, i) => (
          <div key={widget.id} className="relative group">
            {!isLocked && (
              <div className="drag-handle absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing p-2 rounded-xl bg-card/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all border border-border/25 shadow-sm">
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
