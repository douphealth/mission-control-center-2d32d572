import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Star, GitFork, Trash2, Plus, Edit2, Search, Rocket, Code2, CheckSquare, Copy } from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect, FormTagsInput } from "@/components/FormModal";
import type { GitHubRepo } from "@/lib/store";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const langColors: Record<string, string> = { TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-blue-400", PHP: "bg-purple-500", HTML: "bg-orange-500", Go: "bg-sky-400", Rust: "bg-orange-600", Ruby: "bg-red-500" };

const emptyRepo: Omit<GitHubRepo, "id"> = { name: "", url: "", description: "", language: "TypeScript", stars: 0, forks: 0, status: "active", demoUrl: "", progress: 0, topics: [], lastUpdated: new Date().toISOString().split("T")[0], devPlatformUrl: "", deploymentUrl: "" };

export default function GitHubPage() {
  const { repos, updateData, duplicateItem } = useDashboard();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRepo);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const bulk = useBulkActions<GitHubRepo>();

  const filtered = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditId(null); setForm(emptyRepo); setModalOpen(true); };
  const openEdit = (r: GitHubRepo) => { setEditId(r.id); const { id, ...rest } = r; setForm(rest); setModalOpen(true); };
  const saveForm = () => {
    if (!form.name.trim()) return;
    if (editId) {
      updateData({ repos: repos.map(r => r.id === editId ? { ...r, ...form } : r) });
    } else {
      updateData({ repos: [{ id: Math.random().toString(36).slice(2, 10), ...form }, ...repos] });
    }
    setModalOpen(false);
  };
  const deleteRepo = (id: string) => setPendingDeleteId(id);
  const duplicateRepo = async (id: string) => { const newId = await duplicateItem("repos", id); if (newId) toast.success("Repo duplicated"); };
  const uf = (field: keyof typeof form, val: any) => setForm(f => ({ ...f, [field]: val }));

  const closeDeleteDialog = useCallback(() => {
    setPendingDeleteId(null);
    setPendingBulkDelete(false);
  }, []);

  const confirmDeleteSingle = useCallback(() => {
    if (!pendingDeleteId) return;
    updateData({ repos: repos.filter(r => r.id !== pendingDeleteId) });
    toast.success("Repository deleted");
    closeDeleteDialog();
  }, [pendingDeleteId, repos, updateData, closeDeleteDialog]);

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    setPendingBulkDelete(true);
  }, [bulk.selectedCount]);

  const confirmBulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    updateData({ repos: repos.filter(r => !bulk.selectedIds.has(r.id)) });
    toast.success(`${bulk.selectedCount} repos deleted`);
    bulk.clearSelection();
    closeDeleteDialog();
  }, [bulk, repos, updateData, closeDeleteDialog]);

  const bulkUpdateStatus = useCallback((status: string) => {
    updateData({ repos: repos.map(r => bulk.selectedIds.has(r.id) ? { ...r, status: status as any } : r) });
    toast.success(`${bulk.selectedCount} repos updated`);
    bulk.clearSelection();
  }, [bulk, repos, updateData]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">GitHub Projects</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{repos.length} repositories</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}>
            <CheckSquare size={15} /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
            <Plus size={16} /> Add Repo
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
            { label: "Set Status...", onSelect: bulkUpdateStatus, options: [
              { value: "active", label: "✅ Active" }, { value: "stable", label: "🟢 Stable" },
              { value: "paused", label: "⏸️ Paused" }, { value: "archived", label: "📦 Archived" },
            ]},
          ]}
        />
      )}

      <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 w-full sm:max-w-xs">
        <Search size={14} className="text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repos..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((repo, i) => (
          <motion.div key={repo.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            onClick={bulk.bulkMode ? () => bulk.toggleSelect(repo.id) : undefined}
            className={`card-elevated p-4 sm:p-5 space-y-3 group ${bulk.bulkMode ? 'cursor-pointer' : ''} ${bulk.isSelected(repo.id) ? 'ring-1 ring-primary/30 border-primary/50' : ''}`}>
            <div className="flex items-start justify-between">
              {bulk.bulkMode && (
                <div className="mr-2">{bulk.isSelected(repo.id) ? <CheckSquare size={16} className="text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/30" />}</div>
              )}
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-card-foreground hover:text-primary transition-colors truncate">{repo.name}</a>
              <span className={`badge-${repo.status === "active" ? "success" : repo.status === "stable" ? "info" : repo.status === "paused" ? "warning" : "muted"} flex-shrink-0`}>{repo.status}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${langColors[repo.language] || "bg-muted-foreground"}`} />{repo.language}</span>
              <span className="flex items-center gap-1"><Star size={12} />{repo.stars}</span>
              <span className="flex items-center gap-1"><GitFork size={12} />{repo.forks}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progress</span><span>{repo.progress}%</span></div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${repo.progress}%` }} /></div>
            </div>
            {repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {repo.topics.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">{t}</span>)}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink size={12} /> Repo</a>
              {repo.demoUrl && <a href={repo.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">🌐 Demo</a>}
              {repo.devPlatformUrl && <a href={repo.devPlatformUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Code2 size={12} /> Platform</a>}
              {repo.deploymentUrl && <a href={repo.deploymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Rocket size={12} /> Deploy</a>}
              {!bulk.bulkMode && (
                <div className="ml-auto flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => duplicateRepo(repo.id)} className="text-muted-foreground hover:text-blue-500 p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Duplicate"><Copy size={14} /></button>
                  <button onClick={() => openEdit(repo)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => deleteRepo(repo.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">🐙</div>
          <p className="font-medium">No repositories found</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary hover:underline">+ Add your first repo</button>
        </div>
      )}

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Repository" : "Add Repository"} onSubmit={saveForm}>
        <FormField label="Repo Name *"><FormInput value={form.name} onChange={v => uf("name", v)} placeholder="my-awesome-repo" /></FormField>
        <FormField label="GitHub URL"><FormInput value={form.url} onChange={v => uf("url", v)} placeholder="https://github.com/user/repo" /></FormField>
        <FormField label="Description"><FormTextarea value={form.description} onChange={v => uf("description", v)} placeholder="What does this repo do?" rows={2} /></FormField>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <FormField label="Language">
            <FormSelect value={form.language} onChange={v => uf("language", v)} options={["TypeScript","JavaScript","Python","PHP","HTML","Go","Rust","Ruby"].map(l => ({ value: l, label: l }))} />
          </FormField>
          <FormField label="Status">
            <FormSelect value={form.status} onChange={v => uf("status", v as any)} options={[{value:"active",label:"Active"},{value:"stable",label:"Stable"},{value:"paused",label:"Paused"},{value:"archived",label:"Archived"}]} />
          </FormField>
          <FormField label="Stars"><FormInput value={String(form.stars)} onChange={v => uf("stars", parseInt(v)||0)} type="number" /></FormField>
          <FormField label="Progress %"><FormInput value={String(form.progress)} onChange={v => uf("progress", Math.min(100, parseInt(v)||0))} type="number" /></FormField>
        </div>
        <FormField label="Demo URL"><FormInput value={form.demoUrl} onChange={v => uf("demoUrl", v)} placeholder="https://demo.example.com" /></FormField>
        <FormField label="Dev Platform URL"><FormInput value={form.devPlatformUrl || ""} onChange={v => uf("devPlatformUrl", v)} placeholder="https://bolt.new/..., lovable.dev/..., replit.com/..." /></FormField>
        <FormField label="Deployment Gateway URL"><FormInput value={form.deploymentUrl || ""} onChange={v => uf("deploymentUrl", v)} placeholder="https://vercel.com/..., cloudways.com/..., netlify.app/..." /></FormField>
        <FormField label="Topics"><FormTagsInput value={form.topics} onChange={v => uf("topics", v)} placeholder="Add topic and press Enter" /></FormField>
      </FormModal>

      <AlertDialog
        open={pendingBulkDelete || pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm delete</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkDelete
                ? `Delete ${bulk.selectedCount} repo(s)? This action cannot be undone.`
                : "Delete this repository? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={pendingBulkDelete ? confirmBulkDelete : confirmDeleteSingle}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
