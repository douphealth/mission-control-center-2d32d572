import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Copy, Pin, PinOff, Trash2, Search, Plus, Edit2, CheckSquare } from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect } from "@/components/FormModal";
import type { LinkItem } from "@/lib/store";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";

const emptyLink: Omit<LinkItem, "id"> = { title: "", url: "", category: "Tools", status: "active", description: "", dateAdded: new Date().toISOString().split("T")[0], pinned: false };

export default function LinksPage() {
  const { links, updateData, duplicateItem } = useDashboard();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyLink);
  const bulk = useBulkActions<LinkItem>();
  const cd = useConfirmDialog();

  const categories = ["all", ...Array.from(new Set(links.map(l => l.category)))];
  const filtered = links
    .filter(l => filterCat === "all" || l.category === filterCat)
    .filter(l => l.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const openAdd = () => { setEditId(null); setForm(emptyLink); setModalOpen(true); };
  const openEdit = (l: LinkItem) => { setEditId(l.id); const { id, ...rest } = l; setForm(rest); setModalOpen(true); };
  const saveForm = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    if (editId) {
      updateData({ links: links.map(l => l.id === editId ? { ...l, ...form } : l) });
    } else {
      updateData({ links: [{ id: Math.random().toString(36).slice(2, 10), ...form, dateAdded: new Date().toISOString().split("T")[0] }, ...links] });
    }
    setModalOpen(false);
  };
  const togglePin = (id: string) => updateData({ links: links.map(l => l.id === id ? { ...l, pinned: !l.pinned } : l) });
  const deleteLink = (id: string) => {
    cd.confirm({ title: "Delete Link", description: "This link will be permanently removed.", onConfirm: () => { updateData({ links: links.filter(l => l.id !== id) }); toast.success("Link deleted"); } });
  };
  const duplicateLink = async (id: string) => { const newId = await duplicateItem("links", id); if (newId) toast.success("Link duplicated"); };
  const uf = (field: keyof typeof form, val: any) => setForm(f => ({ ...f, [field]: val }));

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    cd.confirm({ title: `Delete ${bulk.selectedCount} Link(s)`, description: `This will permanently remove ${bulk.selectedCount} links.`, onConfirm: () => { updateData({ links: links.filter(l => !bulk.selectedIds.has(l.id)) }); toast.success(`${bulk.selectedCount} links deleted`); bulk.clearSelection(); } });
  }, [bulk, links, updateData, cd]);

  const bulkUpdateCategory = useCallback((cat: string) => {
    updateData({ links: links.map(l => bulk.selectedIds.has(l.id) ? { ...l, category: cat } : l) });
    toast.success(`${bulk.selectedCount} links updated`);
    bulk.clearSelection();
  }, [bulk, links, updateData]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Links Hub</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{links.length} links · {links.filter(l => l.pinned).length} pinned</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}>
            <CheckSquare size={15} /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
            <Plus size={16} /> Add Link
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
          dropdowns={[
            { label: "Set Category...", onSelect: bulkUpdateCategory, options: ["Tools", "Documentation", "Resources", "APIs", "Design", "Learning", "Social Media", "Hosting", "Domains", "Other"].map(c => ({ value: c, label: c })) },
          ]}
        />
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 sm:max-w-xs">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search links..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto hide-scrollbar">
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterCat === c ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((link, i) => (
          <motion.div key={link.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={bulk.bulkMode ? () => bulk.toggleSelect(link.id) : undefined}
            className={`card-elevated p-4 group ${bulk.bulkMode ? 'cursor-pointer' : ''} ${bulk.isSelected(link.id) ? 'ring-1 ring-primary/30 border-primary/50' : ''}`}>
            {bulk.bulkMode && (
              <div className="mb-2">{bulk.isSelected(link.id) ? <CheckSquare size={16} className="text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/30" />}</div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {link.title.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {link.pinned && <Pin size={10} className="text-warning flex-shrink-0" />}
                  <span className="text-sm font-medium text-card-foreground truncate">{link.title}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                <a href={link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline truncate block mt-0.5">{link.url}</a>
                <span className="badge-muted text-[10px] mt-1.5">{link.category}</span>
              </div>
            </div>
            {!bulk.bulkMode && (
              <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/20 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <a href={link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-secondary transition-colors"><ExternalLink size={14} /></a>
                <button onClick={() => { navigator.clipboard.writeText(link.url); toast.success("URL copied"); }} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"><Copy size={14} /></button>
                <button onClick={() => togglePin(link.id)} className="text-muted-foreground hover:text-warning p-1.5 rounded-lg hover:bg-warning/10 transition-colors">{link.pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => openEdit(link)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => deleteLink(link.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">🔗</div>
          <p className="font-medium">No links found</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary hover:underline">+ Add your first link</button>
        </div>
      )}

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Link" : "Add Link"} onSubmit={saveForm}>
        <FormField label="Title *"><FormInput value={form.title} onChange={v => uf("title", v)} placeholder="My Tool" /></FormField>
        <FormField label="URL *"><FormInput value={form.url} onChange={v => uf("url", v)} placeholder="https://example.com" /></FormField>
        <FormField label="Description"><FormTextarea value={form.description} onChange={v => uf("description", v)} placeholder="What is this link for?" rows={2} /></FormField>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <FormField label="Category">
            <FormSelect value={form.category} onChange={v => uf("category", v)} options={["Tools", "Documentation", "Resources", "APIs", "Design", "Learning", "Social Media", "Hosting", "Domains", "Other"].map(c => ({ value: c, label: c }))} />
          </FormField>
          <FormField label="Status">
            <FormSelect value={form.status} onChange={v => uf("status", v as any)} options={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
          </FormField>
        </div>
      </FormModal>

      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
