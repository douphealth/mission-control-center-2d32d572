import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, Eye, EyeOff, Copy, ExternalLink,
  Shield, Lock, Unlock, KeyRound, Tag, Globe, User, Key, FileText,
  CheckCircle2, AlertCircle, RefreshCw, CheckSquare
} from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect } from "@/components/FormModal";
import type { CredentialVault } from "@/lib/db";
import { toast } from "sonner";
import { encrypt, decrypt } from "@/lib/encryption";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";

const CATEGORIES = ["General", "Infrastructure", "Hosting", "Development", "Payments", "Social", "Email", "Analytics", "AI Tools", "Other"];

const emptyForm: Omit<CredentialVault, "id"> = {
  label: "", service: "", url: "", username: "",
  password: "", apiKey: "", notes: "", category: "General",
  createdAt: new Date().toISOString().split("T")[0],
};

const categoryColors: Record<string, string> = {
  Infrastructure: "text-blue-500 bg-blue-500/10",
  Hosting: "text-violet-500 bg-violet-500/10",
  Development: "text-emerald-500 bg-emerald-500/10",
  Payments: "text-amber-500 bg-amber-500/10",
  Social: "text-pink-500 bg-pink-500/10",
  Email: "text-cyan-500 bg-cyan-500/10",
  Analytics: "text-orange-500 bg-orange-500/10",
  "AI Tools": "text-purple-500 bg-purple-500/10",
  General: "text-zinc-500 bg-zinc-500/10",
  Other: "text-zinc-500 bg-zinc-500/10",
};

function MaskedField({ value, label, isVisible, onReveal, onCopy, isMasterLocked, decryptedValue }: {
  value: string; label: string; isVisible: boolean;
  onReveal: () => void; onCopy: () => void; isMasterLocked: boolean;
  decryptedValue?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-[11px] shrink-0 w-16">{label}:</span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="font-mono text-[11px] text-foreground truncate flex-1">
          {isVisible && !isMasterLocked ? (decryptedValue || value) : "••••••••"}
        </span>
        <button onClick={onReveal} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
          {isVisible && !isMasterLocked ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
        <button onClick={onCopy} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
          <Copy size={10} />
        </button>
      </div>
    </div>
  );
}

export default function CredentialsPage() {
  const { credentials, addItem, updateItem, deleteItem, duplicateItem } = useDashboard();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CredentialVault, "id">>(emptyForm);
  const [masterLocked, setMasterLocked] = useState(true);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, { password?: string; apiKey?: string }>>({});
  const bulk = useBulkActions<CredentialVault>();

  const categories = ["all", ...Array.from(new Set(credentials.map(c => c.category))).sort()];

  const filtered = credentials.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.label.toLowerCase().includes(q) || c.service.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || (c.notes || "").toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || c.category === filterCategory;
    return matchSearch && matchCat;
  });

  const toggleReveal = (id: string) => {
    if (masterLocked) { toast.error("Unlock the vault first"); return; }
    setRevealed(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else {
        n.add(id);
        setTimeout(() => setRevealed(p => { const x = new Set(p); x.delete(id); return x; }), 15000);
      }
      return n;
    });
  };

  const copySecret = async (rawValue: string, label: string) => {
    if (masterLocked) { toast.error("Unlock the vault first"); return; }
    const decrypted = await decrypt(rawValue) || rawValue;
    navigator.clipboard.writeText(decrypted);
    toast.success(`${label} copied to clipboard`);
  };

  const openAdd = () => { setEditId(null); setForm({ ...emptyForm, createdAt: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const openEdit = async (c: CredentialVault) => {
    setEditId(c.id);
    const { id, ...rest } = c;
    const decPassword = rest.password ? (await decrypt(rest.password) || rest.password) : "";
    const decApiKey = rest.apiKey ? (await decrypt(rest.apiKey) || rest.apiKey) : "";
    setForm({ ...rest, password: decPassword, apiKey: decApiKey });
    setModalOpen(true);
  };

  const saveForm = async () => {
    if (!form.label.trim()) { toast.error("Label is required"); return; }
    const encPassword = form.password ? await encrypt(form.password) : "";
    const encApiKey = form.apiKey ? await encrypt(form.apiKey) : "";
    const encrypted = { ...form, password: encPassword, apiKey: encApiKey };
    if (editId) { await updateItem<CredentialVault>("credentials", editId, encrypted); toast.success("Credential updated"); }
    else {
      const newId = await addItem<CredentialVault>("credentials", encrypted);
      if (newId) toast.success("Credential added");
      else { toast.error("Duplicate credential — already exists"); return; }
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credential?")) return;
    await deleteItem("credentials", id);
    toast.success("Credential deleted");
  };

  const handleDuplicate = async (id: string) => {
    const newId = await duplicateItem("credentials", id);
    if (newId) toast.success("Credential duplicated");
  };

  const uf = (field: keyof typeof form, val: any) => setForm(f => ({ ...f, [field]: val }));

  const bulkDelete = useCallback(async () => {
    if (bulk.selectedCount === 0) return;
    if (!confirm(`Delete ${bulk.selectedCount} credential(s)?`)) return;
    for (const id of bulk.selectedIds) { await deleteItem("credentials", id); }
    toast.success(`${bulk.selectedCount} credentials deleted`);
    bulk.clearSelection();
  }, [bulk, deleteItem]);

  const bulkUpdateCategory = useCallback(async (cat: string) => {
    for (const id of bulk.selectedIds) { await updateItem<CredentialVault>("credentials", id, { category: cat }); }
    toast.success(`${bulk.selectedCount} credentials updated`);
    bulk.clearSelection();
  }, [bulk, updateItem]);

  return (
    <div className="space-y-5">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <KeyRound size={22} className="text-primary" /> Credential Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{credentials.length} credentials stored · AES-256-GCM encrypted</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMasterLocked(!masterLocked)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${masterLocked ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"}`}>
            {masterLocked ? <Lock size={15} /> : <Unlock size={15} />}
            {masterLocked ? "Vault Locked" : "Vault Open"}
          </button>
          <button onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}>
            <CheckSquare size={15} /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
          </button>
          <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Credential</button>
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
            { label: "Set Category...", onSelect: bulkUpdateCategory, options: CATEGORIES.map(c => ({ value: c, label: c })) },
          ]}
        />
      )}

      <AnimatePresence>
        {masterLocked && !bulk.bulkMode && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <Shield size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">Vault is Locked</div>
              <p className="text-xs text-muted-foreground mt-0.5">Click <strong>Vault Locked</strong> above to reveal credentials. Auto-hides after 15 seconds.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 max-w-xs">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search credentials..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filterCategory === cat ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((cred, i) => {
          const isRevealed = revealed.has(cred.id);
          const catColor = categoryColors[cred.category] || categoryColors.General;
          return (
            <motion.div key={cred.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}
              onClick={bulk.bulkMode ? () => bulk.toggleSelect(cred.id) : undefined}
              className={`card-elevated p-4 space-y-3 group ${bulk.bulkMode ? 'cursor-pointer' : ''} ${bulk.isSelected(cred.id) ? 'ring-1 ring-primary/30 border-primary/50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {bulk.bulkMode && (
                    <div>{bulk.isSelected(cred.id) ? <CheckSquare size={16} className="text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/30" />}</div>
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${catColor}`}>
                    {cred.label.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{cred.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{cred.service || cred.category}</div>
                  </div>
                </div>
                {!bulk.bulkMode && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {cred.url && (
                      <a href={cred.url.match(/^https?:\/\//) ? cred.url : `https://${cred.url}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><ExternalLink size={12} /></a>
                    )}
                    <button onClick={() => handleDuplicate(cred.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Duplicate"><Copy size={12} /></button>
                    <button onClick={() => openEdit(cred)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(cred.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
              <div className="bg-secondary/40 rounded-xl p-3 space-y-1.5">
                {cred.username && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-[11px] shrink-0 w-16 flex items-center gap-1"><User size={9} /> User:</span>
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="font-mono text-[11px] text-foreground truncate flex-1">{masterLocked ? "••••••" : cred.username}</span>
                      <button onClick={() => { if (masterLocked) { toast.error("Unlock vault"); return; } navigator.clipboard.writeText(cred.username); toast.success("Username copied"); }}
                        className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0"><Copy size={10} /></button>
                    </div>
                  </div>
                )}
                {cred.password && <MaskedField value={cred.password} label="Pass" isVisible={isRevealed} onReveal={() => toggleReveal(cred.id)} onCopy={() => copySecret(cred.password, "Password")} isMasterLocked={masterLocked} />}
                {cred.apiKey && <MaskedField value={cred.apiKey} label="API Key" isVisible={isRevealed} onReveal={() => toggleReveal(cred.id)} onCopy={() => copySecret(cred.apiKey, "API Key")} isMasterLocked={masterLocked} />}
              </div>
              <div className="flex items-center justify-between">
                <span className={`badge text-[10px] ${catColor}`}>{cred.category}</span>
                <span className="text-[10px] text-muted-foreground">{cred.createdAt}</span>
              </div>
              {cred.notes && <p className="text-[11px] text-muted-foreground line-clamp-2">{cred.notes}</p>}
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-6xl mb-4">🔐</div>
          <p className="font-semibold text-base text-foreground">No credentials found</p>
          <p className="text-sm mt-1">{search ? "Try a different search term" : "Add your first credential to get started"}</p>
          {!search && <button onClick={openAdd} className="mt-4 btn-primary text-sm"><Plus size={14} /> Add Credential</button>}
        </div>
      )}

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Credential" : "Add Credential"} onSubmit={saveForm}>
        <FormField label="Label *"><FormInput value={form.label} onChange={v => uf("label", v)} placeholder="My Service Account" /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Service"><FormInput value={form.service} onChange={v => uf("service", v)} placeholder="Cloudflare, GitHub..." /></FormField>
          <FormField label="Category"><FormSelect value={form.category} onChange={v => uf("category", v)} options={CATEGORIES.map(c => ({ value: c, label: c }))} /></FormField>
        </div>
        <FormField label="URL"><FormInput value={form.url} onChange={v => uf("url", v)} placeholder="https://login.service.com" /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Username / Email"><FormInput value={form.username} onChange={v => uf("username", v)} placeholder="admin@example.com" /></FormField>
          <FormField label="Password"><FormInput value={form.password} onChange={v => uf("password", v)} type="password" placeholder="••••••••" /></FormField>
        </div>
        <FormField label="API Key / Token"><FormInput value={form.apiKey} onChange={v => uf("apiKey", v)} type="password" placeholder="sk_live_..." /></FormField>
        <FormField label="Notes"><FormTextarea value={form.notes} onChange={v => uf("notes", v)} placeholder="Additional info, 2FA backup codes, etc." rows={2} /></FormField>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3">
          <Shield size={12} className="text-emerald-500 shrink-0" />
          <span>Passwords & API keys are encrypted with AES-256-GCM before storing</span>
        </div>
      </FormModal>
    </div>
  );
}
