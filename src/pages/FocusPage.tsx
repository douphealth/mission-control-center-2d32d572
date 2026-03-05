import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";

const PRESETS = [
  { label: "🍅 Focus", minutes: 25, color: "primary" },
  { label: "☕ Break", minutes: 5, color: "success" },
  { label: "🌿 Long Break", minutes: 15, color: "accent" },
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
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining, preset]);

  const selectPreset = (i: number) => {
    setPreset(i);
    setTotalSec(PRESETS[i].minutes * 60);
    setRemaining(PRESETS[i].minutes * 60);
    setRunning(false);
  };

  const reset = () => { setRemaining(totalSec); setRunning(false); };
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = totalSec > 0 ? ((totalSec - remaining) / totalSec) * 100 : 0;
  const r = 90;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground text-center">Focus Timer</h1>

      <div className="flex justify-center gap-2">
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => selectPreset(i)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${preset === i ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <div className="relative">
          <svg width="240" height="240" viewBox="0 0 200 200" className={running ? "animate-pulse-ring" : ""}>
            <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="100" cy="100" r={r} fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-card-foreground tracking-tight">{mm}:{ss}</span>
            <span className="text-sm text-muted-foreground mt-1">{PRESETS[preset].label}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button onClick={() => setRunning(!running)} className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition">
          {running ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={reset} className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition">
          <RotateCcw size={24} />
        </button>
      </div>

      <div className="text-center">
        <span className="text-sm text-muted-foreground">Focus Session #{sessions + 1} today · {sessions} completed</span>
      </div>
    </div>
  );
}
