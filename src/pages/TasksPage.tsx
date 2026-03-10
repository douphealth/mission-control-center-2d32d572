import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, CheckCircle2, Circle, AlertTriangle, Edit2, Trash2,
  GripVertical, ChevronDown, LayoutGrid, List, Flag, Tag, Calendar,
  X, Clock, ArrowRight, Zap, Target, Flame, Filter, MoreHorizontal,
  CheckSquare, Layers, TrendingUp, BarChart3, Copy, Bell
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/db";
import { REMINDER_LABELS, requestNotificationPermission } from "@/lib/notifications";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { id: "todo", label: "To Do", color: "#6366f1", bg: "from-indigo-500/20 to-indigo-600/5", icon: Circle },
  { id: "in-progress", label: "In Progress", color: "#f59e0b", bg: "from-amber-500/20 to-amber-600/5", icon: Zap },
  { id: "blocked", label: "Blocked", color: "#ef4444", bg: "from-red-500/20 to-red-600/5", icon: AlertTriangle },
  { id: "done", label: "Done", color: "#10b981", bg: "from-emerald-500/20 to-emerald-600/5", icon: CheckCircle2 },
] as const;

type StatusId = typeof STATUSES[number]["id"];

const PRIORITIES = [
  { id: "critical", label: "Critical", color: "#ef4444", bg: "bg-red-500/15 text-red-400", dot: "bg-red-500" },
  { id: "high", label: "High", color: "#f97316", bg: "bg-orange-500/15 text-orange-400", dot: "bg-orange-500" },
  { id: "medium", label: "Medium", color: "#3b82f6", bg: "bg-blue-500/15 text-blue-400", dot: "bg-blue-500" },
  { id: "low", label: "Low", color: "#10b981", bg: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-500" },
] as const;

const CATEGORIES = ["General", "Development", "Design", "Marketing", "Client Work", "Content", "Bug Fix", "Research", "Finance", "Personal"];
const today = new Date().toISOString().split("T")[0];

function getPriority(id: string) { return PRIORITIES.find(p => p.id === id) || PRIORITIES[2]; }
function getStatus(id: string) { return STATUSES.find(s => s.id === id) || STATUSES[0]; }

function isOverdue(t: Task) { return t.status !== "done" && t.dueDate < today; }
function isToday(t: Task) { return t.dueDate === today && t.status !== "done"; }

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - new Date(today).getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${diff}d left`;
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

const EMPTY: Omit<Task, "id"> = {
  title: "", priority: "medium", status: "todo",
  dueDate: today, category: "General",
  description: "", linkedProject: "",
  subtasks: [], createdAt: today,
  reminder: 'none', reminderFired: false,
};

interface TaskModalProps {
  open: boolean;
  task?: Task | null;
  defaultStatus?: StatusId;
  onClose: () => void;
  onSave: (t: Omit<Task, "id"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
}

function TaskModal({ open, task, defaultStatus, onClose, onSave, onDelete }: TaskModalProps) {
  const [form, setForm] = useState<Omit<Task, "id">>(() =>
    task ? { ...task } : { ...EMPTY, status: defaultStatus || "todo" }
  );
  const [newSub, setNewSub] = useState("");
  const uf = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  // reset when task changes
  useMemo(() => {
    setForm(task ? { ...task } : { ...EMPTY, status: defaultStatus || "todo" });
  }, [task?.id, open]);

  const addSub = () => {
    if (!newSub.trim()) return;
    uf("subtasks", [...form.subtasks, { id: `s-${Date.now()}`, title: newSub.trim(), done: false }]);
    setNewSub("");
  };
  const removeSub = (id: string) => uf("subtasks", form.subtasks.filter(s => s.id !== id));
  const toggleSub = (id: string) => uf("subtasks", form.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));

  const save = () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    onSave({ ...(task?.id ? { id: task.id } : {}), ...form });
    onClose();
  };

  const pr = getPriority(form.priority);
  const st = getStatus(form.status);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-start justify-center sm:p-4 sm:pt-16" onClick={onClose}>
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.18 }}
            className="relative w-full sm:max-w-2xl bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 overflow-hidden max-h-[95vh] sm:max-h-none flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Priority color strip */}
            <div className="h-1 w-full" style={{ background: pr.color }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <h2 className="font-bold text-card-foreground flex items-center gap-2 text-base">
                <Target size={16} style={{ color: pr.color }} />
                {task ? "Edit Task" : "New Task"}
              </h2>
              <div className="flex items-center gap-2">
                {task && onDelete && (
                  <button onClick={() => { onDelete(task.id); onClose(); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Title */}
              <textarea
                autoFocus rows={2}
                value={form.title} onChange={e => uf("title", e.target.value)}
                placeholder="Task title..."
                ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
                style={{ overflow: "hidden" }}
                className="w-full text-lg font-semibold bg-transparent text-card-foreground outline-none placeholder:text-muted-foreground/40 resize-none border-b border-border/40 pb-2"
              />

              {/* Description */}
              <textarea rows={2} value={form.description} onChange={e => uf("description", e.target.value)}
                placeholder="Description (optional)..."
                ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
                style={{ overflow: "hidden" }}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50" />

              {/* Status + Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Status</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUSES.map(s => (
                      <button key={s.id} type="button" onClick={() => uf("status", s.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${form.status === s.id ? "ring-2 ring-offset-1 ring-offset-card" : "bg-secondary opacity-60 hover:opacity-100"}`}
                        style={form.status === s.id ? { background: s.color + "22", color: s.color } : {}}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Priority</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRIORITIES.map(p => (
                      <button key={p.id} type="button" onClick={() => uf("priority", p.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${p.bg} ${form.priority === p.id ? "ring-2 ring-offset-1 ring-offset-card" : "opacity-50 hover:opacity-100"}`}
                        style={form.priority === p.id ? {} : {}}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date + Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => uf("dueDate", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => uf("category", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none appearance-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Time — syncs to calendar */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => uf("allDay", !(form.allDay !== false))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.allDay !== false ? "bg-primary" : "bg-secondary"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.allDay !== false ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">All day</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">Syncs to Calendar</span>
                </div>
                {form.allDay === false && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Start Time</label>
                      <input type="time" value={form.startTime || "09:00"} onChange={e => uf("startTime", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">End Time</label>
                      <input type="time" value={form.endTime || "10:00"} onChange={e => uf("endTime", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                )}
              </div>

              {/* Reminder */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5 flex items-center gap-1.5">
                  <Bell size={12} className="text-primary" /> Reminder
                </label>
                <select
                  value={form.reminder || 'none'}
                  onChange={async (e) => {
                    const val = e.target.value as Task['reminder'];
                    uf("reminder", val);
                    uf("reminderFired", false);
                    if (val !== 'none') {
                      const granted = await requestNotificationPermission();
                      if (!granted) toast.info("Enable browser notifications for push alerts");
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none appearance-none focus:ring-2 focus:ring-primary/30"
                >
                  {Object.entries(REMINDER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Linked project */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Linked Project</label>
                <input value={form.linkedProject} onChange={e => uf("linkedProject", e.target.value)}
                  placeholder="Project name..."
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50" />
              </div>

              {/* Subtasks */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  Subtasks {form.subtasks.length > 0 && <span className="text-primary">({form.subtasks.filter(s => s.done).length}/{form.subtasks.length})</span>}
                </label>
                <div className="space-y-1.5 mb-2">
                  {form.subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 group">
                      <button type="button" onClick={() => toggleSub(sub.id)}
                        className={`shrink-0 transition-colors ${sub.done ? "text-emerald-500" : "text-muted-foreground hover:text-primary"}`}>
                        {sub.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      </button>
                      <span className={`flex-1 text-sm ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{sub.title}</span>
                      <button type="button" onClick={() => removeSub(sub.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
                    placeholder="Add subtask... (Enter to add)"
                    className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50" />
                  <button type="button" onClick={addSub}
                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border/40 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
              <button onClick={onClose} className="px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors touch-manipulation">
                Cancel
              </button>
              <button onClick={save}
                className="px-5 py-2.5 sm:py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90 touch-manipulation"
                style={{ background: `linear-gradient(135deg, ${pr.color}, ${pr.color}cc)`, boxShadow: `0 4px 15px ${pr.color}40` }}>
                {task ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  task, onEdit, onDelete, onDuplicate, onToggle, onToggleSub,
  isDragging, onDragStart, onDragEnd,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onToggleSub: (subId: string) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  const pr = getPriority(task.priority);
  const overdue = isOverdue(task);
  const todayTask = isToday(task);
  const doneSubs = task.subtasks.filter(s => s.done).length;
  const subPct = task.subtasks.length ? (doneSubs / task.subtasks.length) * 100 : 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart as any}
      onDragEnd={onDragEnd as any}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0, scale: isDragging ? 0.97 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        bg-card/90 backdrop-blur-sm rounded-2xl border transition-all duration-200 group cursor-grab active:cursor-grabbing select-none
        ${overdue ? "border-red-500/40 shadow-red-500/10" : "border-border/40"}
        ${todayTask ? "border-amber-500/50 shadow-amber-500/10" : ""}
        ${task.status === "done" ? "opacity-60" : ""}
        shadow-lg hover:shadow-xl hover:border-primary/30 hover:-translate-y-0.5
      `}
      style={{ borderLeft: `3px solid ${pr.color}` }}>

      {/* Card header */}
      <div className="p-3.5 pb-2">
        <div className="flex items-start gap-2">
          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            className="mt-0.5 shrink-0 transition-colors hover:scale-110"
            style={{ color: task.status === "done" ? "#10b981" : "#6b7280" }}>
            {task.status === "done" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-card-foreground"}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={e => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors touch-manipulation"
              title="Duplicate">
              <Copy size={12} />
            </button>
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation">
              <Edit2 size={12} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 sm:p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${pr.bg}`}>{pr.label}</span>
          {task.category && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">{task.category}</span>}
          {task.linkedProject && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-medium truncate max-w-[90px]">{task.linkedProject}</span>}
        </div>

        {/* Subtask progress */}
        {task.subtasks.length > 0 && (
          <div className="mt-2.5">
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full">
              <Layers size={10} />
              <span>{doneSubs}/{task.subtasks.length} subtasks</span>
              <div className="flex-1 bg-secondary rounded-full h-1 overflow-hidden ml-1">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${subPct}%`, background: pr.color }} />
              </div>
              <ChevronDown size={10} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1.5 space-y-1">
                  {task.subtasks.map(sub => (
                    <button key={sub.id} type="button" onClick={() => onToggleSub(sub.id)}
                      className="flex items-center gap-1.5 text-[11px] w-full text-left hover:text-foreground transition-colors"
                      style={{ color: sub.done ? "#10b981" : "#9ca3af" }}>
                      {sub.done ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                      <span className={sub.done ? "line-through" : ""}>{sub.title}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 pb-3 pt-1 border-t border-border/20">
        <div className={`flex items-center gap-1 text-[10px] font-semibold ${overdue ? "text-red-400" : todayTask ? "text-amber-400" : "text-muted-foreground"}`}>
          <Calendar size={9} />
          {task.dueDate ? daysUntil(task.dueDate) : "No date"}
          {task.allDay === false && task.startTime && (
            <span className="ml-1 text-primary/70 font-medium">
              <Clock size={8} className="inline -mt-0.5 mr-0.5" />
              {task.startTime}{task.endTime ? `–${task.endTime}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {task.reminder && task.reminder !== 'none' && (
            <span title={REMINDER_LABELS[task.reminder]}><Bell size={10} className="text-primary/60" /></span>
          )}
          <GripVertical size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status, tasks, onEdit, onDelete, onDuplicate, onToggle, onToggleSub,
  onAddNew, onDrop, draggingId,
}: {
  status: typeof STATUSES[number];
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleSub: (taskId: string, subId: string) => void;
  onAddNew: () => void;
  onDrop: (taskId: string, newStatus: StatusId) => void;
  draggingId: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) onDrop(taskId, status.id);
  };

  const Icon = status.icon;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex-1 min-w-[240px] sm:min-w-[260px] max-w-[320px] flex flex-col rounded-2xl transition-all duration-200 snap-start ${dragOver ? "ring-2 ring-inset ring-primary/40 bg-primary/5" : ""}`}>

      {/* Column header */}
      <div className={`flex items-center justify-between px-4 py-3.5 rounded-t-2xl bg-gradient-to-r ${status.bg}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
          <span className="text-sm font-bold text-foreground">{status.label}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-card/60 text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button onClick={onAddNew}
          className="p-1 rounded-lg hover:bg-card/50 text-muted-foreground hover:text-foreground transition-colors">
          <Plus size={14} />
        </button>
      </div>

      {/* Drop zone */}
      <div className={`flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[120px] rounded-b-2xl border border-t-0 transition-colors ${dragOver ? "border-primary/30 bg-primary/3" : "border-border/30 bg-secondary/20"}`}>
        <AnimatePresence>
          {tasks.map(t => (
            <KanbanCard
              key={t.id}
              task={t}
              isDragging={draggingId === t.id}
              onEdit={() => onEdit(t)}
              onDelete={() => onDelete(t.id)}
              onDuplicate={() => onDuplicate(t.id)}
              onToggle={() => onToggle(t.id)}
              onToggleSub={(subId) => onToggleSub(t.id, subId)}
              onDragStart={e => { e.dataTransfer.setData("taskId", t.id); e.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { }}
            />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className={`flex items-center justify-center h-20 rounded-xl border-2 border-dashed transition-colors ${dragOver ? "border-primary/40 text-primary" : "border-border/30 text-muted-foreground"}`}>
            <p className="text-xs font-medium">{dragOver ? "Drop here" : "Empty"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function ListRow({ task, onEdit, onDelete, onDuplicate, onToggle, onToggleSub, index }: {
  task: Task; onEdit: () => void; onDelete: () => void; onDuplicate: () => void; onToggle: () => void;
  onToggleSub: (sub: string) => void; index: number;
}) {
  const pr = getPriority(task.priority);
  const st = getStatus(task.status);
  const overdue = isOverdue(task);
  const [expanded, setExpanded] = useState(false);
  const doneSubs = task.subtasks.filter(s => s.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay: index * 0.02 }}
      layout>
      <div className={`
        flex items-center gap-3 px-4 py-3.5 rounded-2xl border group transition-all
        hover:border-primary/20 hover:bg-secondary/20 hover:shadow-md
        ${task.status === "done" ? "opacity-55" : ""}
        ${overdue ? "border-red-500/30 bg-red-500/5" : "border-border/30 bg-card/60"}
      `}
        style={{ borderLeft: `3px solid ${pr.color}` }}>

        {/* Toggle */}
        <button onClick={onToggle}
          className="shrink-0 transition-all hover:scale-110"
          style={{ color: task.status === "done" ? "#10b981" : "#6b7280" }}>
          {task.status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-semibold ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </span>
            {task.linkedProject && (
              <span className="text-[10px] text-purple-400 font-medium shrink-0">↳ {task.linkedProject}</span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
          )}
        </div>

        {/* Subtasks mini */}
        {task.subtasks.length > 0 && (
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0 bg-secondary px-2 py-1 rounded-lg">
            <CheckSquare size={10} />
            {doneSubs}/{task.subtasks.length}
            <ChevronDown size={9} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        {/* Status */}
        <span className="text-[10px] px-2 py-1 rounded-lg font-semibold shrink-0 hidden sm:inline-flex"
          style={{ background: st.color + "22", color: st.color }}>
          {st.label}
        </span>

        {/* Priority */}
        <span className={`text-[10px] px-2 py-1 rounded-lg font-semibold shrink-0 hidden md:inline-flex ${pr.bg}`}>
          {pr.label}
        </span>

        {/* Category */}
        {task.category && (
          <span className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground font-medium hidden lg:inline-flex shrink-0">
            {task.category}
          </span>
        )}

        {/* Due date */}
        <span className={`text-[11px] font-semibold shrink-0 ${overdue ? "text-red-400" : isToday(task) ? "text-amber-400" : "text-muted-foreground"}`}>
          {task.dueDate ? daysUntil(task.dueDate) : "—"}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onDuplicate} className="p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors touch-manipulation" title="Duplicate">
            <Copy size={14} />
          </button>
          <button onClick={onEdit} className="p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-2 sm:p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Subtasks expanded */}
      <AnimatePresence>
        {expanded && task.subtasks.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden ml-8 mt-1 space-y-1 mb-1">
            {task.subtasks.map(sub => (
              <button key={sub.id} type="button" onClick={() => onToggleSub(sub.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/40 w-full text-left group/sub hover:bg-secondary/70 transition-colors">
                <span style={{ color: sub.done ? "#10b981" : "#9ca3af" }}>
                  {sub.done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                </span>
                <span className={`text-xs transition-colors ${sub.done ? "line-through text-muted-foreground" : "text-foreground group-hover/sub:text-foreground"}`}>{sub.title}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { tasks, addItem, updateItem, deleteItem, duplicateItem } = useDashboard();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [view, setView] = useState<"kanban" | "list">(isMobile ? "list" : "kanban");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [modal, setModal] = useState<{ open: boolean; task?: Task | null; defaultStatus?: StatusId }>({ open: false });
  const [quickAdd, setQuickAdd] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"priority" | "dueDate" | "created">("priority");

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter(t => t.status !== "done").length,
    done: tasks.filter(t => t.status === "done").length,
    overdue: tasks.filter(isOverdue).length,
    todayTask: tasks.filter(isToday).length,
    critical: tasks.filter(t => t.priority === "critical" && t.status !== "done").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
    pct: tasks.length ? Math.round(tasks.filter(t => t.status === "done").length / tasks.length * 100) : 0,
  }), [tasks]);

  // ── Filtered + sorted ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const PORD: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return tasks
      .filter(t => filterStatus === "all" || t.status === filterStatus)
      .filter(t => filterPriority === "all" || t.priority === filterPriority)
      .filter(t => filterCategory === "all" || t.category === filterCategory)
      .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "priority") {
          if (a.status === "done" && b.status !== "done") return 1;
          if (a.status !== "done" && b.status === "done") return -1;
          return (PORD[a.priority] ?? 3) - (PORD[b.priority] ?? 3);
        }
        if (sortBy === "dueDate") return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [tasks, filterStatus, filterPriority, filterCategory, search, sortBy]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], "in-progress": [], blocked: [], done: [] };
    filtered.forEach(t => { (map[t.status] = map[t.status] || []).push(t); });
    return map;
  }, [filtered]);

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (t: Omit<Task, "id"> & { id?: string }) => {
    if (t.id) {
      const { id, ...rest } = t;
      await updateItem<Task>("tasks", id, rest);
      toast.success("Task updated ✓");
    } else {
      const newId = await addItem<Task>("tasks", { ...t, createdAt: today } as Omit<Task, "id">);
      if (newId) toast.success("Task created ✓");
      else toast.error("Duplicate task — already exists");
    }
  }, [addItem, updateItem]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteItem("tasks", id);
    toast.success("Task deleted");
  }, [deleteItem]);

  const handleDuplicate = useCallback(async (id: string) => {
    const newId = await duplicateItem("tasks", id, { status: "todo", completedAt: undefined });
    if (newId) toast.success("Task duplicated ✓");
  }, [duplicateItem]);

  const handleToggle = useCallback(async (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const next = t.status === "done" ? "todo" : "done";
    await updateItem<Task>("tasks", id, { status: next, completedAt: next === "done" ? today : undefined });
    toast.success(next === "done" ? "✅ Done!" : "Reopened");
  }, [tasks, updateItem]);

  const handleToggleSub = useCallback(async (taskId: string, subId: string) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    const subtasks = t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s);
    await updateItem<Task>("tasks", taskId, { subtasks });
  }, [tasks, updateItem]);

  const handleDrop = useCallback(async (taskId: string, newStatus: StatusId) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t || t.status === newStatus) return;
    await updateItem<Task>("tasks", taskId, {
      status: newStatus,
      completedAt: newStatus === "done" ? today : undefined,
    });
    setDraggingId(null);
    const st = getStatus(newStatus);
    toast.success(`Moved to ${st.label}`, { icon: "↪" });
  }, [tasks, updateItem]);

  const quickAddTask = useCallback(async () => {
    if (!quickAdd.trim()) return;
    const newId = await addItem<Task>("tasks", { ...EMPTY, title: quickAdd.trim(), createdAt: today });
    setQuickAdd("");
    if (newId) toast.success("Task added ✓");
    else toast.error("Duplicate task — already exists");
  }, [quickAdd, addItem]);

  const allCategories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tasks]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Target size={22} className="text-primary" />
            Task Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.open} open · {stats.done} done
            {stats.overdue > 0 && <span className="text-red-400 font-semibold"> · ⚠ {stats.overdue} overdue</span>}
            {stats.todayTask > 0 && <span className="text-amber-400 font-semibold"> · 🔥 {stats.todayTask} due today</span>}
          </p>
        </div>
        <button onClick={() => setModal({ open: true, task: null })}
          className="btn-primary flex items-center gap-1.5 text-sm shadow-lg shadow-primary/25">
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* ── Stats bar — horizontally scrollable on mobile ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible">
        {[
          { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-secondary/60" },
          { label: "Open", value: stats.open, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "In Progress", value: tasksByStatus["in-progress"].length, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Blocked", value: stats.blocked, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Done", value: stats.done, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Overdue", value: stats.overdue, color: "text-red-400 font-bold", bg: "bg-red-500/15" },
          { label: "Critical", value: stats.critical, color: "text-orange-400 font-bold", bg: "bg-orange-500/10" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center min-w-[72px] flex-shrink-0 sm:flex-shrink sm:min-w-0`}>
            <div className={`text-lg sm:text-xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            initial={{ width: 0 }}
            animate={{ width: `${stats.pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs font-bold text-muted-foreground shrink-0">{stats.pct}% complete</span>
      </div>

      {/* ── Quick add ── */}
      <div className="card-elevated p-3 flex items-center gap-3 hover:shadow-lg transition-shadow">
        <Plus size={18} className="text-muted-foreground shrink-0" />
        <input value={quickAdd} onChange={e => setQuickAdd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && quickAddTask()}
          placeholder="Quick add task... press Enter ↵"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
        {quickAdd && (
          <button onClick={quickAddTask}
            className="px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
            Add
          </button>
        )}
      </div>

      {/* ── Toolbar — scrollable on mobile ── */}
      <div className="space-y-2">
        {/* Search + view toggle row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 flex-1 min-w-0">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none flex-1 min-w-0" />
            {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground touch-manipulation"><X size={12} /></button>}
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 shrink-0">
            <button onClick={() => setView("kanban")}
              className={`p-1.5 rounded-lg transition-all touch-manipulation ${view === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Kanban Board">
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setView("list")}
              className={`p-1.5 rounded-lg transition-all touch-manipulation ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List View">
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Filters row — horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 shrink-0">
            {["all", ...STATUSES.map(s => s.id)].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all whitespace-nowrap touch-manipulation ${filterStatus === s ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {s === "all" ? `All` : getStatus(s).label}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold outline-none appearance-none cursor-pointer shrink-0 touch-manipulation">
            <option value="all">Priority</option>
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          {/* Category filter */}
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold outline-none appearance-none cursor-pointer shrink-0 touch-manipulation">
            <option value="all">Category</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold outline-none appearance-none cursor-pointer shrink-0 touch-manipulation">
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="created">Created</option>
          </select>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      {view === "kanban" && (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ minHeight: 400 }}>
          {STATUSES.map(status => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus[status.id] || []}
              onEdit={t => setModal({ open: true, task: t })}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggle={handleToggle}
              onToggleSub={handleToggleSub}
              onAddNew={() => setModal({ open: true, task: null, defaultStatus: status.id })}
              onDrop={handleDrop}
              draggingId={draggingId}
            />
          ))}
        </div>
      )}

      {/* ── List View ── */}
      {view === "list" && (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filtered.map((task, i) => (
              <ListRow
                key={task.id}
                task={task}
                index={i}
                onEdit={() => setModal({ open: true, task })}
                onDelete={() => handleDelete(task.id)}
                onDuplicate={() => handleDuplicate(task.id)}
                onToggle={() => handleToggle(task.id)}
                onToggleSub={(subId) => handleToggleSub(task.id, subId)}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <CheckSquare size={42} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-foreground">No tasks match your filters</p>
              <p className="text-sm mt-1">Clear filters or create a new task</p>
              <button onClick={() => setModal({ open: true, task: null })} className="btn-primary mt-4 text-sm">
                <Plus size={13} /> New Task
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Task Modal ── */}
      <TaskModal
        open={modal.open}
        task={modal.task}
        defaultStatus={modal.defaultStatus}
        onClose={() => setModal({ open: false })}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
