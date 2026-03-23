import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, SkipForward, Coffee, Flame, Zap, TreePine } from "lucide-react";

const PRESETS = [
  { label: "Focus", minutes: 25, icon: Zap, emoji: "🍅", gradient: "from-primary to-accent" },
  { label: "Short Break", minutes: 5, icon: Coffee, emoji: "☕", gradient: "from-emerald-500 to-teal-500" },
  { label: "Long Break", minutes: 15, icon: TreePine, emoji: "🌿", gradient: "from-blue-500 to-indigo-500" },
];

export default function FocusPage() {
  const [preset, setPreset] = useState(0);
  const [totalSec, setTotalSec] = useState(PRESETS[0].minutes * 60);
  const [remaining, setRemaining] = useState(PRESETS[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining(r => r - 1), 1000);
    } else {
      clearInterval(intervalRef.current);
      if (remaining === 0 && running) {
        setRunning(false);
        if (preset === 0) setSessions(s => s + 1);
        // Auto-advance to break after focus
        if (preset === 0) {
          const nextPreset = sessions > 0 && (sessions + 1) % 4 === 0 ? 2 : 1;
          setPreset(nextPreset);
          setTotalSec(PRESETS[nextPreset].minutes * 60);
          setRemaining(PRESETS[nextPreset].minutes * 60);
        }
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining, preset, sessions]);

  const selectPreset = (i: number) => {
    setPreset(i);
    setTotalSec(PRESETS[i].minutes * 60);
    setRemaining(PRESETS[i].minutes * 60);
    setRunning(false);
  };

  const reset = () => { setRemaining(totalSec); setRunning(false); };
  const skip = () => {
    setRunning(false);
    if (preset === 0) setSessions(s => s + 1);
    const next = preset === 0 ? 1 : 0;
    selectPreset(next);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = totalSec > 0 ? ((totalSec - remaining) / totalSec) * 100 : 0;
  const r = 90;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  const currentPreset = PRESETS[preset];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 sm:gap-8 px-4">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
          <Flame size={22} className="text-primary" />
          Focus Timer
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1">
          Session #{sessions + 1} · {sessions} completed today
        </p>
      </motion.div>

      {/* Preset tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-secondary/50 border border-border/20">
        {PRESETS.map((p, i) => (
          <motion.button
            key={i}
            onClick={() => selectPreset(i)}
            whileTap={{ scale: 0.95 }}
            className={`relative px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation
              ${preset === i
                ? 'bg-card text-foreground shadow-[var(--shadow-md)]'
                : 'text-muted-foreground hover:text-foreground'}`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <span>{p.emoji}</span>
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">{p.minutes}m</span>
            </span>
          </motion.button>
        ))}
      </div>

      {/* Timer ring */}
      <motion.div
        key={preset}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative"
      >
        {/* Glow effect */}
        {running && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: `radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)`,
              transform: 'scale(1.3)',
            }}
          />
        )}

        <svg width="260" height="260" viewBox="0 0 200 200" className="drop-shadow-lg">
          {/* Background ring */}
          <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--muted) / 0.5)" strokeWidth="6" />
          {/* Progress ring */}
          <motion.circle
            cx="100" cy="100" r={r} fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            transform="rotate(-90 100 100)"
            style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))' }}
          />
          {/* Dot at end of progress */}
          {pct > 0 && pct < 100 && (
            <motion.circle
              cx={100 + r * Math.cos((pct / 100) * 2 * Math.PI - Math.PI / 2)}
              cy={100 + r * Math.sin((pct / 100) * 2 * Math.PI - Math.PI / 2)}
              r="5"
              fill="hsl(var(--primary))"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' }}
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={`${mm}:${ss}`}
            className="text-[56px] sm:text-[64px] font-extrabold text-foreground tracking-tighter tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {mm}:{ss}
          </motion.span>
          <span className="text-xs sm:text-sm text-muted-foreground/50 font-medium mt-2 flex items-center gap-1.5">
            <span>{currentPreset.emoji}</span>
            {currentPreset.label}
          </span>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={reset}
          whileTap={{ scale: 0.88 }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/60 border border-border/30 text-muted-foreground flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all touch-manipulation"
        >
          <RotateCcw size={20} />
        </motion.button>

        <motion.button
          onClick={() => setRunning(!running)}
          whileTap={{ scale: 0.88 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] gradient-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-primary)] hover:shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.5)] transition-all touch-manipulation"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={running ? 'pause' : 'play'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {running ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <motion.button
          onClick={skip}
          whileTap={{ scale: 0.88 }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary/60 border border-border/30 text-muted-foreground flex items-center justify-center hover:bg-secondary hover:text-foreground transition-all touch-manipulation"
        >
          <SkipForward size={20} />
        </motion.button>
      </div>

      {/* Session stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-6 px-6 py-4 rounded-2xl bg-card border border-border/30 shadow-[var(--shadow-sm)]"
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground tabular-nums">{sessions}</div>
          <div className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">Sessions</div>
        </div>
        <div className="w-px h-8 bg-border/30" />
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground tabular-nums">{sessions * 25}</div>
          <div className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">Minutes</div>
        </div>
        <div className="w-px h-8 bg-border/30" />
        <div className="text-center">
          <div className="text-2xl font-bold text-primary tabular-nums flex items-center gap-1">
            <Flame size={16} />{sessions}
          </div>
          <div className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">Streak</div>
        </div>
      </motion.div>
    </div>
  );
}
