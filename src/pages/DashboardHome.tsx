import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, CheckSquare, Clock, Zap, Calendar, FileText, Target, DollarSign,
  Eye, EyeOff, ArrowUpRight, ArrowDownRight, ExternalLink,
  Flame, ChevronRight, BarChart3, ArrowUp, ArrowDown, X,
  LayoutGrid, ChevronDown, Plus, TrendingUp,
} from 'lucide-react';

/* ─── animation helpers ─── */
const fe = [0.22, 1, 0.36, 1] as any;
const fu = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.46, delay: i * 0.055, ease: fe },
});

/* ─── priority config ─── */
const PRI: Record<string, { c: string; bg: string; lbl: string; dot: string }> = {
  critical: { c: 'text-rose-500', bg: 'bg-rose-500/10', lbl: 'Critical', dot: 'bg-rose-500' },
  high: { c: 'text-amber-500', bg: 'bg-amber-500/10', lbl: 'High', dot: 'bg-amber-500' },
  medium: { c: 'text-blue-500', bg: 'bg-blue-500/10', lbl: 'Medium', dot: 'bg-blue-500' },
  low: { c: 'text-emerald-500', bg: 'bg-emerald-500/10', lbl: 'Low', dot: 'bg-emerald-500' },
};

/* ─── sub-components ─── */
function PillChart({ data, color = 'hsl(150 60% 48%)' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const labels = 'SMTWTFS';
  return (
    <div className="flex items-end gap-1.5 w-full h-full">
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1 h-full">
          <div className="flex-1 flex items-end w-full">
            <motion.div
              style={{ background: color, borderRadius: 999, opacity: 0.2 + (v / max) * 0.8, width: '100%' }}
              initial={{ height: 0 }} animate={{ height: `${Math.max((v / max) * 100, 8)}%` }}
              transition={{ duration: 0.72, delay: i * 0.07, ease: fe }}
            />
          </div>
          <span className="text-[9px] text-white/35 font-medium">{labels[i % 7]}</span>
        </div>
      ))}
    </div>
  );
}

function WH({ title, sub, action, onAction, light }: { title: string; sub?: string; action?: string; onAction?: () => void; light?: boolean }) {
  return (
    <div className="flex items-start justify-between mb-5 flex-shrink-0">
      <div>
        <h3 className={`font-bold text-[14px] tracking-tight ${light ? 'text-white' : 'text-foreground'}`}>{title}</h3>
        {sub && <p className={`text-[10px] mt-0.5 ${light ? 'text-white/45' : 'text-muted-foreground/50'}`}>{sub}</p>}
      </div>
      {action && onAction && (
        <button onClick={onAction} className={`text-[10px] font-semibold flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all flex-shrink-0 ${light ? 'text-white/55 hover:text-white hover:bg-white/12' : 'text-muted-foreground/50 hover:text-primary hover:bg-secondary/60'}`}>
          {action}<ChevronRight size={10} />
        </button>
      )}
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function DashboardHome() {
  const { websites, buildProjects, tasks, notes, payments, ideas, habits } = useDashboard();
  const { setActiveSection } = useNavigationStore();
  const { userName } = useSettingsStore();
  const [clock, setClock] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  /* computed */
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

  /* shared card style */
  const card = 'rounded-3xl border border-border/35 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-border/55 overflow-hidden';
  const darkCard = 'rounded-3xl overflow-hidden';

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <motion.div {...fu(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tighter">Mission Control</h1>
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-3 py-1 rounded-full text-[10px] font-bold border"
              style={{ background: 'hsl(var(--success)/0.1)', color: 'hsl(var(--success))', borderColor: 'hsl(var(--success)/0.2)' }}>
              ● Live
            </motion.span>
          </div>
          <p className="text-[13px] text-muted-foreground/50">Welcome back, <strong className="text-foreground/75">{userName}</strong> — full overview for today.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {completedToday > 0 && (
            <motion.div {...fu(1)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-semibold"
              style={{ background: 'hsl(var(--success)/0.08)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success)/0.15)' }}>
              <Target size={11} />{completedToday} done today
            </motion.div>
          )}
          {overdue > 0 && (
            <motion.div {...fu(2)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-semibold animate-pulse"
              style={{ background: 'hsl(var(--destructive)/0.08)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive)/0.15)' }}>
              ⚠️ {overdue} overdue
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════
          ROW 1: Stats (4 equal columns)
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: websites.length + buildProjects.length, change: '+5.4%', sub: 'From last month', Icon: BarChart3, isHero: true, nav: 'websites' },
          { label: 'Completed Tasks', value: done.length, change: '+3.2%', sub: 'Increased', Icon: CheckSquare, isHero: false, nav: 'tasks' },
          { label: 'Active Tasks', value: open.length, change: overdue > 0 ? `${overdue} overdue` : '+8.1%', sub: 'Running now', Icon: TrendingUp, isHero: false, nav: 'tasks' },
          { label: 'Net Revenue', value: fmt(income - expense), change: '+12.8%', sub: 'This period', Icon: DollarSign, isHero: false, nav: 'payments' },
        ].map((s, i) => (
          <motion.div key={s.label} {...fu(i)} whileHover={{ y: -3 }} onClick={() => setActiveSection(s.nav)}
            className="relative overflow-hidden cursor-pointer p-7 flex flex-col gap-5"
            style={{
              borderRadius: 24,
              background: s.isHero ? 'linear-gradient(145deg,hsl(150 52% 24%),hsl(150 48% 32%))' : 'hsl(var(--card))',
              boxShadow: s.isHero ? '0 8px 32px -6px hsl(150 52% 26% / 0.45)' : 'var(--shadow-sm)',
              border: s.isHero ? 'none' : '1px solid hsl(var(--border)/0.4)',
            }}>
            {s.isHero && <>
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.1),transparent 70%)' }} />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.06),transparent 70%)' }} />
            </>}
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.isHero ? 'bg-white/16' : 'bg-secondary/80'}`}>
                <s.Icon size={17} className={s.isHero ? 'text-white/90' : 'text-muted-foreground/60'} />
              </div>
              <ArrowUpRight size={13} className={s.isHero ? 'text-white/40' : 'text-muted-foreground/20'} />
            </div>
            <div>
              <div className={`text-4xl font-extrabold tracking-tighter leading-none mb-2 tabular-nums ${s.isHero ? 'text-white' : 'text-foreground'}`}>{s.value}</div>
              <div className={`text-[11px] font-semibold mb-2.5 ${s.isHero ? 'text-white/60' : 'text-muted-foreground/55'}`}>{s.label}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isHero ? 'bg-white/18 text-white' : 'bg-success/10 text-success'}`}><ArrowUp size={8} />{s.change}</span>
                <span className={`text-[10px] ${s.isHero ? 'text-white/40' : 'text-muted-foreground/35'}`}>{s.sub}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══════════════════════════════════
          ROW 2: Analytics (7/12) + Time Tracker (5/12)
          Fixed height: 380px
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4" style={{ height: 380 }}>

        {/* Analytics — dark card, 7 cols */}
        <motion.div {...fu(4)} className={`col-span-12 lg:col-span-7 ${darkCard} flex flex-col p-6`}
          style={{ background: 'linear-gradient(145deg,hsl(220 28% 10%),hsl(222 25% 14%))', border: '1px solid hsl(222 20% 18% / 0.7)', boxShadow: 'var(--shadow-lg)' }}>
          <WH light title="Analytics" sub="Last 7 days" action="View All" onAction={() => setActiveSection('tasks')} />
          <div className="grid grid-cols-3 gap-3 mb-5 flex-shrink-0">
            {[
              { lbl: 'Done', val: done.length, c: 'text-emerald-400', bg: 'bg-emerald-500/14' },
              { lbl: 'Active', val: open.filter(t => t.status === 'in-progress').length, c: 'text-blue-400', bg: 'bg-blue-500/14' },
              { lbl: 'Overdue', val: overdue, c: 'text-rose-400', bg: 'bg-rose-500/14' },
            ].map(m => (
              <div key={m.lbl} className={`${m.bg} rounded-2xl p-4 text-center`}>
                <div className={`text-2xl font-extrabold ${m.c} tabular-nums`}>{m.val}</div>
                <div className="text-[9px] text-white/35 font-semibold mt-1">{m.lbl}</div>
              </div>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            <PillChart data={taskBar} color="hsl(150 60% 48%)" />
          </div>
        </motion.div>

        {/* Time Tracker — dark card, 5 cols */}
        <motion.div {...fu(5)} className={`col-span-12 lg:col-span-5 ${darkCard} flex flex-col`}
          style={{ background: 'linear-gradient(145deg,hsl(220 28% 10%),hsl(222 25% 14%))', border: '1px solid hsl(222 20% 18% / 0.7)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex-1 p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,hsl(150 60% 50% / 0.1),transparent 65%)' }} />
            <div className="absolute bottom-10 left-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,hsl(212 82% 54% / 0.08),transparent 65%)' }} />
            <div className="text-[9px] text-emerald-400/75 font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Time Tracker
            </div>
            <div className="text-[42px] font-extrabold tracking-tighter tabular-nums text-white leading-none mb-1">
              {clock.toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="text-[11px] text-white/30 mb-5">
              {clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex flex-wrap gap-2 mb-auto">
              {completedToday > 0 && <span className="text-[10px] bg-emerald-500/18 text-emerald-300 px-2.5 py-1 rounded-full font-semibold">{completedToday} done</span>}
              {dueToday > 0 && <span className="text-[10px] bg-amber-500/18 text-amber-300 px-2.5 py-1 rounded-full font-semibold">{dueToday} due</span>}
              {overdue > 0 && <span className="text-[10px] bg-rose-500/18 text-rose-300 px-2.5 py-1 rounded-full font-semibold">{overdue} overdue</span>}
            </div>
            <div className="mt-5">
              <div className="flex justify-between mb-2"><span className="text-[10px] text-white/30">Daily progress</span><span className="text-[10px] text-white/55 font-bold">{Math.round(pct)}%</span></div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,hsl(150 60% 48%),hsl(150 55% 56%))' }}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: 'easeOut' }} />
              </div>
            </div>
          </div>
          <div className="border-t border-white/7 px-6 py-4 flex items-center gap-3 flex-shrink-0">
            <button className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/16 flex items-center justify-center transition-all">
              <div className="w-0 h-0 border-l-[7px] border-l-white border-t-[4.5px] border-t-transparent border-b-[4.5px] border-b-transparent ml-0.5" />
            </button>
            <button className="w-9 h-9 rounded-2xl bg-rose-500/60 hover:bg-rose-500 flex items-center justify-center transition-all">
              <div className="w-3 h-3 rounded-sm bg-white" />
            </button>
            <div className="ml-1 flex-1">
              <div className="text-[9px] text-white/35">Current session</div>
              <div className="text-[13px] font-bold text-white">Focus Mode</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════
          ROW 3: Focus (5/12) + Reminders (4/12) + Habits (3/12)
          Fixed height: 420px
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4" style={{ height: 420 }}>

        {/* Today's Focus */}
        <motion.div {...fu(6)} className={`col-span-12 lg:col-span-5 ${card} p-6 flex flex-col`}>
          <WH title="Today's Focus" sub={`${topTasks.length} tasks pending`} action="All Tasks" onAction={() => setActiveSection('tasks')} />
          <div className="mb-4 flex-shrink-0">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground/50 font-medium">Progress</span>
              <span className="text-[10px] font-bold text-foreground">{Math.round(pct)}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,hsl(150 52% 28%),hsl(212 82% 54%))' }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
            {topTasks.map((t, i) => {
              const p = PRI[t.priority] || PRI.medium;
              return (
                <motion.div key={t.id} {...fu(i)} onClick={() => setActiveSection('tasks')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all cursor-pointer">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                  <span className="text-[12px] text-foreground flex-1 truncate font-medium">{t.title}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${p.bg} ${p.c}`}>{p.lbl}</span>
                  <span className={`text-[9px] font-mono tabular-nums flex-shrink-0 ${t.dueDate < today ? 'text-rose-500 font-bold' : 'text-muted-foreground/30'}`}>
                    {t.dueDate === today ? 'Today' : t.dueDate.slice(5)}
                  </span>
                </motion.div>
              );
            })}
            {topTasks.length === 0 && <div className="flex flex-col items-center justify-center h-full"><div className="text-4xl mb-3">🎉</div><p className="text-sm font-semibold text-foreground/50">All done!</p></div>}
          </div>
        </motion.div>

        {/* Reminders */}
        <motion.div {...fu(7)} className={`col-span-12 lg:col-span-4 ${card} p-6 flex flex-col`}>
          <WH title="Reminders" sub="Upcoming deadlines" action="Calendar" onAction={() => setActiveSection('calendar')} />
          {upcoming[0] && (
            <div className="mb-4 p-4 rounded-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,hsl(150 52% 26% / 0.07),hsl(150 48% 33% / 0.04))', border: '1px solid hsl(150 52% 26% / 0.12)' }}>
              <div className="text-[9px] text-primary font-bold uppercase tracking-wide mb-1">Next Up</div>
              <div className="text-[13px] font-bold text-foreground truncate mb-1">{upcoming[0].title}</div>
              <div className="text-[10px] text-muted-foreground/50 mb-3">{upcoming[0].dueDate}</div>
              <button onClick={() => setActiveSection('calendar')} className="text-[11px] bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-1.5" style={{ boxShadow: 'var(--shadow-primary)' }}>
                <Calendar size={11} />Calendar
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {upcoming.slice(1).map((t, i) => {
              const d = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000);
              return (
                <motion.div key={t.id} {...fu(i)} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all">
                  <div className="w-9 flex-shrink-0 text-center">
                    <div className="text-[8px] text-muted-foreground/35 leading-none">{new Date(t.dueDate).toLocaleDateString('en', { month: 'short' })}</div>
                    <div className={`text-sm font-extrabold ${d <= 1 ? 'text-rose-500' : d <= 3 ? 'text-amber-500' : 'text-foreground'}`}>{new Date(t.dueDate).getDate()}</div>
                  </div>
                  <div className="w-px h-7 bg-border/40 flex-shrink-0" />
                  <span className="text-[12px] text-foreground flex-1 truncate font-medium">{t.title}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${d <= 1 ? 'bg-rose-500/10 text-rose-500' : d <= 3 ? 'bg-amber-500/10 text-amber-500' : 'bg-secondary text-muted-foreground'}`}>
                    {d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d}d`}
                  </span>
                </motion.div>
              );
            })}
            {upcoming.length === 0 && <div className="py-8 text-center text-muted-foreground/40 text-sm">No deadlines 🌟</div>}
          </div>
        </motion.div>

        {/* Habits */}
        <motion.div {...fu(8)} className={`col-span-12 lg:col-span-3 ${card} p-6 flex flex-col`}>
          <WH title="Habits" sub={`${habits.filter(h => h.completions?.includes(today)).length}/${habits.length} today`} action="Track" onAction={() => setActiveSection('habits')} />
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {habits.slice(0, 7).map((h, i) => {
              const isDone = h.completions?.includes(today);
              return (
                <motion.div key={h.id} {...fu(i)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all ${isDone ? 'bg-emerald-500/8 border border-emerald-500/14' : 'hover:bg-secondary/50 border border-transparent'}`}>
                  <span className="text-base">{h.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-foreground truncate">{h.name}</div>
                    <div className="text-[9px] text-muted-foreground/40">{h.frequency}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0"><Flame size={10} className="text-amber-500" /><span className="text-[10px] font-extrabold text-amber-500 tabular-nums">{h.streak}</span></div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] ${isDone ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground/25'}`}>{isDone ? '✓' : ''}</div>
                </motion.div>
              );
            })}
            {habits.length === 0 && <div className="py-8 text-center"><div className="text-3xl mb-2">🔥</div><p className="text-[11px] text-muted-foreground/50 mb-2">No habits yet</p><button onClick={() => setActiveSection('habits')} className="text-[11px] text-primary font-semibold hover:underline">Start →</button></div>}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════
          ROW 4: Finance (5/12) + Progress (4/12) + Notes (3/12)
          Fixed height: 380px
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4" style={{ height: 380 }}>

        {/* Finance */}
        <motion.div {...fu(9)} className={`col-span-12 lg:col-span-5 ${card} p-6 flex flex-col`}>
          <WH title="Finance" sub="Income, expenses & profit" action="Details" onAction={() => setActiveSection('payments')} />
          <div className="grid grid-cols-3 gap-2.5 mb-4 flex-shrink-0">
            {[
              { lbl: 'Income', val: income, Icon: ArrowUpRight, c: 'text-emerald-500', bg: 'bg-emerald-500/8' },
              { lbl: 'Expenses', val: expense, Icon: ArrowDownRight, c: 'text-rose-500', bg: 'bg-rose-500/8' },
              { lbl: 'Pending', val: pending, Icon: Clock, c: 'text-amber-500', bg: 'bg-amber-500/8' },
            ].map(d => (
              <div key={d.lbl} className={`text-center p-4 rounded-2xl ${d.bg}`}>
                <d.Icon size={14} className={`${d.c} mx-auto mb-2 opacity-70`} />
                <div className={`text-base font-extrabold ${d.c} tabular-nums leading-tight`}>{fmt(d.val)}</div>
                <div className="text-[9px] text-muted-foreground/45 mt-1 font-medium">{d.lbl}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/20 mb-3 flex-shrink-0">
            <div>
              <div className="text-[10px] text-muted-foreground/50 mb-0.5">Net Profit</div>
              <div className={`text-2xl font-extrabold tabular-nums ${income - expense >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fmt(income - expense)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground/40">{payments.length} transactions</div>
              <div className={`text-[11px] font-semibold mt-0.5 ${income - expense >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{income - expense >= 0 ? '▲ Profitable' : '▼ Loss'}</div>
            </div>
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
        </motion.div>

        {/* Progress / Ideas */}
        <motion.div {...fu(10)} className={`col-span-12 lg:col-span-4 ${card} p-6 flex flex-col`}>
          <WH title="Progress" sub={`${done.length} of ${tasks.length} tasks done`} action="Ideas" onAction={() => setActiveSection('ideas')} />
          <div className="flex items-center justify-center my-2 flex-shrink-0">
            <div className="relative" style={{ width: 110, height: 110 }}>
              <svg width="110" height="110" className="-rotate-90">
                <circle cx="55" cy="55" r="46" fill="none" stroke="currentColor" strokeWidth="9" className="text-secondary" />
                <motion.circle cx="55" cy="55" r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="9" strokeLinecap="round"
                  initial={{ strokeDasharray: 289, strokeDashoffset: 289 }}
                  animate={{ strokeDashoffset: 289 - (pct / 100) * 289 }}
                  transition={{ duration: 1.3, ease: 'easeOut' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-foreground">{Math.round(pct)}%</span>
                <span className="text-[9px] text-muted-foreground/50">done</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mb-4 flex-shrink-0">
            {[{ lbl: 'Done', val: done.length, c: 'bg-primary' }, { lbl: 'Active', val: open.filter(t => t.status === 'in-progress').length, c: 'bg-blue-500' }, { lbl: 'Todo', val: open.filter(t => t.status === 'todo').length, c: 'bg-amber-500' }].map(s => (
              <div key={s.lbl} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${s.c}`} /><span className="text-[10px] text-muted-foreground/55">{s.lbl} <strong className="text-foreground">{s.val}</strong></span></div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {topIdeas.map((idea, i) => (
              <motion.div key={idea.id} {...fu(i)} onClick={() => setActiveSection('ideas')} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-secondary/50 cursor-pointer transition-all">
                <span className="text-[12px] font-extrabold text-primary bg-primary/8 w-8 h-8 rounded-xl flex items-center justify-center tabular-nums flex-shrink-0">{idea.votes}</span>
                <div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-foreground truncate">{idea.title}</div><div className="text-[9px] text-muted-foreground/40">{idea.category}</div></div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${idea.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500' : idea.status === 'exploring' ? 'bg-blue-500/10 text-blue-500' : 'bg-secondary text-muted-foreground'}`}>{idea.status}</span>
              </motion.div>
            ))}
            {topIdeas.length === 0 && <div className="py-4 text-center text-[11px] text-muted-foreground/40">No active ideas</div>}
          </div>
        </motion.div>

        {/* Pinned Notes */}
        <motion.div {...fu(11)} className={`col-span-12 lg:col-span-3 ${card} p-6 flex flex-col`}>
          <WH title="Notes" sub={`${pinnedNotes.length} pinned`} action="All" onAction={() => setActiveSection('notes')} />
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {pinnedNotes.map((n, i) => {
              const accents = ['border-primary/20 bg-primary/4', 'border-amber-500/20 bg-amber-500/4', 'border-blue-500/20 bg-blue-500/4', 'border-emerald-500/20 bg-emerald-500/4'];
              const dots = ['bg-primary', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
              return (
                <motion.button key={n.id} {...fu(i)} onClick={() => setActiveSection('notes')} whileHover={{ scale: 1.01 }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${accents[i % 4]}`}>
                  <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${dots[i % 4]}`} /><div className="text-[12px] font-bold text-foreground truncate">{n.title}</div></div>
                  <div className="text-[10px] text-muted-foreground/50 line-clamp-2 leading-relaxed ml-4">{n.content.slice(0, 80)}</div>
                  <div className="text-[9px] text-muted-foreground/30 mt-1 ml-4">{new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </motion.button>
              );
            })}
            {pinnedNotes.length === 0 && <div className="flex flex-col items-center pt-6 pb-2"><FileText size={26} className="text-muted-foreground/20 mb-3" /><p className="text-[11px] text-muted-foreground/45 mb-2">No pinned notes</p><button onClick={() => setActiveSection('notes')} className="text-[11px] text-primary font-semibold hover:underline">Create one →</button></div>}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════
          ROW 5: Platforms (5/12) + Projects (4/12) + Websites (3/12)
          Fixed height: 340px
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4" style={{ height: 340 }}>

        {/* Platforms & Team */}
        <motion.div {...fu(12)} className={`col-span-12 lg:col-span-5 ${card} p-6 flex flex-col`}>
          <WH title="Platforms & Team" sub="Status & collaboration" action="Manage" onAction={() => setActiveSection('cloudflare')} />
          <div className="flex-1 space-y-1">
            {[
              { name: 'Cloudflare', ok: true, e: '☁️', s: 'cloudflare', up: '99.9%' },
              { name: 'Vercel', ok: true, e: '⚡', s: 'vercel', up: '99.8%' },
              { name: 'GitHub', ok: true, e: '🐙', s: 'github', up: '99.9%' },
              { name: 'OpenClaw', ok: true, e: '🐾', s: 'openclaw', up: '100%' },
            ].map(p => (
              <motion.button key={p.name} onClick={() => setActiveSection(p.s)} whileHover={{ x: 2 }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all">
                <span className="text-base">{p.e}</span>
                <div className="flex-1 text-left">
                  <div className="text-[12px] font-semibold text-foreground">{p.name}</div>
                  <div className={`text-[9px] flex items-center gap-1 ${p.ok ? 'text-emerald-500' : 'text-amber-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${p.ok ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />{p.ok ? 'Operational' : 'Warning'}
                  </div>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground/30">{p.up}</span>
              </motion.button>
            ))}
          </div>
          <div className="border-t border-border/20 pt-4 mt-2 flex-shrink-0">
            <div className="text-[9px] text-muted-foreground/35 font-bold uppercase tracking-widest mb-2.5">Team</div>
            <div className="flex items-center gap-1">
              {['A', 'E', 'I', 'D'].map((l, i) => (
                <div key={i} title={['Alexandra', 'Edwin', 'Isaac', 'David'][i]}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground text-[10px] font-bold ring-2 ring-card cursor-pointer hover:scale-110 hover:-translate-y-0.5 transition-transform"
                  style={{ background: 'linear-gradient(135deg,hsl(150 52% 26%),hsl(150 48% 35%))', marginLeft: i > 0 ? -6 : 0, boxShadow: '0 2px 8px hsl(0 0% 0% / 0.12)' }}>
                  {l}
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground/45 font-medium ml-3">4 members</span>
            </div>
          </div>
        </motion.div>

        {/* Projects */}
        <motion.div {...fu(13)} className={`col-span-12 lg:col-span-4 ${card} p-6 flex flex-col`}>
          <WH title="Projects" sub={`${recentBuilds.length} recent`} action="Manage" onAction={() => setActiveSection('builds')} />
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {recentBuilds.map((b, i) => {
              const icons = ['🔧', '🚀', '📦', '⚡', '🎯'];
              const sc: any = { deployed: 'text-emerald-500 bg-emerald-500/10', building: 'text-blue-500 bg-blue-500/10', testing: 'text-amber-500 bg-amber-500/10', ideation: 'text-muted-foreground bg-secondary' };
              return (
                <motion.div key={b.id} {...fu(i)} onClick={() => setActiveSection('builds')} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-secondary/50 cursor-pointer group transition-all">
                  <div className="w-9 h-9 rounded-xl bg-secondary/80 flex items-center justify-center text-base flex-shrink-0 group-hover:bg-primary/10 transition-colors">{icons[i % 5]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-foreground truncate">{b.name}</div>
                    <div className="text-[9px] text-muted-foreground/40">{b.platform} · {b.lastWorkedOn.slice(0, 10)}</div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${sc[b.status] || sc.ideation}`}>{b.status}</span>
                </motion.div>
              );
            })}
            {recentBuilds.length === 0 && <div className="py-8 text-center"><div className="text-3xl mb-2">🚀</div><p className="text-[12px] text-muted-foreground/50 mb-2">No projects</p><button onClick={() => setActiveSection('builds')} className="text-[11px] text-primary font-semibold hover:underline">Add →</button></div>}
          </div>
        </motion.div>

        {/* Websites */}
        <motion.div {...fu(14)} className={`col-span-12 lg:col-span-3 ${card} p-6 flex flex-col`}>
          <WH title="Websites" sub={`${activeSites} live`} action="Manage" onAction={() => setActiveSection('websites')} />
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {websites.slice(0, 7).map((w, i) => (
              <motion.div key={w.id} {...fu(i)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all cursor-pointer group">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-card ${w.status === 'active' ? 'bg-emerald-500 ring-emerald-500/25' : w.status === 'maintenance' ? 'bg-amber-500 ring-amber-500/25' : 'bg-rose-500 ring-rose-500/25'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-foreground truncate">{w.name}</div>
                  <div className="text-[9px] text-muted-foreground/40">{w.hostingProvider || w.category}</div>
                </div>
                <a href={w.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl hover:bg-secondary transition-all">
                  <ExternalLink size={11} className="text-primary" />
                </a>
              </motion.div>
            ))}
            {websites.length === 0 && <div className="py-8 text-center"><Globe size={26} className="text-muted-foreground/20 mx-auto mb-2" /><p className="text-[11px] text-muted-foreground/50 mb-2">No websites</p><button onClick={() => setActiveSection('websites')} className="text-[11px] text-primary font-semibold hover:underline">Add →</button></div>}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
