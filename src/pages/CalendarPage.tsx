import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, Clock, Tag,
  CheckSquare, AlertTriangle, Zap, Edit2, Trash2, ExternalLink,
  List, LayoutGrid, AlignLeft, Filter, RefreshCw, Flag,
  Loader2, Link2, Cloud, CloudOff, Settings
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/db";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { isGCalConnected, getGCalConfig, setGCalConfig } from "@/lib/googleCalendar";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CalEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  color: string;
  category: string;
  description?: string;
  isTask?: boolean;
  taskId?: string;
  priority?: string;
  status?: string;
  allDay: boolean;
  isGoogleEvent?: boolean;
  htmlLink?: string;
  googleEventId?: string;
}

type ViewMode = "month" | "week" | "agenda";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_MINI = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#10b981",
};

const EVENT_COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Green", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Indigo", value: "#6366f1" },
];

const CATEGORIES = ["Work", "Personal", "Meeting", "Deadline", "Event", "Health", "Travel", "Learning"];

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

// ─── Event Modal (bottom sheet on mobile) ──────────────────────────────────────

interface EventModalProps {
  open: boolean;
  event?: Partial<CalEvent>;
  onClose: () => void;
  onSave: (ev: Omit<CalEvent, "id"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
}

function EventModal({ open, event, onClose, onSave, onDelete }: EventModalProps) {
  const today = fmtDate(new Date());
  const [title, setTitle] = useState(event?.title || "");
  const [date, setDate] = useState(event?.date || today);
  const [endDate, setEndDate] = useState(event?.endDate || "");
  const [start, setStart] = useState(event?.startTime || "");
  const [end, setEnd] = useState(event?.endTime || "");
  const [color, setColor] = useState(event?.color || "#3b82f6");
  const [cat, setCat] = useState(event?.category || "Work");
  const [desc, setDesc] = useState(event?.description || "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);

  useEffect(() => {
    if (open) {
      setTitle(event?.title || "");
      setDate(event?.date || today);
      setEndDate(event?.endDate || "");
      setStart(event?.startTime || "09:00");
      setEnd(event?.endTime || "10:00");
      setColor(event?.color || "#3b82f6");
      setCat(event?.category || "Work");
      setDesc(event?.description || "");
      setAllDay(event?.allDay ?? false);
    }
  }, [event, open, today]);

  const save = () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    onSave({ id: event?.id, title: title.trim(), date, endDate: endDate || undefined, startTime: allDay ? undefined : start || undefined, endTime: allDay ? undefined : end || undefined, color, category: cat, description: desc, allDay, isTask: event?.isTask, taskId: event?.taskId, priority: event?.priority, status: event?.status });
    onClose();
  };

  const isEdit = !!event?.id;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}>
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.18 }}
            className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Color accent bar */}
            <div className="h-1.5 w-full" style={{ background: color }} />

            {/* Drag handle on mobile */}
            <div className="flex justify-center pt-2 pb-0 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/15" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-border/50">
              <h2 className="text-base font-bold text-card-foreground flex items-center gap-2">
                <Calendar size={16} style={{ color }} />
                {isEdit ? "Edit Event" : "New Event"}
              </h2>
              <div className="flex items-center gap-2">
                {isEdit && onDelete && !event?.isTask && (
                  <button onClick={() => { onDelete(event.id!); onClose(); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation">
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors touch-manipulation">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Title */}
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && save()}
                placeholder="Event title..."
                className="w-full text-lg font-semibold bg-transparent text-card-foreground outline-none placeholder:text-muted-foreground/50 border-b border-border/40 pb-2"
              />

              {/* Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* All-day toggle */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAllDay(a => !a)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${allDay ? "bg-primary" : "bg-secondary"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allDay ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-sm text-muted-foreground">All day</span>
              </div>

              {/* Time row */}
              {!allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Start time</label>
                    <input type="time" value={start} onChange={e => setStart(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">End time</label>
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              )}

              {/* Category + Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Category</label>
                  <select value={cat} onChange={e => setCat(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none appearance-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Color</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {EVENT_COLORS.map(c => (
                      <button key={c.value} type="button" onClick={() => setColor(c.value)}
                        title={c.label}
                        className={`w-6 h-6 rounded-full transition-all touch-manipulation ${color === c.value ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "hover:scale-105"}`}
                        style={{ background: c.value }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Notes</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optional details..."
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50" />
              </div>

              {event?.isTask && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-3">
                  <CheckSquare size={12} className="text-emerald-500" />
                  <span>Linked to Task — changes sync automatically.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation">
                Cancel
              </button>
              <button onClick={save}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 touch-manipulation"
                style={{ background: color }}>
                {isEdit ? "Save Changes" : "Add Event"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Event Pill ───────────────────────────────────────────────────────────────

function EventPill({ ev, onClick, compact }: { ev: CalEvent; onClick: (e: React.MouseEvent) => void; compact?: boolean }) {
  const isTask = ev.isTask;
  const isGoogle = ev.isGoogleEvent;
  if (compact) {
    return (
      <button onClick={onClick}
        className="w-full h-1 rounded-full"
        style={{ background: ev.color }} />
    );
  }
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium transition-all hover:brightness-110 active:scale-95 flex items-center gap-1 touch-manipulation"
      style={{ background: ev.color + "22", color: ev.color, borderLeft: `2.5px solid ${ev.color}` }}>
      {isTask && <CheckSquare size={8} className="shrink-0" />}
      {isGoogle && <Cloud size={8} className="shrink-0 opacity-70" />}
      {ev.startTime && !compact && <span className="opacity-70 shrink-0">{ev.startTime}</span>}
      <span className="truncate">{ev.title}</span>
    </button>
  );
}

// ─── Day Detail Bottom Sheet (mobile) ─────────────────────────────────────────

function DayDetailSheet({ date, events, onClose, onAdd, onEdit, onToggleTask }: {
  date: string;
  events: CalEvent[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (ev: CalEvent) => void;
  onToggleTask: (taskId: string, status: string) => void;
}) {
  const d = parseDate(date);
  const today = fmtDate(new Date());
  const isToday = date === today;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              {isToday && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              {d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onAdd} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors touch-manipulation">
              <Plus size={16} />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary transition-colors touch-manipulation sm:block hidden">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Events list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-[env(safe-area-inset-bottom)]">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No events</p>
              <button onClick={onAdd} className="text-primary text-sm font-semibold mt-2 hover:underline touch-manipulation">+ Add event</button>
            </div>
          ) : events.map(ev => (
            <motion.button key={ev.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => ev.isGoogleEvent && ev.htmlLink ? window.open(ev.htmlLink, '_blank') : onEdit(ev)}
              className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 hover:border-primary/20 hover:bg-secondary/30 transition-all touch-manipulation active:scale-[0.98]">
              <div className="w-1 h-10 rounded-full shrink-0" style={{ background: ev.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {ev.isTask && <CheckSquare size={11} className="text-muted-foreground shrink-0" />}
                  {ev.isGoogleEvent && <Cloud size={11} className="text-blue-400 shrink-0" />}
                  <span className={`text-sm font-semibold text-foreground truncate ${ev.status === "done" ? "line-through opacity-50" : ""}`}>
                    {ev.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {ev.startTime && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock size={8} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ""}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/50">{ev.category}</span>
                </div>
              </div>
              {ev.isTask && ev.taskId && (
                <button onClick={e => { e.stopPropagation(); onToggleTask(ev.taskId!, ev.status || "todo"); }}
                  className={`p-2 rounded-xl transition-colors touch-manipulation ${ev.status === "done" ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"}`}>
                  <CheckSquare size={16} />
                </button>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "mc_calendar_events";

function loadEvents(): CalEvent[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveEvents(evs: CalEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(evs));
}

export default function CalendarPage() {
  const { tasks, updateItem, setActiveSection } = useDashboard();
  const isMobile = useIsMobile();
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>(loadEvents);
  const [modal, setModal] = useState<{ open: boolean; event?: Partial<CalEvent>; date?: string }>({ open: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showGCalSetup, setShowGCalSetup] = useState(false);
  const [gcalClientId, setGcalClientId] = useState(getGCalConfig().clientId);

  const today = fmtDate(new Date());

  // ── Google Calendar integration ────────────────────────────────────────────
  const gcal = useGoogleCalendar({ autoFetch: true });

  const googleEvents: CalEvent[] = useMemo(() =>
    gcal.events.map(gev => ({
      id: gev.id,
      title: gev.title,
      date: gev.date,
      endDate: gev.endDate,
      startTime: gev.startTime,
      endTime: gev.endTime,
      color: gev.color,
      category: gev.category,
      description: gev.description,
      isTask: false,
      isGoogleEvent: true,
      allDay: gev.allDay,
      htmlLink: gev.htmlLink,
      googleEventId: gev.googleEventId,
    })),
    [gcal.events]);

  const taskEvents: CalEvent[] = useMemo(() =>
    tasks.filter(t => t.dueDate).map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      date: t.dueDate,
      color: PRIORITY_COLOR[t.priority] || "#3b82f6",
      category: t.category || "Deadline",
      description: t.description,
      isTask: true,
      taskId: t.id,
      priority: t.priority,
      status: t.status,
      startTime: t.startTime,
      endTime: t.endTime,
      allDay: t.allDay !== false,
    })),
    [tasks]);

  const allEvents = useMemo(() => {
    const taskIds = new Set(taskEvents.map(te => te.id));
    const cleanEvents = events.filter(e => !taskIds.has(e.id));
    return [...cleanEvents, ...taskEvents, ...googleEvents];
  }, [events, taskEvents, googleEvents]);

  const filteredEvents = useMemo(() =>
    allEvents.filter(e => filter === "all" || e.category === filter || (filter === "Google Calendar" && e.isGoogleEvent)),
    [allEvents, filter]);

  // ── Compute month grid ──────────────────────────────────────────────────────
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const monthCells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) monthCells.push(d);
  while (monthCells.length < totalCells) monthCells.push(null);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    filteredEvents.forEach(e => {
      if (e.endDate && e.endDate > e.date) {
        let cur = parseDate(e.date);
        const end = parseDate(e.endDate);
        while (cur <= end) {
          const k = fmtDate(cur);
          (map[k] = map[k] || []).push(e);
          cur = addDays(cur, 1);
        }
      } else {
        (map[e.date] = map[e.date] || []).push(e);
      }
    });
    return map;
  }, [filteredEvents]);

  // ── Week view dates ──────────────────────────────────────────────────────────
  const weekStart = startOfWeek(cursor);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ── Agenda: upcoming events ───────────────────────────────────────────────────
  const agendaEvents = useMemo(() => {
    const sorted = filteredEvents
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""));
    const groups: { date: string; events: CalEvent[] }[] = [];
    sorted.forEach(ev => {
      const last = groups[groups.length - 1];
      if (last && last.date === ev.date) last.events.push(ev);
      else groups.push({ date: ev.date, events: [ev] });
    });
    return groups;
  }, [filteredEvents, today]);

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const saveEvent = useCallback(async (ev: Omit<CalEvent, "id"> & { id?: string }) => {
    if (ev.isTask && ev.taskId) {
      await updateItem<Task>("tasks", ev.taskId, {
        title: ev.title,
        dueDate: ev.date,
        description: ev.description || "",
        category: ev.category,
        startTime: ev.allDay ? undefined : ev.startTime,
        endTime: ev.allDay ? undefined : ev.endTime,
        allDay: ev.allDay,
      });
      setEvents(prev => {
        const next = prev.filter(e => e.id !== ev.id);
        saveEvents(next);
        return next;
      });
      toast.success("Task & calendar event updated");
      return;
    }
    setEvents(prev => {
      let next: CalEvent[];
      if (ev.id) {
        const exists = prev.some(e => e.id === ev.id);
        if (exists) {
          next = prev.map(e => e.id === ev.id ? { ...e, ...ev } as CalEvent : e);
        } else {
          next = [...prev, { ...ev, id: ev.id } as CalEvent];
        }
      } else {
        next = [...prev, { ...ev, id: `evt-${Date.now()}` } as CalEvent];
      }
      saveEvents(next);
      return next;
    });
    toast.success(ev.id ? "Event updated" : "Event created");
  }, [updateItem]);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => { const n = prev.filter(e => e.id !== id); saveEvents(n); return n; });
    toast.success("Event deleted");
  }, []);

  const openNewEvent = (date: string) => {
    setModal({ open: true, event: { date, allDay: false, startTime: "09:00", endTime: "10:00" } });
  };

  const openEditEvent = (ev: CalEvent) => {
    setModal({ open: true, event: ev });
  };

  const toggleTaskDone = async (taskId: string, currentStatus: string) => {
    const next = currentStatus === "done" ? "todo" : "done";
    await updateItem<Task>("tasks", taskId, { status: next });
    toast.success(next === "done" ? "✅ Task marked done!" : "Task reopened");
  };

  // ── Navigation ─────────────────────────────────────────────────────────────────
  const prev = () => {
    if (view === "month") setCursor(new Date(year, month - 1, 1));
    else if (view === "week") setCursor(d => addDays(d, -7));
    else setCursor(d => addDays(d, -7));
  };
  const next = () => {
    if (view === "month") setCursor(new Date(year, month + 1, 1));
    else if (view === "week") setCursor(d => addDays(d, 7));
    else setCursor(d => addDays(d, 7));
  };
  const goToday = () => setCursor(new Date());

  const headerLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[month]} ${year}`;
    if (view === "week") {
      return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return "Agenda";
  }, [view, cursor]);

  const selectedEvents = selected ? (eventsByDate[selected] || []) : [];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-0" style={{ height: isMobile ? 'auto' : "calc(100vh - 140px)" }}>
      {/* ── Main Calendar ─── */}
      <div className="flex-1 flex flex-col space-y-3 sm:space-y-4 min-w-0 overflow-auto">

        {/* Google Calendar Sync Bar */}
        {gcal.connected ? (
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/8 via-green-500/5 to-purple-500/8 border border-blue-500/15">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" alt="" className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate">Google Calendar</span>
              {gcal.lastSync && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">· {new Date(gcal.lastSync).toLocaleTimeString()}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => gcal.syncEvents(true)} disabled={gcal.syncing}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors touch-manipulation">
                {gcal.syncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-border/40 cursor-pointer hover:border-primary/30 transition-all touch-manipulation"
            onClick={() => setShowGCalSetup(s => !s)}>
            <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" alt="" className="w-5 h-5 shrink-0 opacity-60" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground">Connect Google Calendar</div>
              <div className="text-[11px] text-muted-foreground hidden sm:block">See all your events in one place</div>
            </div>
            <ChevronRight size={14} className={`text-muted-foreground transition-transform ${showGCalSetup ? 'rotate-90' : ''}`} />
          </div>
        )}

        {/* GCal setup inline */}
        <AnimatePresence>
          {showGCalSetup && !gcal.connected && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="card-elevated p-4 sm:p-5 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" alt="" className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Quick Setup</h3>
                    <p className="text-[11px] text-muted-foreground">Enter your Google Cloud OAuth Client ID</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <input
                    value={gcalClientId}
                    onChange={e => setGcalClientId(e.target.value)}
                    placeholder="Google OAuth Client ID..."
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40 font-mono text-xs"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={async () => {
                        if (!gcalClientId.trim()) { toast.error('Enter your Client ID first'); return; }
                        const result = await gcal.connect(gcalClientId.trim());
                        if (result.success) {
                          toast.success(`✅ Connected as ${result.email}`);
                          setShowGCalSetup(false);
                        } else {
                          toast.error(result.error || 'Connection failed');
                        }
                      }}
                      disabled={gcal.connecting || !gcalClientId.trim()}
                      className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40 touch-manipulation">
                      {gcal.connecting ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                      Connect
                    </button>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      Get Client ID <ExternalLink size={9} />
                    </a>
                  </div>
                  {gcal.error && (
                    <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{gcal.error}</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header / Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Nav buttons */}
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground touch-manipulation">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday} className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors whitespace-nowrap touch-manipulation">
              Today
            </button>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground touch-manipulation">
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-foreground flex-1 truncate">{headerLabel}</h2>

          {/* View toggles */}
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
            {(["month", "week", "agenda"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize touch-manipulation ${view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {v === "month" && isMobile ? "Mo" : v === "agenda" && isMobile ? "Ag" : v}
              </button>
            ))}
          </div>

          {/* Filter + Add */}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-medium outline-none appearance-none cursor-pointer touch-manipulation hidden sm:block">
            <option value="all">All</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            {gcal.connected && <option value="Google Calendar">Google</option>}
          </select>

          <button onClick={() => openNewEvent(today)}
            className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 touch-manipulation">
            <Plus size={14} /> <span className="hidden sm:inline">New Event</span><span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* ── MONTH VIEW ─────────────────────────────────────────────────────── */}
        {view === "month" && (
          <div className="card-elevated flex-1 overflow-hidden flex flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/40">
              {(isMobile ? DAYS_MINI : DAYS_SHORT).map((d, i) => (
                <div key={`${d}-${i}`} className={`py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold tracking-wide ${i === 0 || i === 6 ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${monthCells.length / 7}, 1fr)` }}>
              {monthCells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div key={`empty-${idx}`}
                      className={`border-b border-r border-border/20 p-0.5 sm:p-1 ${idx % 7 === 6 ? "border-r-0" : ""} bg-secondary/20`} />
                  );
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvts = eventsByDate[dateStr] || [];
                const isToday = dateStr === today;
                const isSel = dateStr === selected;
                const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                const hasOverdue = dayEvts.some(e => e.isTask && e.status !== "done" && e.date < today);

                return (
                  <motion.div key={dateStr}
                    initial={false}
                    className={`
                      border-b border-r border-border/20 p-0.5 sm:p-1 group relative cursor-pointer transition-all
                      ${isMobile ? 'min-h-[52px]' : 'min-h-[90px]'}
                      ${idx % 7 === 6 ? "border-r-0" : ""}
                      ${isWeekend ? "bg-secondary/10" : ""}
                      ${isSel ? "bg-primary/8 ring-1 ring-inset ring-primary/30" : "hover:bg-secondary/30"}
                      ${isToday ? "bg-primary/6" : ""}
                    `}
                    onClick={() => {
                      if (isMobile) {
                        setSelected(dateStr);
                      } else {
                        setSelected(isSel ? null : dateStr);
                      }
                    }}>

                    {/* Day number */}
                    <div className="flex items-start justify-between mb-0.5 sm:mb-1">
                      <span className={`
                        inline-flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold transition-all
                        ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}
                        ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}
                      `}>
                        {day}
                      </span>
                      {/* Quick add — desktop only */}
                      {!isMobile && (
                        <button
                          onClick={e => { e.stopPropagation(); openNewEvent(dateStr); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-primary/10 text-primary transition-all">
                          <Plus size={11} />
                        </button>
                      )}
                    </div>

                    {/* Events — compact dots on mobile, pills on desktop */}
                    <div className={isMobile ? "flex flex-wrap gap-0.5 px-0.5" : "space-y-0.5"}>
                      {isMobile ? (
                        <>
                          {dayEvts.slice(0, 3).map(ev => (
                            <div key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }} />
                          ))}
                          {dayEvts.length > 3 && (
                            <span className="text-[8px] text-muted-foreground font-bold">+{dayEvts.length - 3}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {dayEvts.slice(0, 3).map(ev => (
                            <EventPill key={ev.id} ev={ev} onClick={e => { e.stopPropagation(); openEditEvent(ev); }} />
                          ))}
                          {dayEvts.length > 3 && (
                            <button onClick={e => { e.stopPropagation(); setSelected(dateStr); }}
                              className="text-[9px] text-muted-foreground hover:text-primary font-semibold pl-1">
                              +{dayEvts.length - 3} more
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Overdue dot */}
                    {hasOverdue && (
                      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── WEEK VIEW ──────────────────────────────────────────────────────── */}
        {view === "week" && (
          <div className="card-elevated flex-1 overflow-hidden flex flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/40">
              {weekDates.map((d, i) => {
                const ds = fmtDate(d);
                const isT = ds === today;
                return (
                  <div key={ds} className={`py-2 sm:py-3 text-center border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-secondary/30 transition-colors touch-manipulation ${isT ? "bg-primary/8" : ""}`}
                    onClick={() => {
                      if (isMobile) setSelected(ds);
                      else setSelected(ds === selected ? null : ds);
                    }}>
                    <div className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide ${isT ? "text-primary" : "text-muted-foreground"}`}>
                      {isMobile ? DAYS_MINI[d.getDay()] : DAYS_SHORT[d.getDay()]}
                    </div>
                    <div className={`mt-0.5 sm:mt-1 text-base sm:text-lg font-bold ${isT ? "text-primary" : "text-foreground"}`}>
                      {d.getDate()}
                    </div>
                    {(eventsByDate[ds]?.length || 0) > 0 && (
                      <div className="text-[9px] text-muted-foreground">{eventsByDate[ds]?.length}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Event columns */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto">
              {weekDates.map((d) => {
                const ds = fmtDate(d);
                const dayEvts = eventsByDate[ds] || [];
                const isT = ds === today;
                const isSel = ds === selected;
                return (
                  <div key={ds}
                    className={`border-r border-border/20 last:border-r-0 p-1 sm:p-1.5 min-h-[120px] sm:min-h-[200px] transition-colors ${isT ? "bg-primary/4" : ""} ${isSel ? "bg-primary/8 ring-1 ring-inset ring-primary/20" : "hover:bg-secondary/20"} group cursor-pointer`}
                    onClick={() => {
                      if (isMobile) setSelected(ds);
                      else setSelected(isSel ? null : ds);
                    }}>
                    {!isMobile && (
                      <div className="flex justify-end mb-1">
                        <button onClick={e => { e.stopPropagation(); openNewEvent(ds); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-primary/10 text-primary text-xs transition-all">
                          <Plus size={11} />
                        </button>
                      </div>
                    )}
                    <div className="space-y-1">
                      {dayEvts.slice(0, isMobile ? 2 : 99).map(ev => (
                        isMobile ? (
                          <div key={ev.id} className="w-full h-1 rounded-full" style={{ background: ev.color }} />
                        ) : (
                          <EventPill key={ev.id} ev={ev} onClick={e => { e.stopPropagation(); openEditEvent(ev); }} />
                        )
                      ))}
                      {isMobile && dayEvts.length > 2 && (
                        <span className="text-[8px] text-muted-foreground">+{dayEvts.length - 2}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AGENDA VIEW ─────────────────────────────────────────────────────── */}
        {view === "agenda" && (
          <div className="card-elevated flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 sm:space-y-6">
            {agendaEvents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-foreground">No upcoming events</p>
                <p className="text-sm mt-1">Create an event or add tasks with due dates.</p>
                <button onClick={() => openNewEvent(today)} className="btn-primary mt-4 text-sm touch-manipulation">
                  <Plus size={13} /> Add Event
                </button>
              </div>
            ) : agendaEvents.map(group => {
              const d = parseDate(group.date);
              const isT = group.date === today;
              return (
                <div key={group.date} className="flex gap-3 sm:gap-5">
                  {/* Date column */}
                  <div className="w-12 sm:w-16 shrink-0 text-right pt-0.5">
                    <div className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${isT ? "text-primary" : "text-muted-foreground"}`}>
                      {DAYS_SHORT[d.getDay()]}
                    </div>
                    <div className={`text-xl sm:text-2xl font-extrabold leading-none ${isT ? "text-primary" : "text-foreground"}`}>
                      {d.getDate()}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground">{MONTHS[d.getMonth()].slice(0, 3)}</div>
                  </div>

                  {/* Events */}
                  <div className="flex-1 space-y-2">
                    {group.events.map(ev => (
                      <motion.div key={ev.id}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-border/30 hover:border-primary/20 hover:bg-secondary/30 group transition-all cursor-pointer touch-manipulation active:scale-[0.98]"
                        onClick={() => ev.isGoogleEvent && ev.htmlLink ? window.open(ev.htmlLink, '_blank') : openEditEvent(ev)}>
                        <div className="w-1 h-8 sm:h-10 rounded-full shrink-0" style={{ background: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ev.isTask && <CheckSquare size={11} className="text-muted-foreground shrink-0" />}
                            {ev.isGoogleEvent && <Cloud size={11} className="text-blue-400 shrink-0" />}
                            <span className={`text-sm font-semibold text-foreground truncate ${ev.status === "done" ? "line-through opacity-50" : ""}`}>
                              {ev.title}
                            </span>
                          </div>
                          {ev.startTime && (
                            <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock size={9} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ""}
                            </div>
                          )}
                        </div>

                        {ev.isTask && ev.taskId && (
                          <button onClick={e => { e.stopPropagation(); toggleTaskDone(ev.taskId!, ev.status || "todo"); }}
                            className={`p-2 rounded-xl transition-colors touch-manipulation shrink-0 ${ev.status === "done" ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"}`}>
                            <CheckSquare size={14} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: Sidebar — desktop only ────────────────────────────────────── */}
      <div className="hidden lg:flex w-72 shrink-0 flex-col gap-4 overflow-auto">

        {/* Mini-stats */}
        <div className="card-elevated p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">This Month</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Events", value: events.filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length, icon: Calendar, color: "text-primary" },
              { label: "Tasks", value: taskEvents.filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length, icon: CheckSquare, color: "text-emerald-500" },
              { label: "Overdue", value: taskEvents.filter(e => e.date < today && e.status !== "done").length, icon: AlertTriangle, color: "text-red-500" },
              ...(gcal.connected ? [{ label: "Google", value: googleEvents.filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length, icon: Cloud, color: "text-blue-500" }] : []),
              ...(!gcal.connected ? [{ label: "Done", value: taskEvents.filter(e => e.status === "done").length, icon: Zap, color: "text-amber-500" }] : []),
            ].map(s => (
              <div key={s.label} className="bg-secondary/40 rounded-xl p-2.5 text-center">
                <s.icon size={14} className={`mx-auto mb-1 ${s.color}`} />
                <div className="text-lg font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day panel — desktop */}
        <AnimatePresence>
          {selected && !isMobile && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="card-elevated p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  {parseDate(selected).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </h3>
                <button onClick={() => openNewEvent(selected)} className="p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Plus size={13} />
                </button>
              </div>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No events. Click + to add one.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(ev => (
                    <div key={ev.id}
                      className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-secondary/50 group cursor-pointer transition-colors"
                      onClick={() => openEditEvent(ev)}>
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: ev.color }} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold text-foreground truncate ${ev.status === "done" ? "line-through opacity-50" : ""}`}>{ev.title}</div>
                        {ev.startTime && <div className="text-[10px] text-muted-foreground">{ev.startTime}{ev.endTime ? `–${ev.endTime}` : ""}</div>}
                        <div className="text-[10px] text-muted-foreground">{ev.category}</div>
                      </div>
                      {ev.isTask && ev.taskId && (
                        <button onClick={e => { e.stopPropagation(); toggleTaskDone(ev.taskId!, ev.status || "todo"); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-emerald-500 transition-all">
                          <CheckSquare size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming tasks */}
        <div className="card-elevated p-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Flag size={11} /> Upcoming Tasks
            </h3>
            <button onClick={() => setActiveSection("tasks")}
              className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5">
              View all <ExternalLink size={9} />
            </button>
          </div>
          <div className="space-y-1.5 overflow-y-auto flex-1">
            {tasks
              .filter(t => t.status !== "done" && t.dueDate >= today)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 12)
              .map(t => {
                const pc = PRIORITY_COLOR[t.priority] || "#3b82f6";
                return (
                  <div key={t.id}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/50 group cursor-pointer transition-colors"
                    onClick={() => { setCursor(parseDate(t.dueDate)); setView("month"); setSelected(t.dueDate); }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pc }} />
                    <span className="text-[11px] text-foreground flex-1 truncate">{t.title}</span>
                    <span className={`text-[10px] shrink-0 font-semibold text-muted-foreground`}>
                      {t.dueDate === today ? "Today" : parseDate(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <button onClick={async e => { e.stopPropagation(); await toggleTaskDone(t.id, t.status); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-muted-foreground hover:text-emerald-500 transition-all shrink-0">
                      <CheckSquare size={11} />
                    </button>
                  </div>
                );
              })}
            {tasks.filter(t => t.status !== "done" && t.dueDate >= today).length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-4">🎉 All tasks done!</p>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="card-elevated p-4 space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Legend</h3>
          {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
            <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground capitalize">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              {p}
            </div>
          ))}
          <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckSquare size={10} className="text-primary" /> Synced from Tasks
            </div>
            {gcal.connected && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Cloud size={10} className="text-blue-400" /> Google Calendar
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Day Detail Bottom Sheet ──────────────────────────────────── */}
      <AnimatePresence>
        {selected && isMobile && (
          <DayDetailSheet
            date={selected}
            events={selectedEvents}
            onClose={() => setSelected(null)}
            onAdd={() => { openNewEvent(selected); setSelected(null); }}
            onEdit={(ev) => { openEditEvent(ev); setSelected(null); }}
            onToggleTask={toggleTaskDone}
          />
        )}
      </AnimatePresence>

      {/* Event Modal */}
      <EventModal
        open={modal.open}
        event={modal.event}
        onClose={() => setModal({ open: false })}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />
    </div>
  );
}
