import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Flame, Plus, CheckCircle2, Circle, Trash2, Target, Calendar,
    BarChart3, Trophy, Star, Zap, Edit2, RefreshCw, CheckSquare
} from "lucide-react";
import type { HabitTracker } from "@/lib/db";
import FormModal, { FormField, FormInput, FormSelect } from "@/components/FormModal";
import { toast } from "sonner";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";

const ICONS = ["💪", "🏃", "📚", "🧘", "💧", "🍎", "😴", "🧠", "✍️", "📝", "🎯", "⚡", "🌅", "🚶", "🎨", "🎵", "💊", "🏋️", "🌿", "🧹"];
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

const emptyForm = {
    name: "", icon: "⚡", frequency: "daily" as const,
    completions: [], streak: 0, color: "#3b82f6",
    createdAt: new Date().toISOString().split("T")[0],
};

export default function HabitsPage() {
    const { habits, addItem, updateItem, deleteItem, duplicateItem } = useDashboard();
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Omit<HabitTracker, "id">>(emptyForm);
    const bulk = useBulkActions<HabitTracker>();

    const today = new Date().toISOString().split("T")[0];

    const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toISOString().split("T")[0];
    });

    const isCompletedToday = (h: HabitTracker) => h.completions?.includes(today);
    const completedToday = habits.filter(isCompletedToday).length;
    const totalStreak = habits.reduce((s, h) => s + (h.streak || 0), 0);
    const longestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

    const toggleToday = async (h: HabitTracker) => {
        const completions = h.completions || [];
        let newCompletions: string[];
        let newStreak: number;

        if (completions.includes(today)) {
            newCompletions = completions.filter(d => d !== today);
            newStreak = Math.max(0, (h.streak || 0) - 1);
        } else {
            newCompletions = [...completions, today];
            let streak = 0;
            const all = [...newCompletions].sort().reverse();
            let check = new Date();
            for (let i = 0; i < 365; i++) {
                const dateStr = check.toISOString().split("T")[0];
                if (all.includes(dateStr)) { streak++; check.setDate(check.getDate() - 1); } else break;
            }
            newStreak = streak;
        }
        await updateItem<HabitTracker>("habits", h.id, { completions: newCompletions, streak: newStreak });
        if (!completions.includes(today)) toast.success(`${h.icon} ${h.name} completed!`);
    };

    const openAdd = () => { setEditId(null); setForm({ ...emptyForm, createdAt: today }); setModalOpen(true); };
    const openEdit = (h: HabitTracker) => { setEditId(h.id); const { id, ...rest } = h; setForm(rest); setModalOpen(true); };
    const handleDelete = async (id: string) => {
        if (!confirm("Delete this habit and all its data?")) return;
        await deleteItem("habits", id);
        toast.success("Habit deleted");
    };
    const handleDuplicate = async (id: string) => {
        const newId = await duplicateItem("habits", id, { completions: [], streak: 0 });
        if (newId) toast.success("Habit duplicated");
    };
    const saveForm = async () => {
        if (!form.name.trim()) { toast.error("Name is required"); return; }
        if (editId) { await updateItem<HabitTracker>("habits", editId, form); toast.success("Habit updated"); }
        else {
            const newId = await addItem<HabitTracker>("habits", form);
            if (newId) toast.success("Habit created!");
            else { toast.error("Duplicate habit — already exists"); return; }
        }
        setModalOpen(false);
    };
    const uf = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

    const bulkDelete = useCallback(async () => {
        if (bulk.selectedCount === 0) return;
        if (!confirm(`Delete ${bulk.selectedCount} habit(s)?`)) return;
        for (const id of bulk.selectedIds) { await deleteItem("habits", id); }
        toast.success(`${bulk.selectedCount} habits deleted`);
        bulk.clearSelection();
    }, [bulk, deleteItem]);

    return (
        <div className="space-y-6">
            <div className="section-header">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Flame size={22} className="text-orange-500" /> Habit Tracker
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Build streaks, track progress, become unstoppable</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={bulk.toggleBulkMode}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}>
                        <CheckSquare size={15} /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
                    </button>
                    <button onClick={openAdd} className="btn-primary"><Plus size={15} /> New Habit</button>
                </div>
            </div>

            {bulk.bulkMode && (
                <BulkActionBar
                    selectedCount={bulk.selectedCount}
                    totalCount={habits.length}
                    onSelectAll={() => bulk.selectAll(habits)}
                    allSelected={bulk.selectedCount === habits.length && habits.length > 0}
                    onDelete={bulkDelete}
                    dropdowns={[]}
                />
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Done Today", value: `${completedToday}/${habits.length}`, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
                    { label: "Total Habits", value: habits.length, icon: Target, color: "text-blue-500 bg-blue-500/10" },
                    { label: "Longest Streak", value: `${longestStreak}🔥`, icon: Flame, color: "text-orange-500 bg-orange-500/10" },
                    { label: "Total Streak Days", value: totalStreak, icon: Trophy, color: "text-amber-500 bg-amber-500/10" },
                ].map(stat => (
                    <div key={stat.label} className="card-glass p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}><stat.icon size={17} /></div>
                        <div>
                            <div className="text-xl font-bold text-foreground">{stat.value}</div>
                            <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Today's check-in */}
            {habits.length > 0 && !bulk.bulkMode && (
                <div className="card-elevated p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold flex items-center gap-2"><Zap size={15} className="text-amber-500" /> Today's Check-in</h2>
                        <span className="text-xs text-muted-foreground">{today}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {habits.map(h => {
                            const done = isCompletedToday(h);
                            return (
                                <button key={h.id} onClick={() => toggleToday(h)}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left group ${done ? "border-emerald-500/30 bg-emerald-500/8" : "border-border/30 hover:border-primary/30 hover:bg-secondary/50"}`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all ${done ? "scale-110" : ""}`} style={{ background: h.color + "22" }}>{h.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-foreground truncate">{h.name}</div>
                                        <div className="text-[10px] text-muted-foreground capitalize">{h.frequency}</div>
                                    </div>
                                    <div className="shrink-0">{done ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />}</div>
                                    {(h.streak || 0) > 0 && <div className="text-xs font-bold text-orange-500 flex items-center gap-0.5 shrink-0"><Flame size={11} /> {h.streak}</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Habit cards with history */}
            {habits.length > 0 ? (
                <div className="space-y-3">
                    <h2 className="text-base font-bold flex items-center gap-2"><BarChart3 size={15} className="text-primary" /> History — Last 14 Days</h2>
                    <div className="space-y-2">
                        {habits.map((h, i) => (
                            <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                onClick={bulk.bulkMode ? () => bulk.toggleSelect(h.id) : undefined}
                                className={`card-elevated p-4 group ${bulk.bulkMode ? 'cursor-pointer' : ''} ${bulk.isSelected(h.id) ? 'ring-1 ring-primary/30 border-primary/50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    {bulk.bulkMode && (
                                        <div>{bulk.isSelected(h.id) ? <CheckSquare size={16} className="text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/30" />}</div>
                                    )}
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: (h.color || "#3b82f6") + "22" }}>{h.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground">{h.name}</span>
                                            <span className="badge-muted capitalize">{h.frequency}</span>
                                            {(h.streak || 0) > 0 && <span className="text-[10px] font-bold text-orange-500 flex items-center gap-0.5"><Flame size={9} /> {h.streak} day streak</span>}
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {last14.map(day => {
                                                const done = (h.completions || []).includes(day);
                                                const isToday = day === today;
                                                return (
                                                    <div key={day} title={day}
                                                        className={`w-5 h-5 rounded-md transition-all ${!bulk.bulkMode ? 'cursor-pointer' : ''} ${done ? `opacity-90` : isToday ? "bg-primary/10 border-2 border-primary/20" : "bg-secondary border border-border/30"}`}
                                                        style={done ? { background: h.color || "#3b82f6" } : {}}
                                                        onClick={!bulk.bulkMode ? (e) => { e.stopPropagation(); toggleToday(h); } : undefined}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {!bulk.bulkMode && (
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-muted-foreground">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-lg font-semibold text-foreground">No habits yet</p>
                    <p className="text-sm mt-1">Start building positive routines that compound over time</p>
                    <button onClick={openAdd} className="btn-primary mt-5 text-sm"><Plus size={14} /> Add Your First Habit</button>
                </div>
            )}

            <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Habit" : "New Habit"} onSubmit={saveForm}>
                <FormField label="Habit Name *"><FormInput value={form.name} onChange={v => uf("name", v)} placeholder="e.g. Morning Run, Read 30min..." /></FormField>
                <FormField label="Frequency"><FormSelect value={form.frequency} onChange={v => uf("frequency", v)} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} /></FormField>
                <FormField label="Icon">
                    <div className="flex flex-wrap gap-2">
                        {ICONS.map(ic => (<button key={ic} type="button" onClick={() => uf("icon", ic)} className={`w-9 h-9 rounded-xl text-lg hover:bg-secondary transition-all ${form.icon === ic ? "bg-primary/20 ring-2 ring-primary/40 scale-110" : ""}`}>{ic}</button>))}
                    </div>
                </FormField>
                <FormField label="Color">
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map(clr => (<button key={clr} type="button" onClick={() => uf("color", clr)} className={`w-7 h-7 rounded-lg transition-all ${form.color === clr ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : ""}`} style={{ background: clr }} />))}
                    </div>
                </FormField>
            </FormModal>
        </div>
    );
}
