import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Pin, PinOff, Trash2, Search, Tag, ChevronRight, CheckSquare, Copym "lucide-react";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import { toast } from "sonner";

const noteColors = ["blue", "amber", "green", "rose", "purple", "teal"];
const colorMap: Record<string, { border: string; dot: string }> = {
  blue: { border: "border-l-info", dot: "bg-info" },
  amber: { border: "border-l-warning", dot: "bg-warning" },
  green: { border: "border-l-success", dot: "bg-success" },
  rose: { border: "border-l-destructive", dot: "bg-destructive" },
  purple: { border: "border-l-purple-400", dot: "bg-purple-400" },
  teal: { border: "border-l-accent", dot: "bg-accent" },
};

export default function NotesPage() {
  const { notes, upda, duplteData, duplicateItemseDashboard();
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const bulk = useBulkActions<typeof notes[0]>();

  const selected = notes.find(n => n.id === selectedId);
  const filtered = notes
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const updateNote = useCallback((field: string, value: string) => {
    updateData({
      notes: notes.map(n =>
        n.id === selectedId ? { ...n, [field]: value, updatedAt: new Date().toISOString().split("T")[0] } : n
      ),
    });
  }, [notes, selectedId, updateData]);

  const addNote = () => {
    const id = Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString().split("T")[0];
    updateData({
      notes: [{ id, title: "Untitled Note", content: "", color: "blue", pinned: false, tags: [], createdAt: now, updatedAt: now }, ...notes],
    });
    setSelectedId(id);
  };

  const togglePin = (id: string) => {
    updateData({ notes: notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) });
  };

  const deleteNote = (id: string) => {
    if (!confirm("Delete this note?")) return;
    const remaining = notes.filter(n => n.id !== id);
    updateData({ notes: remaining });
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
  };

  const duplicateNote = async (id: string) => {
    const newId = await duplicateItem("notes", id);
    if (newId) { toast.success("Note duplicated"); setSelectedId(newId); }
  };

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    if (!confirm(`Delete ${bulk.selectedCount} note(s)?`)) return;
    const remaining = notes.filter(n => !bulk.selectedIds.has(n.id));
    updateData({ notes: remaining });
    if (bulk.selectedIds.has(selectedId || "")) setSelectedId(remaining[0]?.id ?? null);
    toast.success(`${bulk.selectedCount} notes deleted`);
    bulk.clearSelection();
  }, [bulk, notes, updateData, selectedId]);

  const bulkTogglePin = useCallback(() => {
    updateData({ notes: notes.map(n => bulk.selectedIds.has(n.id) ? { ...n, pinned: !n.pinned } : n) });
    toast.success(`${bulk.selectedCount} notes toggled pin`);
    bulk.clearSelection();
  }, [bulk, notes, updateData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{notes.length} notes · {notes.filter(n => n.pinned).length} pinned</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}>
            <CheckSquare size={15} /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
          </button>
          <button onClick={addNote} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
            <Plus size={16} /> <span className="hidden sm:inline">New</span> Note
          </button>
        </div>
      </div>

      {bulk.bulkMode && (
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          totalCount={filtered.length}
          onSelectAll={() => bulk.selectAll(filtered)}
          allSelected={bulk.selectedCount === filtered.length && filtered.length > 0}
          onDelete={bulkDelete}
          dropdowns={[]}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 420 }}>
        <div className={`space-y-2 ${selectedId && !bulk.bulkMode && 'hidden lg:block'}`}>
          <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2">
            <Search size={14} className="text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
          </div>
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filtered.map(note => {
              const c = colorMap[note.color] || colorMap.blue;
              return (
                <button
                  key={note.id}
                  onClick={() => bulk.bulkMode ? bulk.toggleSelect(note.id) : setSelectedId(note.id)}
                  className={`w-full text-left card-elevated p-3.5 border-l-[3px] ${c.border} transition-all ${bulk.isSelected(note.id) ? 'ring-1 ring-primary/30 border-primary/50' : selectedId === note.id && !bulk.bulkMode ? "ring-1 ring-primary/30 bg-primary/5" : "hover:bg-secondary/50"}`}
                >
                  <div className="flex items-center gap-1.5">
                    {bulk.bulkMode && (
                      <div className="mr-1">{bulk.isSelected(note.id) ? <CheckSquare size={14} className="text-primary" /> : <div className="w-3.5 h-3.5 rounded border border-muted-foreground/30" />}</div>
                    )}
                    {note.pinned && <Pin size={10} className="text-warning flex-shrink-0" />}
                    <span className="text-sm font-medium text-card-foreground truncate flex-1">{note.title}</span>
                    {!bulk.bulkMode && <ChevronRight size={12} className="text-muted-foreground/40 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{note.content.slice(0, 80) || "Empty note..."}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground/60">{note.updatedAt}</span>
                    {note.tags.length > 0 && (
                      <div className="flex gap-1">
                        {note.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground">{t}</span>)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!bulk.bulkMode && (
          <div className={`lg:col-span-2 card-elevated p-4 sm:p-5 flex flex-col ${!selectedId && 'hidden lg:flex'}`}>
            {selected ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setSelectedId(null)} className="lg:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <input
                    value={selected.title}
                    onChange={e => updateNote("title", e.target.value)}
                    className="text-lg sm:text-xl font-bold text-card-foreground bg-transparent outline-none flex-1"
                    placeholder="Note title..."
                  />
                   <button onClick={() => togglePin(selected.id)} className={`p-1.5 rounded-lg hover:bg-secondary transition-colors ${selected.pinned ? "text-warning" : "text-muted-foreground"}`}>
                     {selected.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                   </button>
                   <button onClick={() => duplicateNote(selected.id)} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors" title="Duplicate">
                     <Copy size={16} />
                   </button>
                   <button onClick={() => deleteNote(selected.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                     <Trash2 size={16} />
                   </button>
                </div>
                <textarea
                  value={selected.content}
                  onChange={e => updateNote("content", e.target.value)}
                  ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                  onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
                  style={{ overflow: "hidden" }}
                  className="flex-1 bg-transparent text-sm text-card-foreground outline-none resize-none leading-relaxed min-h-[300px]"
                  placeholder="Start writing..."
                />
                <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{selected.content.split(/\s+/).filter(Boolean).length} words</span>
                    <span className="text-xs text-muted-foreground">Updated {selected.updatedAt}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {noteColors.map(c => (
                      <button key={c} onClick={() => updateNote("color", c)} className={`w-5 h-5 rounded-full border-2 transition-all ${selected.color === c ? "border-foreground scale-110" : "border-transparent hover:scale-110"} ${colorMap[c]?.dot}`} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
                <div className="text-5xl">📝</div>
                <p>Select a note or create a new one</p>
                <button onClick={addNote} className="text-primary hover:underline text-sm">+ New Note</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
