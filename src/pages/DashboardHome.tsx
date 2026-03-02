import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useCallback, useMemo, useEffect } from 'react';
import * as RGL from 'react-grid-layout';
// @ts-ignore
const Responsive = RGL.Responsive || RGL.default?.Responsive;
// @ts-ignore
const WidthProvider = RGL.WidthProvider || RGL.default?.WidthProvider;
const ResponsiveGridLayout = WidthProvider(Responsive);

import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Github, CheckSquare, Clock, Zap, Calendar, FileText, Target,
  DollarSign, Lightbulb, Eye, EyeOff, ArrowUpRight, ArrowDownRight,
  Pin, Lock, Unlock, ExternalLink, Activity, GripVertical, Flame,
  ChevronRight, BarChart3, ArrowUp, ArrowDown, X, LayoutGrid,
  RotateCcw, ChevronDown, Plus, TrendingUp, Sparkles, Users,
} from 'lucide-react';
import {
  widgetDefinitions, getDefaultLayouts, loadSavedLayout, saveLayout,
  loadWidgetVisibility, saveWidgetVisibility,
} from '@/lib/widgetRegistry';
import 'react-grid-layout/css/styles.css';

const fu = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] as any },
});

const pc: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/8', label: 'Critical', dot: 'bg-destructive' },
  high: { color: 'text-warning', bg: 'bg-warning/8', label: 'High', dot: 'bg-warning' },
  medium: { color: 'text-info', bg: 'bg-info/8', label: 'Medium', dot: 'bg-info' },
  low: { color: 'text-success', bg: 'bg-success/8', label: 'Low', dot: 'bg-success' },
};

/* ── Pill bar chart ─────────────────────────────────────── */
function PillChart({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <div className="flex items-end gap-2 w-full" style={{ height: 110 }}>
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
          <motion.div
            style={{ background: color, borderRadius: 99, opacity: 0.25 + (v / max) * 0.75 }}
            className="w-full"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((v / max) * 100, 6)}%` }}
            transition={{ duration: 0.65, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className="text-[10px] text-muted-foreground/50 font-medium">{labels[i % 7]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut ring ─────────────────────────────────────────── */
function DonutRing({ pct, color, size = 110, strokeWidth = 9 }: { pct: number; color: string; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-border/25" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1.2, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-foreground tracking-tight">{Math.round(pct)}%</span>
        <span className="text-[9px] text-muted-foreground/60 font-medium mt-0.5">Done</span>
      </div>
    </div>
  );
}

/* ── Mini calendar ──────────────────────────────────────── */
function MiniCalendar({ tasks }: { tasks: any[] }) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const taskDays = new Set(tasks.map(t => { const d = new Date(t.dueDate); return d.getFullYear() === year && d.getMonth() === month ? d.getDate() : null; }).filter(Boolean));
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-foreground">{months[month]} {year}</span>
        <span className="text-[10px] text-muted-foreground/50 font-medium">{taskDays.size} tasks</span>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[9px] text-center text-muted-foreground/40 font-semibold py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className={`text-[10px] text-center py-1 rounded-lg font-medium transition-all
            ${!d ? '' : d === today ? 'bg-primary text-primary-foreground shadow-[var(--shadow-primary)]'
              : taskDays.has(d) ? 'bg-primary/10 text-primary font-bold'
                : 'text-foreground/70 hover:bg-secondary/50 cursor-pointer'}`}>
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Widget header ──────────────────────────────────────── */
function WH({ title, action, actionFn, right }: { title: string; action?: string; actionFn?: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="font-bold text-[14px] text-foreground tracking-tight">{title}</h3>
      <div className="flex items-center gap-2">
        {right}
        {action && actionFn && (
          <button onClick={actionFn} className="text-[10px] text-muted-foreground/50 hover:text-primary font-semibold flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl hover:bg-secondary/50 transition-all">
            {action} <ChevronRight size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { websites, repos, buildProjects, tasks, links, notes, payments, ideas, habits } = useDashboard();
  const { setActiveSection } = useNavigationStore();
  const { userName } = useSettingsStore();

  const [layouts, setLayouts] = useState(() => loadSavedLayout() || {
    lg: getDefaultLayouts(12), md: getDefaultLayouts(10),
    sm: getDefaultLayouts(6), xs: getDefaultLayouts(4),
  });
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => loadWidgetVisibility());
  const [configOpen, setConfigOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [configTab, setConfigTab] = useState('all');
  const [clock, setClock] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  const handleLayoutChange = useCallback((_: any, all: any) => { setLayouts(all); saveLayout(all); }, []);
  const toggleWidget = (id: string) => { const n = { ...visibility, [id]: !visibility[id] }; setVisibility(n); saveWidgetVisibility(n); };

  /* ── Computed data ── */
  const today = new Date().toISOString().split('T')[0];
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const openTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const dueToday = tasks.filter(t => t.dueDate === today && t.status !== 'done').length;
  const overdue = tasks.filter(t => t.dueDate < today && t.status !== 'done').length;
  const completedToday = tasks.filter(t => t.completedAt === today).length;
  const income = payments.filter(p => p.type === 'income' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const expense = payments.filter(p => (p.type === 'expense' || p.type === 'subscription') && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const taskBar = useMemo(() => [3, 5, 4, 7, 6, 8, openTasks.length], [openTasks.length]);
  const activeSites = websites.filter(w => w.status === 'active').length;
  const pct = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  const upcoming = tasks.filter(t => t.status !== 'done' && t.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  const topTasks = [...openTasks].sort((a, b) => { const p: any = { critical: 0, high: 1, medium: 2, low: 3 }; return (p[a.priority] || 3) - (p[b.priority] || 3); }).slice(0, 7);
  const pinnedNotes = notes.filter(n => n.pinned).slice(0, 4);
  const topIdeas = ideas.filter(i => i.status !== 'parked').sort((a, b) => b.votes - a.votes).slice(0, 4);
  const recentBuilds = [...buildProjects].sort((a, b) => b.lastWorkedOn.localeCompare(a.lastWorkedOn)).slice(0, 5);

  /* ── Widget base style ── */
  const wb = 'h-full bg-card border border-border/25 overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:border-border/50';
  const wr = { borderRadius: 24 };

  const renderWidget = (id: string) => {
    switch (id) {

      /* ── STATS ROW ── */
      case 'stats': {
        const stats = [
          { label: 'Total Projects', value: websites.length + buildProjects.length, change: '+5.4%', sub: 'From last month', icon: BarChart3, isHero: true },
          { label: 'Completed Tasks', value: doneTasks.length, change: '+3.2%', sub: 'Increased', icon: CheckSquare, isHero: false },
          { label: 'Running Tasks', value: openTasks.length, change: overdue > 0 ? `${overdue} overdue` : 'On track', sub: 'Active now', icon: TrendingUp, isHero: false },
          { label: 'Net Revenue', value: fmt(income - expense), change: income >= expense ? '+12.8%' : '-', sub: 'This period', icon: DollarSign, isHero: false },
        ];
        return (
          <div className={`${wb} p-0`} style={wr}>
            <div className="grid grid-cols-2 lg:grid-cols-4 h-full">
              {stats.map((s, i) => (
                <motion.div key={s.label} {...fu(i)}
                  className={`p-6 relative overflow-hidden cursor-pointer transition-all duration-300
                    ${i < stats.length - 1 ? 'border-r border-border/20' : ''}
                    ${s.isHero ? 'bg-gradient-to-br from-primary to-primary/85' : 'hover:bg-secondary/15'}`}
                  style={i === 0 ? { borderRadius: '24px 0 0 24px' } : i === stats.length - 1 ? { borderRadius: '0 24px 24px 0' } : {}}
                  onClick={() => setActiveSection(i === 0 ? 'websites' : i === 1 ? 'tasks' : i === 2 ? 'tasks' : 'payments')}>
                  {s.isHero && <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`text-xs font-semibold ${s.isHero ? 'text-white/70' : 'text-muted-foreground/60'}`}>{s.label}</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.isHero ? 'bg-white/15' : 'bg-secondary/60'}`}>
                      <ArrowUpRight size={14} className={s.isHero ? 'text-white' : 'text-muted-foreground/50'} />
                    </div>
                  </div>
                  <motion.div className={`text-3xl xl:text-4xl font-extrabold tracking-tighter leading-none mb-2.5 ${s.isHero ? 'text-white' : 'text-foreground'}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: i * 0.1 }}>
                    {s.value}
                  </motion.div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full
                      ${s.isHero ? 'bg-white/20 text-white' : 'bg-success/10 text-success'}`}>
                      <ArrowUp size={8} />{s.change}
                    </span>
                    <span className={`text-[10px] ${s.isHero ? 'text-white/55' : 'text-muted-foreground/45'}`}>{s.sub}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      }

      /* ── ANALYTICS CHART ── */
      case 'activity':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Project Analytics" action="View All" actionFn={() => setActiveSection('tasks')}
              right={<span className="text-[10px] text-muted-foreground/40 font-medium">Last 7 days</span>} />
            <div className="flex items-end justify-between mb-4 gap-4">
              {[
                { label: 'Completed', value: doneTasks.length, color: 'text-success', bg: 'bg-success/10' },
                { label: 'In Progress', value: openTasks.filter(t => t.status === 'in-progress').length, color: 'text-info', bg: 'bg-info/10' },
                { label: 'Overdue', value: overdue, color: 'text-destructive', bg: 'bg-destructive/10' },
              ].map(m => (
                <div key={m.label} className={`flex-1 p-3 rounded-2xl ${m.bg} text-center`}>
                  <div className={`text-xl font-extrabold ${m.color}`}>{m.value}</div>
                  <div className="text-[9px] text-muted-foreground/60 font-medium mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 flex items-end">
              <PillChart data={taskBar} color="hsl(var(--primary))" />
            </div>
          </div>
        );

      /* ── TIME TRACKER / QUOTE ── */
      case 'quote':
        return (
          <div className="h-full overflow-hidden flex flex-col" style={{ borderRadius: 24, background: 'hsl(220 25% 11%)', color: 'white' }}>
            <div className="flex-1 p-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-info/8 blur-2xl pointer-events-none" />
              <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-3">Time Tracker</div>
              <div className="text-4xl xl:text-5xl font-extrabold tracking-tighter tabular-nums text-white mb-1">
                {clock.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div className="text-[11px] text-white/40 mb-5">
                {clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-6">
                {completedToday > 0 && <span className="text-[10px] bg-success/20 text-success px-2.5 py-1 rounded-full font-semibold">{completedToday} done today</span>}
                {dueToday > 0 && <span className="text-[10px] bg-warning/20 text-warning px-2.5 py-1 rounded-full font-semibold">{dueToday} due today</span>}
              </div>
              <div className="mt-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-white/40">Daily progress</span>
                  <span className="text-[10px] text-white/70 font-bold ml-auto">{Math.round(pct)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                </div>
              </div>
            </div>
            <div className="border-t border-white/8 px-6 py-4 flex items-center gap-3">
              <button className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all">
                <div className="w-0 h-0 border-l-[7px] border-l-white border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
              </button>
              <button className="w-10 h-10 rounded-2xl bg-destructive/70 hover:bg-destructive flex items-center justify-center transition-all">
                <div className="w-3.5 h-3.5 rounded-sm bg-white" />
              </button>
              <div className="flex-1 ml-1">
                <div className="text-[11px] text-white/60">Current session</div>
                <div className="text-[13px] font-bold text-white">Focus Mode</div>
              </div>
            </div>
          </div>
        );

      /* ── TODAY'S FOCUS ── */
      case 'tasks-focus':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Today's Focus" action="All Tasks" actionFn={() => setActiveSection('tasks')}
              right={
                <div className="flex gap-1.5">
                  {dueToday > 0 && <span className="text-[10px] text-destructive bg-destructive/8 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse inline-block" />{dueToday} due</span>}
                  {completedToday > 0 && <span className="text-[10px] text-success bg-success/8 px-2.5 py-1 rounded-full font-semibold">{completedToday} done</span>}
                </div>
              } />
            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground/60 font-medium">Completion</span>
                <span className="text-[10px] font-bold text-foreground">{Math.round(pct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {topTasks.map((t, i) => {
                const cfg = pc[t.priority] || pc.medium;
                return (
                  <motion.div key={t.id} {...fu(i)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/40 transition-all cursor-pointer group">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className="text-[12px] text-foreground flex-1 truncate font-medium">{t.title}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.color} flex-shrink-0`}>{cfg.label}</span>
                    <span className={`text-[9px] font-mono flex-shrink-0 tabular-nums ${t.dueDate < today ? 'text-destructive font-bold' : 'text-muted-foreground/35'}`}>
                      {t.dueDate === today ? 'Today' : t.dueDate.slice(5)}
                    </span>
                  </motion.div>
                );
              })}
              {topTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-sm font-semibold text-foreground/60">All caught up!</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5">No pending tasks</p>
                </div>
              )}
            </div>
          </div>
        );

      /* ── REMINDERS / DEADLINES ── */
      case 'deadlines':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Reminders" action="Calendar" actionFn={() => setActiveSection('calendar')} />
            {upcoming[0] && (
              <div className="mb-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="text-[10px] text-primary font-bold uppercase tracking-wide mb-1">Next Up</div>
                <div className="text-[13px] font-bold text-foreground truncate mb-1">{upcoming[0].title}</div>
                <div className="text-[10px] text-muted-foreground/50 mb-3">{upcoming[0].dueDate}</div>
                <button onClick={() => setActiveSection('calendar')} className="text-[11px] bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition-all shadow-[var(--shadow-primary)] flex items-center gap-1.5">
                  <Calendar size={11} /> View Calendar
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {upcoming.slice(1).map((t, i) => {
                const days = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <motion.div key={t.id} {...fu(i)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/40 transition-all">
                    <div className="w-9 text-center flex-shrink-0">
                      <div className="text-[9px] text-muted-foreground/40 font-medium leading-none">{new Date(t.dueDate).toLocaleDateString('en', { month: 'short' })}</div>
                      <div className={`text-sm font-extrabold leading-tight ${days <= 1 ? 'text-destructive' : days <= 3 ? 'text-warning' : 'text-foreground'}`}>{new Date(t.dueDate).getDate()}</div>
                    </div>
                    <div className="w-px h-7 bg-border/30 flex-shrink-0" />
                    <span className="text-[12px] text-foreground flex-1 truncate font-medium">{t.title}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${days <= 1 ? 'bg-destructive/8 text-destructive' : days <= 3 ? 'bg-warning/8 text-warning' : 'bg-secondary text-muted-foreground'}`}>
                      {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                    </span>
                  </motion.div>
                );
              })}
              {upcoming.length === 0 && <div className="py-10 text-center text-muted-foreground/40 text-sm">No upcoming deadlines 🌟</div>}
            </div>
          </div>
        );

      /* ── HABITS ── */
      case 'habits':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Habits" action="Track" actionFn={() => setActiveSection('habits')} />
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {habits.length > 0 ? habits.slice(0, 7).map((h, i) => {
                const done = h.completions?.includes(today);
                return (
                  <motion.div key={h.id} {...fu(i)} className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${done ? 'bg-success/6 border border-success/15' : 'hover:bg-secondary/40 border border-transparent'}`}>
                    <span className="text-base">{h.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-foreground truncate">{h.name}</div>
                      <div className="text-[10px] text-muted-foreground/50">{h.frequency}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame size={11} className="text-warning" />
                      <span className="text-[11px] font-extrabold text-warning tabular-nums">{h.streak}</span>
                    </div>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${done ? 'bg-success text-white' : 'bg-secondary text-muted-foreground/30'}`}>
                      {done && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="py-10 text-center">
                  <div className="text-3xl mb-2">🔥</div>
                  <p className="text-[12px] text-muted-foreground/50 font-medium mb-2">No habits yet</p>
                  <button onClick={() => setActiveSection('habits')} className="text-[11px] text-primary font-semibold hover:underline">Start tracking →</button>
                </div>
              )}
            </div>
          </div>
        );

      /* ── MINI CALENDAR ── */
      case 'calendar-mini':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Calendar" action="Full View" actionFn={() => setActiveSection('calendar')} />
            <MiniCalendar tasks={tasks.filter(t => t.status !== 'done')} />
            <div className="mt-4 space-y-1.5">
              {tasks.filter(t => t.dueDate === today && t.status !== 'done').slice(0, 2).map(t => (
                <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-[11px] text-foreground font-medium truncate">{t.title}</span>
                  <span className="text-[9px] text-primary font-bold ml-auto">Today</span>
                </div>
              ))}
            </div>
          </div>
        );

      /* ── FINANCE ── */
      case 'finance':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Finance" action="Details" actionFn={() => setActiveSection('payments')} />
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { label: 'Income', value: income, icon: ArrowUpRight, c: 'text-success', bg: 'bg-success/7' },
                { label: 'Expenses', value: expense, icon: ArrowDownRight, c: 'text-destructive', bg: 'bg-destructive/7' },
                { label: 'Pending', value: pending, icon: Clock, c: 'text-warning', bg: 'bg-warning/7' },
              ].map(d => (
                <motion.div key={d.label} whileHover={{ y: -2 }} className={`text-center p-3.5 rounded-2xl ${d.bg} border border-border/10 cursor-default`}>
                  <d.icon size={13} className={`${d.c} mx-auto mb-2 opacity-60`} />
                  <div className={`text-sm font-extrabold ${d.c} tabular-nums`}>{fmt(d.value)}</div>
                  <div className="text-[9px] text-muted-foreground/50 mt-1 font-medium">{d.label}</div>
                </motion.div>
              ))}
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-border/15 mt-auto">
              <DonutRing pct={income + expense > 0 ? (income / (income + expense)) * 100 : 0} color="hsl(var(--success))" size={64} strokeWidth={7} />
              <div>
                <div className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Net Profit</div>
                <div className={`text-xl font-extrabold tabular-nums ${income - expense >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(income - expense)}</div>
                <div className="text-[10px] text-muted-foreground/40 mt-0.5">{payments.length} total transactions</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {payments.filter(p => p.status === 'overdue').slice(0, 2).map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/5 border border-destructive/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                  <span className="text-[11px] text-foreground font-medium flex-1 truncate">{p.title}</span>
                  <span className="text-[10px] text-destructive font-bold">{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      /* ── PROGRESS / IDEAS ── */
      case 'ideas':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Progress" action="View" actionFn={() => setActiveSection('ideas')} />
            <div className="flex items-center justify-center my-3">
              <DonutRing pct={pct} color="hsl(var(--primary))" size={120} strokeWidth={10} />
            </div>
            <div className="flex justify-center gap-5 mb-4">
              {[{ label: 'Done', value: doneTasks.length, color: 'bg-primary' }, { label: 'Active', value: openTasks.filter(t => t.status === 'in-progress').length, color: 'bg-info' }, { label: 'Pending', value: openTasks.filter(t => t.status === 'todo').length, color: 'bg-warning' }].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground/60 font-medium">{s.label} <strong className="text-foreground">{s.value}</strong></span>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {topIdeas.map((idea, i) => (
                <motion.div key={idea.id} {...fu(i)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-secondary/40 transition-all">
                  <span className="text-sm font-extrabold text-primary bg-primary/8 w-8 h-8 rounded-xl flex items-center justify-center tabular-nums flex-shrink-0">{idea.votes}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-foreground truncate">{idea.title}</div>
                    <div className="text-[9px] text-muted-foreground/40">{idea.category}</div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize ${idea.status === 'validated' ? 'bg-success/8 text-success' : idea.status === 'exploring' ? 'bg-info/8 text-info' : 'bg-secondary text-muted-foreground'}`}>{idea.status}</span>
                </motion.div>
              ))}
              {topIdeas.length === 0 && <div className="py-6 text-center text-[12px] text-muted-foreground/40">No active ideas</div>}
            </div>
          </div>
        );

      /* ── NOTES ── */
      case 'notes-preview':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Pinned Notes" action="Notes" actionFn={() => setActiveSection('notes')}
              right={<button onClick={() => setActiveSection('notes')} className="w-7 h-7 rounded-xl bg-secondary/60 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all"><Plus size={12} /></button>} />
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {pinnedNotes.map((note, i) => {
                const accents = ['border-primary/20 bg-primary/3', 'border-warning/20 bg-warning/3', 'border-info/20 bg-info/3', 'border-success/20 bg-success/3'];
                const dots = ['bg-primary', 'bg-warning', 'bg-info', 'bg-success'];
                return (
                  <motion.button key={note.id} {...fu(i)} onClick={() => setActiveSection('notes')} whileHover={{ scale: 1.01 }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-sm ${accents[i % accents.length]}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-2 h-2 rounded-full ${dots[i % dots.length]}`} />
                      <div className="text-[12px] font-bold text-foreground truncate">{note.title}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground/50 line-clamp-2 leading-relaxed ml-4">{note.content.slice(0, 90)}</div>
                    <div className="text-[9px] text-muted-foreground/30 mt-1.5 ml-4">{new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </motion.button>
                );
              })}
              {pinnedNotes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <FileText size={28} className="text-muted-foreground/20 mb-3" />
                  <p className="text-[12px] text-muted-foreground/50 font-medium mb-2">No pinned notes</p>
                  <button onClick={() => setActiveSection('notes')} className="text-[11px] text-primary font-semibold hover:underline">Create a note →</button>
                </div>
              )}
            </div>
          </div>
        );

      /* ── TEAM / PLATFORMS ── */
      case 'platforms':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Team & Status" action="Platforms" actionFn={() => setActiveSection('cloudflare')}
              right={<button onClick={() => setActiveSection('settings')} className="text-[10px] text-primary font-semibold px-2.5 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/5 transition-all flex items-center gap-1"><Plus size={10} />Add</button>} />
            <div className="space-y-1.5 mb-4">
              {[
                { name: 'Cloudflare', ok: true, emoji: '☁️', section: 'cloudflare', uptime: '99.9%' },
                { name: 'Vercel', ok: true, emoji: '⚡', section: 'vercel', uptime: '99.8%' },
                { name: 'GitHub', ok: true, emoji: '🐙', section: 'github', uptime: '99.9%' },
                { name: 'OpenClaw', ok: true, emoji: '🐾', section: 'openclaw', uptime: '100%' },
              ].map(p => (
                <motion.button key={p.name} onClick={() => setActiveSection(p.section)} whileHover={{ x: 2 }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-border/20">
                  <span className="text-base">{p.emoji}</span>
                  <div className="text-left flex-1">
                    <div className="text-[12px] font-semibold text-foreground">{p.name}</div>
                    <div className={`text-[9px] flex items-center gap-1 ${p.ok ? 'text-success' : 'text-warning'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${p.ok ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                      {p.ok ? 'Operational' : 'Warning'}
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/35 tabular-nums">{p.uptime}</span>
                </motion.button>
              ))}
            </div>
            <div className="mt-auto text-[10px] text-muted-foreground/40 font-semibold uppercase tracking-widest mb-2">Team</div>
            <div className="flex items-center gap-2">
              {['A', 'E', 'I', 'D'].map((l, i) => (
                <div key={i} title={['Alexandra', 'Edwin', 'Isaac', 'David'][i]} className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold ring-2 ring-card shadow-sm cursor-pointer hover:scale-110 transition-transform" style={{ marginLeft: i > 0 ? -6 : 0 }}>
                  {l}
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground/50 font-medium ml-2">4 members</span>
            </div>
          </div>
        );

      /* ── PROJECTS ── */
      case 'quick-links':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Projects" action="Manage" actionFn={() => setActiveSection('builds')}
              right={<button onClick={() => setActiveSection('builds')} className="text-[10px] text-primary font-semibold px-2.5 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/5 transition-all flex items-center gap-1"><Plus size={10} />New</button>} />
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {recentBuilds.map((b, i) => {
                const icons = ['🔧', '🚀', '📦', '⚡', '🎯'];
                const sc = { deployed: 'text-success bg-success/8', building: 'text-info bg-info/8', testing: 'text-warning bg-warning/8', ideation: 'text-muted-foreground bg-secondary' } as any;
                return (
                  <motion.div key={b.id} {...fu(i)} onClick={() => setActiveSection('builds')} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-secondary/40 transition-all cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-secondary/60 flex items-center justify-center text-base flex-shrink-0 group-hover:bg-primary/10 transition-colors">{icons[i % 5]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-foreground truncate">{b.name}</div>
                      <div className="text-[10px] text-muted-foreground/45">{b.platform} · {b.lastWorkedOn.slice(0, 10)}</div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${sc[b.status]}`}>{b.status}</span>
                  </motion.div>
                );
              })}
              {recentBuilds.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-3xl mb-2">🚀</div>
                  <p className="text-[12px] text-muted-foreground/50 mb-2">No projects yet</p>
                  <button onClick={() => setActiveSection('builds')} className="text-[11px] text-primary font-semibold hover:underline">Add a project →</button>
                </div>
              )}
            </div>
          </div>
        );

      /* ── WEBSITES ── */
      case 'websites-summary':
        return (
          <div className={`${wb} p-6 flex flex-col`} style={wr}>
            <WH title="Websites" action="Manage" actionFn={() => setActiveSection('websites')}
              right={<span className="text-[10px] font-bold text-success bg-success/8 px-2.5 py-1 rounded-full">{activeSites} live</span>} />
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {websites.slice(0, 7).map((w, i) => (
                <motion.div key={w.id} {...fu(i)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/40 transition-all cursor-pointer group">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-card
                    ${w.status === 'active' ? 'bg-success ring-success/20' : w.status === 'maintenance' ? 'bg-warning ring-warning/20' : 'bg-destructive ring-destructive/20'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-foreground truncate">{w.name}</div>
                    <div className="text-[10px] text-muted-foreground/40">{w.hostingProvider || w.category}</div>
                  </div>
                  <a href={w.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-xl hover:bg-secondary">
                    <ExternalLink size={11} className="text-primary" />
                  </a>
                </motion.div>
              ))}
              {websites.length === 0 && (
                <div className="py-8 text-center">
                  <Globe size={28} className="text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground/50 mb-2">No websites yet</p>
                  <button onClick={() => setActiveSection('websites')} className="text-[11px] text-primary font-semibold hover:underline">Add website →</button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <div className={`${wb} p-6 flex items-center justify-center text-muted-foreground/30 text-sm`} style={wr}>Widget: {id}</div>;
    }
  };

  const visible = widgetDefinitions.filter(w => visibility[w.id] !== false);
  const cats = ['all', 'overview', 'productivity', 'business', 'platforms'] as const;
  const filterDefs = configTab === 'all' ? widgetDefinitions : widgetDefinitions.filter(w => w.category === configTab);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div {...fu(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Mission Control</h1>
            <span className="px-3 py-1 rounded-full bg-success/10 text-success text-[11px] font-bold border border-success/20">● Live</span>
          </div>
          <p className="text-[13px] text-muted-foreground/50">Welcome back, <strong className="text-foreground/80">{userName}</strong> — here's your full overview for today.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {completedToday > 0 && <motion.div {...fu(1)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-success/6 border border-success/15 text-success text-[11px] font-semibold"><Target size={11} />{completedToday} done today</motion.div>}
          {overdue > 0 && <motion.div {...fu(2)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-destructive/6 border border-destructive/15 text-destructive text-[11px] font-semibold animate-pulse">⚠️ {overdue} overdue</motion.div>}
          <div className="h-6 w-px bg-border/30 hidden sm:block" />
          <motion.button {...fu(3)} onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-2 rounded-2xl transition-all border ${isLocked ? 'text-muted-foreground border-border/40 bg-card hover:bg-secondary' : 'text-primary bg-primary/6 border-primary/20'}`}>
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}{isLocked ? 'Locked' : 'Editing'}
          </motion.button>
          <motion.button {...fu(4)} onClick={() => setConfigOpen(!configOpen)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-2 rounded-2xl transition-all border ${configOpen ? 'text-primary bg-primary/6 border-primary/20' : 'text-muted-foreground border-border/40 bg-card hover:bg-secondary'}`}>
            <LayoutGrid size={12} /> Customize <ChevronDown size={10} className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* Configurator */}
      <AnimatePresence>
        {configOpen && (
          <motion.div initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="border border-border/35 bg-card overflow-hidden" style={{ borderRadius: 24, boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center justify-between px-7 py-5 border-b border-border/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center"><LayoutGrid size={17} className="text-primary" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Customize Dashboard</h3>
                    <p className="text-[10px] text-muted-foreground/40">Toggle widgets · drag to rearrange</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-xl">{visible.length}/{widgetDefinitions.length} active</span>
                  <button onClick={() => setConfigOpen(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors"><X size={14} className="text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex gap-1.5 px-7 pt-5 pb-3 overflow-x-auto hide-scrollbar">
                {cats.map(cat => (
                  <button key={cat} onClick={() => setConfigTab(cat)} className={`px-3.5 py-2 rounded-2xl text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${configTab === cat ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}>
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
              <div className="px-7 pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {filterDefs.map(w => {
                    const on = visibility[w.id] !== false;
                    return (
                      <motion.button key={w.id} onClick={() => toggleWidget(w.id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all border ${on ? 'bg-primary/5 border-primary/15' : 'bg-secondary/10 border-border/10 opacity-55 hover:opacity-80'}`}>
                        <span className="text-base">{w.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-foreground truncate">{w.title}</div>
                          <div className="text-[9px] text-muted-foreground/40 truncate">{w.description}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-primary text-white' : 'bg-secondary'}`}>
                          {on ? <Eye size={10} /> : <EyeOff size={10} className="text-muted-foreground/35" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between px-7 py-4 border-t border-border/15 bg-secondary/5">
                <div className="flex gap-3">
                  <button onClick={() => { const n: any = {}; widgetDefinitions.forEach(w => { n[w.id] = true; }); setVisibility(n); saveWidgetVisibility(n); }} className="text-[10px] font-semibold text-primary hover:underline">Show All</button>
                  <button onClick={() => { const n: any = {}; widgetDefinitions.forEach(w => { n[w.id] = false; }); setVisibility(n); saveWidgetVisibility(n); }} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Hide All</button>
                </div>
                <button onClick={() => { const f = { lg: getDefaultLayouts(12), md: getDefaultLayouts(10), sm: getDefaultLayouts(6), xs: getDefaultLayouts(4) }; setLayouts(f); saveLayout(f); }} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-secondary transition-all">
                  <RotateCcw size={10} /> Reset Layout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <ResponsiveGridLayout className="layout" layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={48} isDraggable={!isLocked} isResizable={!isLocked}
        onLayoutChange={handleLayoutChange} draggableHandle=".drag-handle"
        margin={[16, 16]} containerPadding={[0, 0]} useCSSTransforms>
        {visible.map(w => (
          <div key={w.id} className="relative group">
            {!isLocked && (
              <div className="drag-handle absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing p-2 rounded-xl bg-card/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all border border-border/20 shadow-sm">
                <GripVertical size={12} className="text-muted-foreground/50" />
              </div>
            )}
            {renderWidget(w.id)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
