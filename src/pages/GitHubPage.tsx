import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink, Star, GitFork, Trash2, Plus, Edit2, Search, Rocket,
  Code2, CheckSquare, Copy, Database, RefreshCw, Github, Loader2, AlertCircle
} from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect, FormTagsInput } from "@/components/FormModal";
import type { GitHubRepo } from "@/lib/store";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { useFormValidation } from "@/hooks/useFormValidation";
import { repoSchema } from "@/lib/schemas";

const langColors: Record<string, string> = {
  TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-blue-400",
  PHP: "bg-purple-500", HTML: "bg-orange-500", Go: "bg-sky-400", Rust: "bg-orange-600", Ruby: "bg-red-500",
};

const DB_TYPES = [
  { value: "", label: "None" },
  { value: "supabase", label: "Supabase" },
  { value: "firebase", label: "Firebase" },
  { value: "neon", label: "Neon" },
  { value: "planetscale", label: "PlanetScale" },
  { value: "railway", label: "Railway" },
  { value: "mongodb", label: "MongoDB" },
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "other", label: "Other" },
];

const emptyRepo: Omit<GitHubRepo, "id"> = {
  name: "", url: "", description: "", language: "TypeScript", stars: 0, forks: 0,
  status: "active", demoUrl: "", progress: 0, topics: [],
  lastUpdated: new Date().toISOString().split("T")[0],
  devPlatformUrl: "", deploymentUrl: "",
  dbType: undefined, dbUrl: "", dbDashboardUrl: "", dbName: "", dbNotes: "",
};

// ─── GitHub API import ────────────────────────────────────────────────────────

async function fetchGitHubRepos(username: string, token?: string): Promise<Omit<GitHubRepo, "id">[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `token ${token}`;

  const url = token
    ? "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator"
    : `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    if (resp.status === 401) throw new Error("Invalid GitHub token");
    if (resp.status === 403) throw new Error("GitHub rate limit exceeded — add a personal access token");
    if (resp.status === 404) throw new Error(`GitHub user "${username}" not found`);
    throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return (data as any[]).map((r) => ({
    name: r.name,
    url: r.html_url,
    description: r.description || "",
    language: r.language || "Other",
    stars: r.stargazers_count,
    forks: r.forks_count,
    status: r.archived ? "archived" : "active",
    demoUrl: r.homepage || "",
    progress: 0,
    topics: r.topics || [],
    lastUpdated: (r.updated_at || "").split("T")[0],
    devPlatformUrl: "",
    deploymentUrl: "",
    dbType: undefined,
    dbUrl: "",
    dbDashboardUrl: "",
    dbName: "",
    dbNotes: "",
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GitHubPage() {
  const { repos, addItem, updateData, duplicateItem } = useDashboard();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRepo);
  const bulk = useBulkActions<GitHubRepo>();
  const cd = useConfirmDialog();
  const { validate, getError, clearError, clearAll } = useFormValidation(repoSchema);

  // GitHub import state
  const [importOpen, setImportOpen] = useState(false);
  const [ghUsername, setGhUsername] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditId(null); setForm(emptyRepo); clearAll(); setModalOpen(true); };
  const openEdit = (r: GitHubRepo) => { setEditId(r.id); const { id, ...rest } = r; setForm(rest); clearAll(); setModalOpen(true); };

  const saveForm = () => {
    if (!validate(form)) return;
    if (editId) {
      updateData({ repos: repos.map(r => r.id === editId ? { ...r, ...form } : r) });
    } else {
      updateData({ repos: [{ id: Math.random().toString(36).slice(2, 10), ...form }, ...repos] });
    }
    setModalOpen(false);
  };

  const deleteRepo = (id: string) => {
    cd.confirm({
      title: "Delete Repository",
      description: "This repository entry will be permanently removed.",
      onConfirm: () => { updateData({ repos: repos.filter(r => r.id !== id) }); toast.success("Repository deleted"); },
    });
  };

  const duplicateRepo = async (id: string) => {
    const newId = await duplicateItem("repos", id);
    if (newId) toast.success("Repo duplicated");
  };

  const uf = (field: keyof typeof form, val: any) => {
    setForm(f => ({ ...f, [field]: val }));
    clearError(field);
  };

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    cd.confirm({
      title: `Delete ${bulk.selectedCount} Repo(s)`,
      description: `This will permanently remove ${bulk.selectedCount} repositories.`,
      onConfirm: () => {
        updateData({ repos: repos.filter(r => !bulk.selectedIds.has(r.id)) });
        toast.success(`${bulk.selectedCount} repos deleted`);
        bulk.clearSelection();
      },
    });
  }, [bulk, repos, updateData, cd]);

  const bulkUpdateStatus = useCallback((status: string) => {
    updateData({ repos: repos.map(r => bulk.selectedIds.has(r.id) ? { ...r, status: status as any } : r) });
    toast.success(`${bulk.selectedCount} repos updated`);
    bulk.clearSelection();
  }, [bulk, repos, updateData]);

  const handleGitHubImport = async () => {
    if (!ghUsername && !ghToken) {
      setImportError("Enter a GitHub username or personal access token");
      return;
    }
    setImportLoading(true);
    setImportError("");
    try {
      const fetched = await fetchGitHubRepos(ghUsername, ghToken || undefined);
      const existing = new Set(repos.map(r => r.url.toLowerCase()));
      const newRepos = fetched.filter(r => !existing.has(r.url.toLowerCase()));
      let added = 0;
      for (const r of newRepos) {
        await addItem("repos", r);
        added++;
      }
      toast.success(`Imported ${added} new repos from GitHub`, {
        description: newRepos.length < fetched.length
          ? `${fetched.length - newRepos.length} already existed and were skipped`
          : undefined,
      });
      setImportOpen(false);
      setGhUsername("");
      setGhToken("");
    } catch (e: any) {
      setImportError(e.message || "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">GitHub Projects</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{repos.length} repositories</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20 text-sm font-medium transition-all hover:bg-secondary"
            aria-label="Import repositories from GitHub"
          >
            <Github size={15} aria-hidden="true" /> Import from GitHub
          </button>
          <button
            onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}
          >
            <CheckSquare size={15} aria-hidden="true" /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20"
          >
            <Plus size={16} aria-hidden="true" /> Add Repo
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
            {
              label: "Set Status...", onSelect: bulkUpdateStatus, options: [
                { value: "active", label: "Active" }, { value: "stable", label: "Stable" },
                { value: "paused", label: "Paused" }, { value: "archived", label: "Archived" },
              ],
            },
          ]}
        />
      )}

      <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 w-full sm:max-w-xs">
        <Search size={14} className="text-muted-foreground" aria-hidden="true" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search repos..."
          aria-label="Search repositories"
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map((repo, i) => (
          <motion.article
            key={repo.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            onClick={bulk.bulkMode ? () => bulk.toggleSelect(repo.id) : undefined}
            className={`card-elevated p-4 sm:p-5 space-y-3 group ${bulk.bulkMode ? 'cursor-pointer' : ''} ${bulk.isSelected(repo.id) ? 'ring-1 ring-primary/30 border-primary/50' : ''}`}
            aria-label={`Repository: ${repo.name}`}
          >
            <div className="flex items-start justify-between gap-2">
              {bulk.bulkMode && (
                <div className="mr-1 mt-0.5" aria-hidden="true">
                  {bulk.isSelected(repo.id)
                    ? <CheckSquare size={16} className="text-primary" />
                    : <div className="w-4 h-4 rounded border border-muted-foreground/30" />
                  }
                </div>
              )}
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-card-foreground hover:text-primary transition-colors truncate"
                aria-label={`Open ${repo.name} on GitHub`}
              >
                {repo.name}
              </a>
              <span className={`badge-${repo.status === "active" ? "success" : repo.status === "stable" ? "info" : repo.status === "paused" ? "warning" : "muted"} flex-shrink-0 capitalize`}>
                {repo.status}
              </span>
            </div>
            {repo.description && <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${langColors[repo.language] || "bg-muted-foreground"}`} aria-hidden="true" />
                {repo.language}
              </span>
              <span className="flex items-center gap-1"><Star size={12} aria-hidden="true" />{repo.stars}</span>
              <span className="flex items-center gap-1"><GitFork size={12} aria-hidden="true" />{repo.forks}</span>
            </div>
            {repo.progress > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span><span>{repo.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={repo.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${repo.progress}%` }} />
                </div>
              </div>
            )}
            {repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {repo.topics.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">{t}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink size={12} aria-hidden="true" /> Repo
              </a>
              {repo.demoUrl && (
                <a href={repo.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Demo
                </a>
              )}
              {repo.devPlatformUrl && (
                <a href={repo.devPlatformUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Code2 size={12} aria-hidden="true" /> Platform
                </a>
              )}
              {repo.deploymentUrl && (
                <a href={repo.deploymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Rocket size={12} aria-hidden="true" /> Deploy
                </a>
              )}
              {repo.dbType && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Database size={11} aria-hidden="true" /> {DB_TYPES.find(d => d.value === repo.dbType)?.label || repo.dbType}
                </span>
              )}
              {!bulk.bulkMode && (
                <div className="ml-auto flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => duplicateRepo(repo.id)} aria-label={`Duplicate ${repo.name}`} className="text-muted-foreground hover:text-blue-500 p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <Copy size={14} aria-hidden="true" />
                  </button>
                  <button onClick={() => openEdit(repo)} aria-label={`Edit ${repo.name}`} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <Edit2 size={14} aria-hidden="true" />
                  </button>
                  <button onClick={() => deleteRepo(repo.id)} aria-label={`Delete ${repo.name}`} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </motion.article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground" role="status">
          <Github size={40} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
          <p className="font-medium">No repositories found</p>
          <p className="text-sm mt-1 text-muted-foreground/60">Import from GitHub or add manually</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setImportOpen(true)} className="text-sm text-primary hover:underline font-medium">
              Import from GitHub
            </button>
            <span className="text-muted-foreground/30">or</span>
            <button onClick={openAdd} className="text-sm text-primary hover:underline font-medium">
              Add manually
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Repository" : "Add Repository"} onSubmit={saveForm}>
        <FormField label="Repo Name" required error={getError("name")}>
          <FormInput value={form.name} onChange={v => uf("name", v)} placeholder="my-awesome-repo" required error={getError("name")} autoFocus />
        </FormField>
        <FormField label="GitHub URL" error={getError("url")}>
          <FormInput value={form.url} onChange={v => uf("url", v)} placeholder="https://github.com/user/repo" error={getError("url")} />
        </FormField>
        <FormField label="Description">
          <FormTextarea value={form.description} onChange={v => uf("description", v)} placeholder="What does this repo do?" rows={2} />
        </FormField>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <FormField label="Language">
            <FormSelect value={form.language} onChange={v => uf("language", v)} options={["TypeScript","JavaScript","Python","PHP","HTML","Go","Rust","Ruby","Other"].map(l => ({ value: l, label: l }))} />
          </FormField>
          <FormField label="Status">
            <FormSelect value={form.status} onChange={v => uf("status", v as any)} options={[{value:"active",label:"Active"},{value:"stable",label:"Stable"},{value:"paused",label:"Paused"},{value:"archived",label:"Archived"}]} />
          </FormField>
          <FormField label="Stars">
            <FormInput value={String(form.stars)} onChange={v => uf("stars", parseInt(v)||0)} type="number" />
          </FormField>
          <FormField label="Progress %" error={getError("progress")}>
            <FormInput value={String(form.progress)} onChange={v => uf("progress", Math.min(100, parseInt(v)||0))} type="number" error={getError("progress")} />
          </FormField>
        </div>
        <FormField label="Demo URL" error={getError("demoUrl")}>
          <FormInput value={form.demoUrl} onChange={v => uf("demoUrl", v)} placeholder="https://demo.example.com" error={getError("demoUrl")} />
        </FormField>
        <FormField label="Dev Platform URL">
          <FormInput value={form.devPlatformUrl || ""} onChange={v => uf("devPlatformUrl", v)} placeholder="https://bolt.new/..." />
        </FormField>
        <FormField label="Deployment URL" error={getError("deploymentUrl")}>
          <FormInput value={form.deploymentUrl || ""} onChange={v => uf("deploymentUrl", v)} placeholder="https://vercel.com/..." error={getError("deploymentUrl")} />
        </FormField>
        <FormField label="Topics">
          <FormTagsInput value={form.topics} onChange={v => uf("topics", v)} placeholder="Add topic and press Enter" />
        </FormField>
        <div className="border-t border-border/30 pt-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} className="text-primary" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Database Connection</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="DB Type">
              <FormSelect value={form.dbType || ""} onChange={v => uf("dbType", v || undefined)} options={DB_TYPES} />
            </FormField>
            <FormField label="DB Name">
              <FormInput value={form.dbName || ""} onChange={v => uf("dbName", v)} placeholder="my-project-db" />
            </FormField>
          </div>
          {form.dbType && (
            <>
              <FormField label="DB URL / Connection String">
                <FormInput value={form.dbUrl || ""} onChange={v => uf("dbUrl", v)} placeholder={form.dbType === 'supabase' ? 'https://xxxxx.supabase.co' : 'postgresql://...'} />
              </FormField>
              <FormField label="DB Dashboard URL">
                <FormInput value={form.dbDashboardUrl || ""} onChange={v => uf("dbDashboardUrl", v)} placeholder="https://supabase.com/dashboard/..." />
              </FormField>
              <FormField label="DB Notes">
                <FormTextarea value={form.dbNotes || ""} onChange={v => uf("dbNotes", v)} placeholder="API keys, special config notes..." rows={2} />
              </FormField>
            </>
          )}
        </div>
      </FormModal>

      {/* GitHub Import Modal */}
      <FormModal
        open={importOpen}
        onClose={() => { setImportOpen(false); setImportError(""); }}
        title="Import from GitHub"
        onSubmit={handleGitHubImport}
        submitLabel={importLoading ? "Importing..." : "Import"}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-[12px] text-muted-foreground">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Github size={13} aria-hidden="true" /> How it works
            </p>
            <p>Enter your GitHub username to import public repos, or add a Personal Access Token (classic) to include private repos. Tokens are used only for this request and are never stored.</p>
          </div>

          <FormField label="GitHub Username">
            <FormInput
              value={ghUsername}
              onChange={v => { setGhUsername(v); setImportError(""); }}
              placeholder="octocat"
              autoFocus
            />
          </FormField>

          <FormField label="Personal Access Token (optional — for private repos)">
            <FormInput
              value={ghToken}
              onChange={v => { setGhToken(v); setImportError(""); }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              type="password"
            />
          </FormField>

          {importError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-[12px] text-destructive" role="alert">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{importError}</span>
            </div>
          )}

          {importLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Fetching repositories from GitHub...
            </div>
          )}
        </div>
      </FormModal>

      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
