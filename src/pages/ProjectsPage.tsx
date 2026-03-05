import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, GripVertical, Search, LayoutGrid, List } from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect, FormTagsInput } from "@/components/FormModal";

const columns = [
  { id: "ideas", label: "💡 Ideas", color: "from-purple-500/20 to-purple-500/5", accent: "bg-purple-500" },
  { id: "backlog", label: "📋 Backlog", color: "from-muted/40 to-muted/10", accent: "bg-muted-foreground" },
  { id: "in-progress", label: "🔨 In Progress", color: "from-primary/20 to-primary/5", accent: "bg-primary" },
  { id: "review", label: "👀 Review", color: "from-warning/20 to-warning/5", accent: "bg-warning" },
  { id: "completed", label: "✅ Completed", color: "from-success/20 to-success/5", accent: "bg-success" },
];

interface KanbanCard {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2" | "P3";
  column: string;
  progress: number;
  deadline: string;
  tags: string[];
  description: string;
}

const defaultCards: KanbanCard[] = [
  { id: "k1", title: "AI SEO Audit Tool", priority: "P2", column: "ideas", progress: 0, deadline: "2026-04-01", tags: ["AI", "SEO"], description: "Build an AI-powered SEO auditing tool" },
  { id: "k2", title: "Newsletter System", priority: "P3", column: "ideas", progress: 0, deadline: "", tags: ["automation"], description: "Automated newsletter delivery system" },
  { id: "k3", title: "Client Reporting Dashboard", priority: "P1", column: "backlog", progress: 10, deadline: "2026-03-15", tags: ["client", "dashboard"], description: "Dashboard for client analytics reporting" },
  { id: "k4", title: "Agency Site Redesign v2", priority: "P0", column: "in-progress", progress: 65, deadline: "2026-03-01", tags: ["client", "design"], description: "Complete redesign of the agency website" },
  { id: "k5", title: "Invoice Generator Polish", priority: "P2", column: "review", progress: 90, deadline: "2026-02-28", tags: ["tool"], description: "Final polish and bug fixes" },
  { id: "k6", title: "WP Starter Theme v3", priority: "P3", column: "completed", progress: 100, deadline: "2026-02-15", tags: ["wordpress"], description: "WordPress starter theme update" },
];

const priorityConfig: Record<string, { class: string; label: string; dot: string }> = {
  P0: { class: "badge-destructive", label: "Critical", dot: "bg-destructive" },
  P1: { class: "badge-warning", label: "High", dot: "bg-warning" },
  P2: { class: "badge-info", label: "Medium", dot: "bg-info" },
  P3: { class: "badge-success", label: "Low", dot: "bg-success" },
};

const emptyCard: Omit<KanbanCard, "id"> = { title: "", priority: "P2", column: "ideas", progress: 0, deadline: "", tags: [], description: "" };

export default function ProjectsPage() {
  const [cards, setCards] = useState<KanbanCard[]>(() => {
    try { const saved = localStorage.getItem("mc-kanban"); return saved ? JSON.parse(saved) : defaultCards; }
    catch { return defaultCards; }
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCard);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  const save = useCallback((c: KanbanCard[]) => { setCards(c); localStorage.setItem("mc-kanban", JSON.stringify(c)); }, []);

  const filteredCards = cards.filter(c =>
    (filterPriority === "all" || c.priority === filterPriority) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };
  const onDragLeave = () => setDragOverCol(null);
  const onDrop = (col: string) => {
    if (!dragId) return;
    const progress = col === "completed" ? 100 : undefined;
    save(cards.map(c => c.id === dragId ? { ...c, column: col, ...(progress !== undefined ? { progress } : {}) } : c));
    setDragId(null);
    setDragOverCol(null);
  };

  const openAdd = (column: string) => { setEditId(null); setForm({ ...emptyCard, column }); setModalOpen(true); };
  const openEdit = (card: KanbanCard) => { setEditId(card.id); const { id, ...rest } = card; setForm(rest); setModalOpen(true); };
  const saveForm = () => {
    if (!form.title.trim()) return;
    if (editId) {
      save(cards.map(c => c.id === editId ? { ...c, ...form } : c));
    } else {
      save([{ id: Math.random().toString(36).slice(2, 10), ...form }, ...cards]);
    }
    setModalOpen(false);
  };
  const deleteCard = (id: string) => { if (confirm("Delete this card?")) save(cards.filter(c => c.id !== id)); };
  const uf = (field: keyof typeof form, val: any) => setForm(f => ({ ...f, [field]: val }));

  const isOverdue = (d: string) => d && d < new Date().toISOString().split("T")[0];
  const totalByPriority = (p: string) => cards.filter(c => c.priority === p).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cards.length} projects · {cards.filter(c => c.column === "in-progress").length} in progress · {cards.filter(c => c.column === "completed").length} completed
          </p>
        </div>
        <button onClick={() => openAdd("ideas")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 max-w-xs">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          {["all", "P0", "P1", "P2", "P3"].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPriority === p ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {p === "all" ? `All (${cards.length})` : `${p} (${totalByPriority(p)})`}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2" style={{ minHeight: 520 }}>
        {columns.map(col => {
          const colCards = filteredCards.filter(c => c.column === col.id);
          const isDragOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              className={`flex-shrink-0 w-72 rounded-2xl p-3 flex flex-col transition-all duration-200 ${isDragOver ? "bg-primary/5 ring-2 ring-primary/20 scale-[1.01]" : "bg-secondary/30"}`}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={onDragLeave}
              onDrop={() => onDrop(col.id)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                  <span className="text-sm font-semibold text-card-foreground">{col.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center font-medium">{colCards.length}</span>
                  <button onClick={() => openAdd(col.id)} className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-md hover:bg-primary/10">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                {colCards.map(card => (
                  <motion.div
                    key={card.id}
                    draggable
                    onDragStart={(e: any) => onDragStart(e, card.id)}
                    layout
                    layoutId={card.id}
                    className={`card-elevated p-3.5 cursor-grab active:cursor-grabbing space-y-2.5 group/card ${dragId === card.id ? "opacity-40 scale-95" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <GripVertical size={14} className="text-muted-foreground/30 mt-0.5 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                        <span className="text-sm font-medium text-card-foreground leading-snug">{card.title}</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${priorityConfig[card.priority].dot}`} />
                    </div>
                    {card.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{card.description}</p>
                    )}
                    {card.progress > 0 && card.progress < 100 && (
                      <div className="pl-6">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Progress</span><span>{card.progress}%</span></div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${card.progress}%` }} />
                        </div>
                      </div>
                    )}
                    {card.progress === 100 && (
                      <div className="pl-6">
                        <span className="text-[10px] text-success font-medium">✅ Complete</span>
                      </div>
                    )}
                    {card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-6">
                        {card.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">{t}</span>)}
                      </div>
                    )}
                    <div className="flex items-center justify-between pl-6">
                      <div className="flex items-center gap-2">
                        <span className={`${priorityConfig[card.priority].class} text-[9px]`}>{card.priority}</span>
                        {card.deadline && (
                          <span className={`text-[10px] ${isOverdue(card.deadline) && card.column !== "completed" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {isOverdue(card.deadline) && card.column !== "completed" ? "⚠️ " : "📅 "}{card.deadline}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(card)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 size={11} /></button>
                        <button onClick={() => deleteCard(card.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {colCards.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground/40 border-2 border-dashed border-muted/30 rounded-xl">
                    <p className="text-xs">Drop cards here</p>
                    <button onClick={() => openAdd(col.id)} className="text-[10px] text-primary hover:underline mt-1">+ Add card</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Project" : "New Project Card"} onSubmit={saveForm}>
        <FormField label="Title *"><FormInput value={form.title} onChange={v => uf("title", v)} placeholder="Project name" /></FormField>
        <FormField label="Description"><FormTextarea value={form.description} onChange={v => uf("description", v)} placeholder="Brief description" rows={2} /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priority">
            <FormSelect value={form.priority} onChange={v => uf("priority", v)} options={[{value:"P0",label:"🔴 P0 - Critical"},{value:"P1",label:"🟠 P1 - High"},{value:"P2",label:"🟡 P2 - Medium"},{value:"P3",label:"🟢 P3 - Low"}]} />
          </FormField>
          <FormField label="Column">
            <FormSelect value={form.column} onChange={v => uf("column", v)} options={columns.map(c => ({value:c.id, label:c.label}))} />
          </FormField>
          <FormField label="Progress %"><FormInput value={String(form.progress)} onChange={v => uf("progress", Math.min(100,parseInt(v)||0))} type="number" /></FormField>
          <FormField label="Deadline"><FormInput value={form.deadline} onChange={v => uf("deadline", v)} type="date" /></FormField>
        </div>
        <FormField label="Tags"><FormTagsInput value={form.tags} onChange={v => uf("tags", v)} placeholder="Add tag and press Enter" /></FormField>
      </FormModal>
    </div>
  );
}
