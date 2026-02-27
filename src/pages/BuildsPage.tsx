import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Trash2, Plus, Edit2, Search, CheckSquare } from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect, FormTagsInput } from "@/components/FormModal";
import type { BuildProject } from "@/lib/db";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import { toast } from "sonner";

const platformStyle: Record<string, { badge: string; emoji: string; label: string }> = {
  bolt: { badge: "bg-blue-500/10 text-blue-500", emoji: "⚡", label: "Bolt" },
  lovable: { badge: "bg-purple-500/10 text-purple-500", emoji: "💜", label: "Lovable" },
  replit: { badge: "bg-green-500/10 text-green-500", emoji: "🟢", label: "Replit" },
};
const statusOrder: Record<string, number> = { ideation: 0, building: 1, testing: 2, deployed: 3 };

const emptyBuild: Omit<BuildProject, "id"> = { name: "", platform: "bolt", projectUrl: "", deployedUrl: "", description: "", techStack: [], status: "ideation", startedDate: new Date().toISOString().split("T")[0], lastWorkedOn: new Date().toISOString().split("T")[0], nextSteps: "", githubRepo: "" };

export default function BuildsPage() {
  const { buildProjects, updateData } = useDashboard();
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyBuild);
  const bulk = useBulkActions<BuildProject>();

  const filtered = buildProjects
    .filter((b: any) => filterPlatform === "all" || b.platform === filterPlatform)
    .filter((b: any) => b.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditId(null); setForm(emptyBuild); setModalOpen(true); };
  const openEdit = (b: any) => { setEditId(b.id); const { id, ...rest } = b; setForm(rest); setModalOpen(true); };
  const saveForm = () => {
    if (!form.name.trim()) return;
    const now = new Date().toISOString().split("T")[0];
    if (editId) {
      updateData({ buildProjects: buildProjects.map((b: any) => b.id === editId ? { ...b, ...form, lastWorkedOn: now } : b) });
    } else {
      updateData({ buildProjects: [{ id: Math.random().toString(36).slice(2, 10), ...form, startedDate: now, lastWorkedOn: now }, ...buildProjects] as any });
    }
    setModalOpen(false);
  };
  const deleteBuild = (id: string) => { if (confirm("Delete this project?")) updateData({ buildProjects: buildProjects.filter((b: any) => b.id !== id) }); };
  const uf = (field: keyof typeof form, val: any) => setForm(f => ({ ...f, [field]: val }));

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    if (!confirm(`Delete ${bulk.selectedCount} project(s)?`)) return;
    updateData({ buildProjects: buildProjects.filter((b: any) => !bulk.selectedIds.has(b.id)) });
    toast.success(`${bulk.selectedCount} projects deleted`);
    bulk.clearSelection();
  }, [bulk, buildProjects, updateData]);

  const bulkUpdateStatus = useCallback((status: string) => {
    const now = new Date().toISOString().split("T")[0];
    updateData({ buildProjects: buildProjects.map((b: any) => bulk.selectedIds.has(b.id) ? { ...b, status, lastWorkedOn: now } : b) });
    toast.success(`${bulk.selectedCount} projects updated`);
    bulk.clearSelection();
  }, [bulk, buildProjects, updateData]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Build Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{buildProjects.length} projects across platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}>
            <CheckSquare size={15} /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {bulk.bulkMode && (
        <BulkActionBar
          selectedCount={bulk.selectedCount} totalCount={filtered.length}
          onSelectAll={() => bulk.selectAll(filtered)} allSelected={bulk.selectedCount === filtered.length && filtered.length > 0}
          onDelete={bulkDelete}
          dropdowns={[{ label: "Set Status...", onSelect: bulkUpdateStatus, options: [
            { value: "ideation", label: "💭 Ideation" }, { value: "building", label: "🔨 Building" },
            { value: "testing", label: "🧪 Testing" }, { value: "deployed", label: "🚀 Deployed" },
          ]}]}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 max-w-xs">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          {["all", "bolt", "lovable", "replit"].map(p => (
            <button key={p} onClick={() => setFilterPlatform(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPlatform === p ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {p === "all" ? "All" : `${platformStyle[p]?.emoji} ${platformStyle[p]?.label}`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          {(["bolt", "lovable", "replit"] as const).map(p => (
            <a key={p} href={p === "bolt" ? "https://bolt.new" : p === "lovable" ? "https://lovable.dev" : "https://replit.com"} target="_blank" rel="noopener noreferrer" className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 ${platformStyle[p].badge}`}>
              {platformStyle[p].emoji} Open
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((bp: any, i: number) => {
          const ps = platformStyle[bp.platform] || platformStyle.bolt;
          return (
            <motion.div key={bp.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={bulk.bulkMode ? () => bulk.toggleSelect(bp.id) : undefined}
              className={`card-elevated p-5 space-y-3 group ${bulk.bulkMode ? 'cursor-pointer' : ''} ${bulk.isSelected(bp.id) ? 'ring-1 ring-primary/30 border-primary/50' : ''}`}>
              <div className="flex items-start justify-between">
                {bulk.bulkMode && (
                  <div className="mr-2">{bulk.isSelected(bp.id) ? <CheckSquare size={16} className="text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/30" />}</div>
                )}
                <h3 className="font-semibold text-card-foreground">{bp.name}</h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ps.badge}`}>{ps.emoji} {bp.platform}</span>
              </div>
              <p className="text-sm text-muted-foreground">{bp.description}</p>
              <div className="flex items-center gap-1">
                {(["ideation", "building", "testing", "deployed"] as const).map((s, idx) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors ${statusOrder[bp.status] >= idx ? "bg-primary" : "bg-muted"}`} />
                    <span className={`text-[10px] ${statusOrder[bp.status] >= idx ? "text-card-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
                    {idx < 3 && <div className={`w-5 h-0.5 rounded transition-colors ${statusOrder[bp.status] > idx ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {bp.techStack.map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">{t}</span>)}
              </div>
              {bp.nextSteps && <p className="text-xs text-muted-foreground/80 italic">💡 Next: {bp.nextSteps}</p>}
              <div className="flex gap-2 pt-1">
                {bp.projectUrl && <a href={bp.projectUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink size={12} /> Open</a>}
                {bp.deployedUrl && <a href={bp.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">🚀 Live</a>}
                {bp.githubRepo && <a href={bp.githubRepo} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">📂 GitHub</a>}
                {!bulk.bulkMode && (
                  <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(bp)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 size={13} /></button>
                    <button onClick={() => deleteBuild(bp.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">🛠️</div>
          <p className="font-medium">No build projects found</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary hover:underline">+ Create your first project</button>
        </div>
      )}

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Project" : "New Build Project"} onSubmit={saveForm}>
        <FormField label="Project Name *"><FormInput value={form.name} onChange={v => uf("name", v)} placeholder="My AI App" /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Platform">
            <FormSelect value={form.platform} onChange={v => uf("platform", v as any)} options={[{value:"bolt",label:"⚡ Bolt"},{value:"lovable",label:"💜 Lovable"},{value:"replit",label:"🟢 Replit"}]} />
          </FormField>
          <FormField label="Status">
            <FormSelect value={form.status} onChange={v => uf("status", v as any)} options={[{value:"ideation",label:"Ideation"},{value:"building",label:"Building"},{value:"testing",label:"Testing"},{value:"deployed",label:"Deployed"}]} />
          </FormField>
        </div>
        <FormField label="Description"><FormTextarea value={form.description} onChange={v => uf("description", v)} placeholder="What does this project do?" rows={2} /></FormField>
        <FormField label="Project URL"><FormInput value={form.projectUrl} onChange={v => uf("projectUrl", v)} placeholder="https://bolt.new/..." /></FormField>
        <FormField label="Deployed URL"><FormInput value={form.deployedUrl} onChange={v => uf("deployedUrl", v)} placeholder="https://my-app.vercel.app" /></FormField>
        <FormField label="GitHub Repo"><FormInput value={form.githubRepo} onChange={v => uf("githubRepo", v)} placeholder="https://github.com/..." /></FormField>
        <FormField label="Tech Stack"><FormTagsInput value={form.techStack} onChange={v => uf("techStack", v)} placeholder="React, Supabase, etc." /></FormField>
        <FormField label="Next Steps"><FormInput value={form.nextSteps} onChange={v => uf("nextSteps", v)} placeholder="What to do next..." /></FormField>
      </FormModal>
    </div>
  );
}
