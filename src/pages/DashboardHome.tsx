import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useCallback, useEffect } from 'react';
import * as RGL from 'react-grid-layout';
// @ts-ignore
const Responsive = RGL.Responsive || RGL.default?.Responsive;
// @ts-ignore
const WidthProvider = RGL.WidthProvider || RGL.default?.WidthProvider;
const ResponsiveGridLayout = WidthProvider(Responsive);
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, CheckSquare, Clock, Zap, Calendar, FileText, Target, DollarSign,
  Eye, EyeOff, ArrowUpRight, ArrowDownRight, Pin, Lock, Unlock, ExternalLink,
  GripVertical, Flame, ChevronRight, BarChart3, ArrowUp, ArrowDown, X,
  LayoutGrid, RotateCcw, ChevronDown, Plus, TrendingUp, Sparkles,
} from 'lucide-react';
import { widgetDefinitions, getDefaultLayouts, loadSavedLayout, saveLayout, loadWidgetVisibility, saveWidgetVisibility } from '@/lib/widgetRegistry';
import 'react-grid-layout/css/styles.css';

const fe = [0.22, 1, 0.36, 1] as any;
const fu = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.48, delay: i * 0.055, ease: fe } });

const PRI: Record<string, { c: string; bg: string; lbl: string; dot: string }> = {
  critical: { c: 'text-rose-500', bg: 'bg-rose-500/10', lbl: 'Critical', dot: 'bg-rose-500' },
  high: { c: 'text-amber-500', bg: 'bg-amber-500/10', lbl: 'High', dot: 'bg-amber-500' },
  medium: { c: 'text-blue-500', bg: 'bg-blue-500/10', lbl: 'Medium', dot: 'bg-blue-500' },
  low: { c: 'text-emerald-500', bg: 'bg-emerald-500/10', lbl: 'Low', dot: 'bg-emerald-500' },
};

function PillChart({ data, color = 'hsl(var(--primary))', height = 90 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <motion.div style={{ background: color, borderRadius: 99, opacity: 0.2 + (v / max) * 0.8 }}
            initial={{ height: 0 }} animate={{ height: `${Math.max((v / max) * 100, 6)}%` }}
            transition={{ duration: 0.7, delay: i * 0.07, ease: fe }} />
          <span className="text-[9px] text-white/40 font-medium">{'SMTWTFS'[i % 7]}</span>
        </div>
      ))}
    </div>
  );
}

function Ring({ pct, color, size = 110, sw = 9 }: { pct: number; color: string; size?: number; sw?: number }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-white/15" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          initial={{ strokeDasharray: c, strokeDashoffset: c }} animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1.3, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white tracking-tight">{Math.round(pct)}%</span>
        <span className="text-[9px] text-white/50 font-medium">done</span>
      </div>
    </div>
  );
}

function WH({ title, sub, action, onAction, light }: { title: string; sub?: string; action?: string; onAction?: () => void; light?: boolean }) {
  return (
    <div className="flex items-start justify-between mb-5 flex-shrink-0">
      <div>
        <h3 className={`font-bold text-[14px] tracking-tight leading-tight ${light ? 'text-white' : 'text-foreground'}`}>{title}</h3>
        {sub && <p className={`text-[10px] mt-0.5 ${light ? 'text-white/50' : 'text-muted-foreground/50'}`}>{sub}</p>}
      </div>
      {action && onAction && (
        <button onClick={onAction} className={`text-[10px] font-semibold flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all ${light ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-muted-foreground/50 hover:text-primary hover:bg-secondary/60'}`}>
          {action}<ChevronRight size={10} />
        </button>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const { websites, repos, buildProjects, tasks, links, notes, payments, ideas, habits } = useDashboard();
  const { setActiveSection } = useNavigationStore();
  const { userName } = useSettingsStore();

  const [layouts, setLayouts] = useState(() => loadSavedLayout() || { lg: getDefaultLayouts(12), md: getDefaultLayouts(10), sm: getDefaultLayouts(6), xs: getDefaultLayouts(4) });
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => loadWidgetVisibility());
  const [configOpen, setConfigOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [clock, setClock] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  const onLayout = useCallback((_: any, all: any) => { setLayouts(all); saveLayout(all); }, []);
  const toggleW = (id: string) => { const n = { ...visibility, [id]: !visibility[id] }; setVisibility(n); saveWidgetVisibility(n); };

  const today = new Date().toISOString().split('T')[0];
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const done = tasks.filter(t => t.status === 'done');
  const open = tasks.filter(t => t.status !== 'done');
  const dueToday = tasks.filter(t => t.dueDate === today && t.status !== 'done').length;
  const overdue = tasks.filter(t => t.dueDate < today && t.status !== 'done').length;
  const completedToday = tasks.filter(t => t.completedAt === today).length;
  const income = payments.filter(p => p.type === 'income' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const expense = payments.filter(p => (p.type === 'expense' || p.type === 'subscription') && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const pct = tasks.length > 0 ? (done.length / tasks.length) * 100 : 0;
  const activeSites = websites.filter(w => w.status === 'active').length;
  const topTasks = [...open].sort((a, b) => { const p: any = { critical: 0, high: 1, medium: 2, low: 3 }; return (p[a.priority] || 3) - (p[b.priority] || 3); }).slice(0, 7);
  const upcoming = tasks.filter(t => t.status !== 'done' && t.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  const recentBuilds = [...buildProjects].sort((a, b) => b.lastWorkedOn.localeCompare(a.lastWorkedOn)).slice(0, 5);
  const topIdeas = ideas.filter(i => i.status !== 'parked').sort((a, b) => b.votes - a.votes).slice(0, 4);
  const pinnedNotes = notes.filter(n => n.pinned).slice(0, 4);
  const taskBar = [3, 5, 4, 7, 6, 8, open.length];

  const wr = { borderRadius: 24 };
  const R = (id: string) => {
    switch (id) {
      case 'stats': return (
        <div className="h-full" style={wr}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            {[
              { label: 'Total Projects', value: websites.length + buildProjects.length, change: '+5.4%', sub: 'From last month', Icon: BarChart3, accent: 'linear-gradient(145deg,hsl(150 52% 24%),hsl(150 48% 32%))', shadow: '0 8px 32px -6px hsl(150 52% 26% / 0.4)', isHero: true, nav: 'websites' },
              { label: 'Completed Tasks', value: done.length, change: '+3.2%', sub: 'Increased', Icon: CheckSquare, accent: '', shadow: '', isHero: false, nav: 'tasks' },
              { label: 'Active Tasks', value: open.length, change: overdue > 0 ? `${overdue} overdue` : '+8.1%', sub: 'Running now', Icon: TrendingUp, accent: '', shadow: '', isHero: false, nav: 'tasks' },
              { label: 'Net Revenue', value: fmt(income - expense), change: '+12.8%', sub: 'This period', Icon: DollarSign, accent: '', shadow: '', isHero: false, nav: 'payments' },
            ].map((s, i) => (
              <motion.div key={s.label} {...fu(i)} whileHover={{ y: -3 }} onClick={() => setActiveSection(s.nav)}
                className="relative overflow-hidden cursor-pointer p-6 flex flex-col gap-4"
                style={{ ...wr, background: s.isHero ? s.accent : 'hsl(var(--card))', boxShadow: s.isHero ? s.shadow : 'var(--shadow-sm)', border: s.isHero ? 'none' : '1px solid hsl(var(--border)/0.4)', color: s.isHero ? 'white' : undefined }}>
                {s.isHero && <><div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/6 pointer-events-none" /><div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/4 pointer-events-none" /></>}
                <div className="flex justify-between items-start">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.isHero ? 'bg-white/16' : 'bg-secondary/70'}`}><s.Icon size={16} className={s.isHero ? 'text-white' : 'text-muted-foreground/60'} /></div>
                  <ArrowUpRight size={13} className={s.isHero ? 'text-white/50' : 'text-muted-foreground/25'} />
                </div>
                <div>
                  <motion.div className={`text-4xl font-extrabold tracking-tighter leading-none mb-2 tabular-nums ${s.isHero ? 'text-white' : 'text-foreground'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 + 0.2, duration: 0.6 }}>{s.value}</motion.div>
                  <div className={`text-[11px] font-semibold mb-2 ${s.isHero ? 'text-white/65' : 'text-muted-foreground/55'}`}>{s.label}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isHero ? 'bg-white/18 text-white' : 'bg-success/12 text-success'}`}><ArrowUp size={8} />{s.change}</span>
                    <span className={`text-[10px] ${s.isHero ? 'text-white/45' : 'text-muted-foreground/35'}`}>{s.sub}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );

      case 'activity': return (
        <div className="h-full widget-dark p-6 flex flex-col" style={wr}>
          <WH light title="Analytics" sub="Last 7 days" action="View All" onAction={() => setActiveSection('tasks')} />
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {[{ lbl: 'Done', val: done.length, c: 'text-emerald-400', bg: 'bg-emerald-500/15' }, { lbl: 'Active', val: open.filter(t => t.status === 'in-progress').length, c: 'text-blue-400', bg: 'bg-blue-500/15' }, { lbl: 'Overdue', val: overdue, c: 'text-rose-400', bg: 'bg-rose-500/15' }].map(m => (
              <div key={m.lbl} className={`${m.bg} rounded-2xl p-3 text-center`}>
                <div className={`text-xl font-extrabold ${m.c}`}>{m.val}</div>
                <div className="text-[9px] text-white/40 font-medium mt-0.5">{m.lbl}</div>
              </div>
            ))}
          </div>
          <div className="flex-1 flex items-end"><PillChart data={taskBar} color="hsl(150 60% 50%)" /></div>
        </div>
      );

      case 'quote': return (
        <div className="h-full widget-dark flex flex-col" style={wr}>
          <div className="flex-1 p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,hsl(150 60% 50% / 0.12),transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,hsl(212 82% 54% / 0.1),transparent 70%)' }} />
            <div className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-3">⏱ Time Tracker</div>
            <div className="text-5xl font-extrabold tracking-tighter tabular-nums text-white mb-1">{clock.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="text-[11px] text-white/35 mb-5">{clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            <div className="flex flex-wrap gap-2 mb-auto">
              {completedToday > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-semibold">{completedToday} done</span>}
              {dueToday > 0 && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-semibold">{dueToday} due</span>}
              {overdue > 0 && <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-full font-semibold">{overdue} overdue</span>}
            </div>
            <div className="mt-4">
              <div className="flex justify-between mb-1.5"><span className="text-[10px] text-white/35">Daily progress</span><span className="text-[10px] text-white/60 font-bold">{Math.round(pct)}%</span></div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden"><motion.div className="h-full rounded-full bg-emerald-400" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: 'easeOut' }} /></div>
            </div>
          </div>
          <div className="border-t border-white/8 px-6 py-4 flex items-center gap-3 flex-shrink-0">
            <button className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/16 flex items-center justify-center transition-all">
              <div className="w-0 h-0 border-l-[7px] border-l-white border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
            </button>
            <button className="w-10 h-10 rounded-2xl bg-rose-500/70 hover:bg-rose-500 flex items-center justify-center transition-all"><div className="w-3.5 h-3.5 rounded-sm bg-white" /></button>
            <div className="ml-1"><div className="text-[10px] text-white/40">Session</div><div className="text-[13px] font-bold text-white">Focus Mode</div></div>
          </div>
        </div>
      );

      case 'tasks-focus': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Today's Focus" sub={`${topTasks.length} pending tasks`} action="All" onAction={() => setActiveSection('tasks')} />
          <div className="mb-4 flex-shrink-0">
            <div className="flex justify-between mb-1.5"><span className="text-[10px] text-muted-foreground/50">Progress</span><span className="text-[10px] font-bold text-foreground">{Math.round(pct)}%</span></div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,hsl(150 52% 28%),hsl(212 82% 54%))' }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} /></div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {topTasks.map((t, i) => {
              const p = PRI[t.priority] || PRI.medium; return (
                <motion.div key={t.id} {...fu(i)} onClick={() => setActiveSection('tasks')} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all cursor-pointer group">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                  <span className="text-[12px] text-foreground flex-1 truncate font-medium">{t.title}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${p.bg} ${p.c}`}>{p.lbl}</span>
                  <span className={`text-[9px] font-mono tabular-nums flex-shrink-0 ${t.dueDate < today ? 'text-rose-500 font-bold' : 'text-muted-foreground/30'}`}>{t.dueDate === today ? 'Today' : t.dueDate.slice(5)}</span>
                </motion.div>
              );
            })}
            {topTasks.length === 0 && <div className="flex flex-col items-center py-10"><div className="text-4xl mb-3">🎉</div><p className="text-sm font-semibold text-foreground/50">All done!</p></div>}
          </div>
        </div>
      );

      case 'deadlines': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Reminders" sub="Upcoming deadlines" action="Calendar" onAction={() => setActiveSection('calendar')} />
          {upcoming[0] && (
            <div className="mb-4 p-4 rounded-2xl flex-shrink-0" style={{ background: 'linear-gradient(135deg,hsl(150 52% 26% / 0.07),hsl(150 48% 33% / 0.04))', border: '1px solid hsl(150 52% 26% / 0.12)' }}>
              <div className="text-[9px] text-primary font-bold uppercase tracking-wide mb-1">Next Up</div>
              <div className="text-[13px] font-bold text-foreground truncate mb-1">{upcoming[0].title}</div>
              <div className="text-[10px] text-muted-foreground/50 mb-3">{upcoming[0].dueDate}</div>
              <button onClick={() => setActiveSection('calendar')} className="text-[11px] bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-1.5" style={{ boxShadow: 'var(--shadow-primary)' }}><Calendar size={11} />Calendar</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {upcoming.slice(1).map((t, i) => {
              const d = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000); return (
                <motion.div key={t.id} {...fu(i)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all">
                  <div className="w-9 flex-shrink-0 text-center">
                    <div className="text-[8px] text-muted-foreground/35 leading-none">{new Date(t.dueDate).toLocaleDateString('en', { month: 'short' })}</div>
                    <div className={`text-sm font-extrabold ${d <= 1 ? 'text-rose-500' : d <= 3 ? 'text-amber-500' : 'text-foreground'}`}>{new Date(t.dueDate).getDate()}</div>
                  </div>
                  <div className="w-px h-7 bg-border/40 flex-shrink-0" />
                  <span className="text-[12px] text-foreground flex-1 truncate font-medium">{t.title}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${d <= 1 ? 'bg-rose-500/10 text-rose-500' : d <= 3 ? 'bg-amber-500/10 text-amber-500' : 'bg-secondary text-muted-foreground'}`}>{d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d}d`}</span>
                </motion.div>
              );
            })}
            {upcoming.length === 0 && <div className="py-10 text-center text-muted-foreground/40 text-sm">No deadlines 🌟</div>}
          </div>
        </div>
      );

      case 'habits': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Habits" sub={`${habits.filter(h => h.completions?.includes(today)).length}/${habits.length} today`} action="Track" onAction={() => setActiveSection('habits')} />
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {habits.slice(0, 7).map((h, i) => {
              const done = h.completions?.includes(today); return (
                <motion.div key={h.id} {...fu(i)} className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${done ? 'bg-emerald-500/8 border border-emerald-500/15' : 'hover:bg-secondary/50 border border-transparent'}`}>
                  <span className="text-base">{h.icon}</span>
                  <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-foreground truncate">{h.name}</div><div className="text-[9px] text-muted-foreground/40">{h.frequency}</div></div>
                  <div className="flex items-center gap-1.5"><Flame size={11} className="text-amber-500" /><span className="text-[11px] font-extrabold text-amber-500 tabular-nums">{h.streak}</span></div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-secondary'}`}>{done && '✓'}</div>
                </motion.div>
              );
            })}
            {habits.length === 0 && <div className="py-10 text-center"><div className="text-3xl mb-2">🔥</div><p className="text-[12px] text-muted-foreground/50 mb-2">No habits yet</p><button onClick={() => setActiveSection('habits')} className="text-[11px] text-primary font-semibold hover:underline">Start tracking →</button></div>}
          </div>
        </div>
      );

      case 'finance': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Finance" sub="Income, expenses & profit" action="Details" onAction={() => setActiveSection('payments')} />
          <div className="grid grid-cols-3 gap-2.5 mb-4 flex-shrink-0">
            {[{ lbl: 'Income', val: income, Icon: ArrowUpRight, c: 'text-emerald-500', bg: 'bg-emerald-500/8' }, { lbl: 'Expenses', val: expense, Icon: ArrowDownRight, c: 'text-rose-500', bg: 'bg-rose-500/8' }, { lbl: 'Pending', val: pending, Icon: Clock, c: 'text-amber-500', bg: 'bg-amber-500/8' }].map(d => (
              <motion.div key={d.lbl} whileHover={{ y: -2 }} className={`text-center p-3.5 rounded-2xl ${d.bg} cursor-default`}>
                <d.Icon size={13} className={`${d.c} mx-auto mb-2 opacity-70`} />
                <div className={`text-sm font-extrabold ${d.c} tabular-nums`}>{fmt(d.val)}</div>
                <div className="text-[9px] text-muted-foreground/50 mt-1 font-medium">{d.lbl}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/20 mb-3 flex-shrink-0">
            <div className={`text-2xl font-extrabold tabular-nums flex-1 ${income - expense >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmt(income - expense)}</div>
            <div className="text-right"><div className="text-[10px] text-muted-foreground/50">Net Profit</div><div className="text-[10px] text-muted-foreground/40">{payments.length} transactions</div></div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {payments.filter(p => p.status === 'overdue' || p.status === 'pending').slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.status === 'overdue' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[11px] text-foreground font-medium flex-1 truncate">{p.title}</span>
                <span className="text-[10px] text-rose-500 font-bold">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      );

      case 'ideas': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Progress" sub={`${done.length} of ${tasks.length} tasks done`} action="Ideas" onAction={() => setActiveSection('ideas')} />
          <div className="flex items-center justify-center my-3 flex-shrink-0">
            <div className="relative" style={{ width: 110, height: 110 }}>
              <svg width="110" height="110" className="-rotate-90">
                <circle cx="55" cy="55" r="46" fill="none" stroke="currentColor" strokeWidth="9" className="text-secondary" />
                <motion.circle cx="55" cy="55" r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round"
                  initial={{ strokeDasharray: 289, strokeDashoffset: 289 }} animate={{ strokeDashoffset: 289 - (pct / 100) * 289 }} transition={{ duration: 1.3, ease: 'easeOut' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-foreground">{Math.round(pct)}%</span>
                <span className="text-[9px] text-muted-foreground/50">done</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mb-4 flex-shrink-0">
            {[{ lbl: 'Done', val: done.length, c: 'bg-primary' }, { lbl: 'Active', val: open.filter(t => t.status === 'in-progress').length, c: 'bg-info' }, { lbl: 'Todo', val: open.filter(t => t.status === 'todo').length, c: 'bg-warning' }].map(s => (
              <div key={s.lbl} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${s.c}`} /><span className="text-[10px] text-muted-foreground/55">{s.lbl} <strong className="text-foreground">{s.val}</strong></span></div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {topIdeas.map((idea, i) => (
              <motion.div key={idea.id} {...fu(i)} onClick={() => setActiveSection('ideas')} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all cursor-pointer">
                <span className="text-sm font-extrabold text-primary bg-primary/8 w-8 h-8 rounded-xl flex items-center justify-center tabular-nums flex-shrink-0">{idea.votes}</span>
                <div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-foreground truncate">{idea.title}</div><div className="text-[9px] text-muted-foreground/40">{idea.category}</div></div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize ${idea.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500' : idea.status === 'exploring' ? 'bg-blue-500/10 text-blue-500' : 'bg-secondary text-muted-foreground'}`}>{idea.status}</span>
              </motion.div>
            ))}
            {topIdeas.length === 0 && <div className="py-4 text-center text-[11px] text-muted-foreground/40">No active ideas</div>}
          </div>
        </div>
      );

      case 'notes-preview': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Pinned Notes" sub={`${pinnedNotes.length} pinned`} action="Notes" onAction={() => setActiveSection('notes')} />
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {pinnedNotes.map((n, i) => {
              const a = ['border-primary/20 bg-primary/4', 'border-amber-500/20 bg-amber-500/4', 'border-blue-500/20 bg-blue-500/4', 'border-emerald-500/20 bg-emerald-500/4']; const d = ['bg-primary', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500']; return (
                <motion.button key={n.id} {...fu(i)} onClick={() => setActiveSection('notes')} whileHover={{ scale: 1.01 }} className={`w-full text-left p-4 rounded-2xl border transition-all ${a[i % 4]}`}>
                  <div className="flex items-center gap-2 mb-1.5"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${d[i % 4]}`} /><div className="text-[12px] font-bold text-foreground truncate">{n.title}</div></div>
                  <div className="text-[10px] text-muted-foreground/50 line-clamp-2 leading-relaxed ml-4">{n.content.slice(0, 85)}</div>
                  <div className="text-[9px] text-muted-foreground/30 mt-1.5 ml-4">{new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </motion.button>
              );
            })}
            {pinnedNotes.length === 0 && <div className="flex flex-col items-center py-8"><FileText size={28} className="text-muted-foreground/20 mb-3" /><p className="text-[12px] text-muted-foreground/45 mb-2">No pinned notes</p><button onClick={() => setActiveSection('notes')} className="text-[11px] text-primary font-semibold hover:underline">Create one →</button></div>}
          </div>
        </div>
      );

      case 'platforms': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Platforms & Team" sub="Status & collaboration" action="Settings" onAction={() => setActiveSection('settings')} />
          <div className="space-y-1.5 mb-5">
            {[{ name: 'Cloudflare', ok: true, e: '☁️', s: 'cloudflare', up: '99.9%' }, { name: 'Vercel', ok: true, e: '⚡', s: 'vercel', up: '99.8%' }, { name: 'GitHub', ok: true, e: '🐙', s: 'github', up: '99.9%' }, { name: 'OpenClaw', ok: true, e: '🐾', s: 'openclaw', up: '100%' }].map(p => (
              <motion.button key={p.name} onClick={() => setActiveSection(p.s)} whileHover={{ x: 2 }} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all">
                <span className="text-base">{p.e}</span>
                <div className="flex-1 text-left"><div className="text-[12px] font-semibold text-foreground">{p.name}</div><div className={`text-[9px] flex items-center gap-1 ${p.ok ? 'text-emerald-500' : 'text-amber-500'}`}><div className={`w-1.5 h-1.5 rounded-full ${p.ok ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />{p.ok ? 'Operational' : 'Warning'}</div></div>
                <span className="text-[9px] font-mono text-muted-foreground/30">{p.up}</span>
              </motion.button>
            ))}
          </div>
          <div className="border-t border-border/20 pt-4 flex-1">
            <div className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest mb-3">Team</div>
            <div className="flex items-center gap-1">
              {['A', 'E', 'I', 'D'].map((l, i) => (
                <div key={i} title={['Alexandra', 'Edwin', 'Isaac', 'David'][i]} className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground text-[11px] font-bold ring-2 ring-card cursor-pointer transition-transform hover:scale-110 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg,hsl(150 52% 28%),hsl(150 48% 35%))', marginLeft: i > 0 ? -8 : 0, boxShadow: '0 2px 8px hsl(0 0% 0% / 0.1)' }}>
                  {l}
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground/50 font-medium ml-3">4 members online</span>
            </div>
          </div>
        </div>
      );

      case 'quick-links': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Projects" sub={`${recentBuilds.length} recent builds`} action="Manage" onAction={() => setActiveSection('builds')} />
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {recentBuilds.map((b, i) => {
              const icons = ['🔧', '🚀', '📦', '⚡', '🎯']; const sc = { deployed: 'text-emerald-500 bg-emerald-500/10', building: 'text-blue-500 bg-blue-500/10', testing: 'text-amber-500 bg-amber-500/10', ideation: 'text-muted-foreground bg-secondary' } as any; return (
                <motion.div key={b.id} {...fu(i)} onClick={() => setActiveSection('builds')} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl hover:bg-secondary/50 transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center text-base flex-shrink-0 group-hover:bg-primary/10 transition-colors">{icons[i % 5]}</div>
                  <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-foreground truncate">{b.name}</div><div className="text-[9px] text-muted-foreground/40">{b.platform} · {b.lastWorkedOn.slice(0, 10)}</div></div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${sc[b.status] || sc.ideation}`}>{b.status}</span>
                </motion.div>
              );
            })}
            {recentBuilds.length === 0 && <div className="py-8 text-center"><div className="text-3xl mb-2">🚀</div><p className="text-[12px] text-muted-foreground/50 mb-2">No projects</p><button onClick={() => setActiveSection('builds')} className="text-[11px] text-primary font-semibold hover:underline">Add project →</button></div>}
          </div>
        </div>
      );

      case 'websites-summary': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Websites" sub={`${activeSites} live`} action="Manage" onAction={() => setActiveSection('websites')} />
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {websites.slice(0, 7).map((w, i) => (
              <motion.div key={w.id} {...fu(i)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all cursor-pointer group">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-card ${w.status === 'active' ? 'bg-emerald-500 ring-emerald-500/20' : w.status === 'maintenance' ? 'bg-amber-500 ring-amber-500/20' : 'bg-rose-500 ring-rose-500/20'}`} />
                <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-foreground truncate">{w.name}</div><div className="text-[9px] text-muted-foreground/40">{w.hostingProvider || w.category}</div></div>
                <a href={w.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl hover:bg-secondary transition-all"><ExternalLink size={11} className="text-primary" /></a>
              </motion.div>
            ))}
            {websites.length === 0 && <div className="py-8 text-center"><Globe size={28} className="text-muted-foreground/20 mx-auto mb-2" /><p className="text-[12px] text-muted-foreground/50 mb-2">No websites</p><button onClick={() => setActiveSection('websites')} className="text-[11px] text-primary font-semibold hover:underline">Add website →</button></div>}
          </div>
        </div>
      );

      case 'calendar-mini': return (
        <div className="h-full widget-card p-6 flex flex-col" style={wr}>
          <WH title="Calendar" sub={`${dueToday} tasks today`} action="Full" onAction={() => setActiveSection('calendar')} />
          <div className="flex-1 flex flex-col min-h-0">
            {(() => {
              const now = new Date(), y = now.getFullYear(), m = now.getMonth(), fd = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), td = now.getDate(), tds = new Set(tasks.filter(t => t.status !== 'done').map(t => { const d = new Date(t.dueDate); return d.getFullYear() === y && d.getMonth() === m ? d.getDate() : null }).filter(Boolean)), cells = [...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)], mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return (<>
                <div className="flex items-center justify-between mb-3"><span className="text-sm font-bold text-foreground">{mo[m]} {y}</span><span className="text-[9px] text-muted-foreground/40">{tds.size} with tasks</span></div>
                <div className="grid grid-cols-7 gap-1 mb-1">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[9px] text-center text-muted-foreground/35 font-semibold">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1">{cells.map((d, i) => <div key={i} className={`text-[10px] text-center py-1.5 rounded-xl font-medium transition-all ${!d ? '' : d === td ? 'text-primary-foreground font-bold cursor-default' : tds.has(d as number) ? 'bg-primary/12 text-primary font-bold cursor-pointer hover:bg-primary/18' : 'text-foreground/65 hover:bg-secondary/60 cursor-pointer'}`} style={d === td ? { background: 'hsl(var(--primary))', boxShadow: 'var(--shadow-primary)' } : {}}>{d || ''}</div>)}</div>
                <div className="mt-4 space-y-1.5">
                  {tasks.filter(t => t.dueDate === today && t.status !== 'done').slice(0, 2).map(t => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-[11px] text-foreground font-medium truncate">{t.title}</span>
                      <span className="text-[9px] text-primary font-bold ml-auto">Today</span>
                    </div>
                  ))}
                </div>
              </>);
            })()}
          </div>
        </div>
      );

      default: return <div className="h-full widget-card p-6 flex items-center justify-center text-muted-foreground/30 text-sm" style={wr}>Widget: {id}</div>;
    }
  };

  const visible = widgetDefinitions.filter(w => visibility[w.id] !== false);
  const cats = ['all', 'overview', 'productivity', 'business', 'platforms'] as const;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: fe }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tighter">Mission Control</h1>
            <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="px-3 py-1 rounded-full text-[10px] font-bold border" style={{ background: 'hsl(var(--success)/0.1)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success)/0.2)' }}>● Live</motion.span>
          </div>
          <p className="text-[13px] text-muted-foreground/50">Welcome back, <strong className="text-foreground/75">{userName}</strong> — full overview for today.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {completedToday > 0 && <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-semibold" style={{ background: 'hsl(var(--success)/0.08)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success)/0.15)' }}><Target size={11} />{completedToday} done today</div>}
          {overdue > 0 && <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-semibold animate-pulse" style={{ background: 'hsl(var(--destructive)/0.08)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive)/0.15)' }}>⚠️ {overdue} overdue</div>}
          <div className="h-5 w-px bg-border/40 hidden sm:block" />
          <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-2 rounded-2xl transition-all border ${isLocked ? 'text-muted-foreground border-border/40 bg-card hover:bg-secondary' : 'text-primary bg-primary/8 border-primary/20'}`}>
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}{isLocked ? 'Locked' : 'Editing'}
          </button>
          <button onClick={() => setConfigOpen(!configOpen)} className={`flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-2 rounded-2xl transition-all border ${configOpen ? 'text-primary bg-primary/8 border-primary/20' : 'text-muted-foreground border-border/40 bg-card hover:bg-secondary'}`}>
            <LayoutGrid size={12} />Customize<ChevronDown size={10} className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {configOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease: fe }} className="overflow-hidden">
            <div className="widget-card overflow-hidden" style={wr}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center"><LayoutGrid size={16} className="text-primary" /></div><div><div className="text-sm font-bold text-foreground">Customize Dashboard</div><div className="text-[10px] text-muted-foreground/40">Toggle and reorder widgets</div></div></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-xl">{visible.length}/{widgetDefinitions.length}</span>
                  <button onClick={() => setConfigOpen(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors"><X size={14} className="text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex gap-1.5 px-6 pt-4 pb-2 overflow-x-auto hide-scrollbar">
                {cats.map(c => <button key={c} onClick={() => { }} className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${c === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>{c === 'all' ? 'All' : c}</button>)}
              </div>
              <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {widgetDefinitions.map(w => {
                  const on = visibility[w.id] !== false; return (
                    <motion.button key={w.id} onClick={() => toggleW(w.id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-left transition-all border ${on ? 'bg-primary/5 border-primary/15' : 'bg-secondary/10 border-border/10 opacity-55 hover:opacity-80'}`}>
                      <span className="text-base">{w.icon}</span>
                      <div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-foreground truncate">{w.title}</div><div className="text-[9px] text-muted-foreground/35 truncate">{w.description}</div></div>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-[9px] ${on ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground/30'}`}>{on ? <Eye size={9} /> : <EyeOff size={9} />}</div>
                    </motion.button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/15 bg-secondary/5">
                <div className="flex gap-3">
                  <button onClick={() => { const n: any = {}; widgetDefinitions.forEach(w => { n[w.id] = true; }); setVisibility(n); saveWidgetVisibility(n); }} className="text-[10px] font-semibold text-primary hover:underline">Show All</button>
                  <button onClick={() => { const n: any = {}; widgetDefinitions.forEach(w => { n[w.id] = false; }); setVisibility(n); saveWidgetVisibility(n); }} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Hide All</button>
                </div>
                <button onClick={() => { const f = { lg: getDefaultLayouts(12), md: getDefaultLayouts(10), sm: getDefaultLayouts(6), xs: getDefaultLayouts(4) }; setLayouts(f); saveLayout(f); }} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-secondary transition-all"><RotateCcw size={10} />Reset Layout</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ResponsiveGridLayout className="layout" layouts={layouts} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4 }} rowHeight={52} isDraggable={!isLocked} isResizable={!isLocked} onLayoutChange={onLayout} draggableHandle=".drag-handle" margin={[18, 18]} containerPadding={[0, 0]} useCSSTransforms>
        {visible.map(w => (
          <div key={w.id} className="relative group">
            {!isLocked && <div className="drag-handle absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded-xl bg-card/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all border border-border/25 shadow-sm"><GripVertical size={12} className="text-muted-foreground/50" /></div>}
            {R(w.id)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
