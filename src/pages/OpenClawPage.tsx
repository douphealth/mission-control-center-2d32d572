import { useDashboard } from "@/contexts/DashboardContext";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bug, Activity, ExternalLink, Plus, Trash2, Edit2, Globe,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Zap, Lock
} from "lucide-react";
import FormModal, { FormField, FormInput, FormSelect, FormTextarea } from "@/components/FormModal";
import { toast } from "sonner";

// OpenClaw = generic service/API tracker — user can track any service
interface ServiceEntry {
  id: string;
  name: string;
  url: string;
  status: "operational" | "degraded" | "outage" | "maintenance";
  category: string;
  notes: string;
  lastChecked: string;
}

const defaultServices: ServiceEntry[] = [
  { id: "oc1", name: "OpenClaw API", url: "https://openclaw.io", status: "operational", category: "API", notes: "Main API endpoint", lastChecked: "2026-02-26" },
  { id: "oc2", name: "OpenClaw Dashboard", url: "https://app.openclaw.io", status: "operational", category: "Dashboard", notes: "", lastChecked: "2026-02-26" },
];

const emptyForm: Omit<ServiceEntry, "id"> = {
  name: "", url: "", status: "operational", category: "API", notes: "",
  lastChecked: new Date().toISOString().split("T")[0],
};

function StatusBadge({ status }: { status: ServiceEntry["status"] }) {
  const map = {
    operational: { cls: "badge-success", label: "🟢 Operational" },
    degraded: { cls: "badge-warning", label: "🟡 Degraded" },
    outage: { cls: "badge-destructive", label: "🔴 Outage" },
    maintenance: { cls: "badge-info", label: "🔵 Maintenance" },
  };
  const { cls, label } = map[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function OpenClawPage() {
  const { credentials } = useDashboard();
  const [services, setServices] = useState<ServiceEntry[]>(defaultServices);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ServiceEntry, "id">>(emptyForm);

  const ocCreds = credentials.filter(c =>
    c.service.toLowerCase().includes("openclaw") ||
    c.label.toLowerCase().includes("openclaw")
  );

  const operational = services.filter(s => s.status === "operational").length;
  const issues = services.filter(s => s.status !== "operational").length;

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm, lastChecked: new Date().toISOString().split("T")[0] });
    setModalOpen(true);
  };

  const openEdit = (s: ServiceEntry) => {
    setEditId(s.id);
    const { id, ...rest } = s;
    setForm(rest);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (editId) {
      setServices(prev => prev.map(s => s.id === editId ? { ...s, ...form } : s));
      toast.success("Service updated");
    } else {
      setServices(prev => [{ id: Math.random().toString(36).slice(2), ...form }, ...prev]);
      toast.success("Service added");
    }
    setModalOpen(false);
  };

  const del = (id: string) => {
    if (!confirm("Remove this service?")) return;
    setServices(prev => prev.filter(s => s.id !== id));
    toast.success("Removed");
  };

  const uf = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bug size={22} className="text-violet-500" /> OpenClaw
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track OpenClaw services and API endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://openclaw.io" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Activity size={12} className="animate-pulse" /> System Status
          </a>
          <button onClick={openAdd} className="btn-primary text-sm">
            <Plus size={14} /> Add Service
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 size={17} className="text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-bold">{operational}</div>
            <div className="text-xs text-muted-foreground">Operational</div>
          </div>
        </div>
        <div className="card-glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={17} className="text-red-500" />
          </div>
          <div>
            <div className="text-xl font-bold">{issues}</div>
            <div className="text-xs text-muted-foreground">Issues</div>
          </div>
        </div>
        <div className="card-glass p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Globe size={17} className="text-violet-500" />
          </div>
          <div>
            <div className="text-xl font-bold">{services.length}</div>
            <div className="text-xs text-muted-foreground">Services</div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="space-y-2">
        {services.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card-elevated p-4 flex items-center gap-4 group">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.status === "operational" ? "bg-emerald-500" :
                s.status === "degraded" ? "bg-amber-500" :
                  s.status === "outage" ? "bg-red-500" : "bg-blue-500"
              }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{s.name}</span>
                <StatusBadge status={s.status} />
                <span className="badge-muted">{s.category}</span>
              </div>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5">
                  {s.url} <ExternalLink size={9} />
                </a>
              )}
              {s.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{s.notes}</p>}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock size={9} /> {s.lastChecked}
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Edit2 size={12} />
              </button>
              <button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={12} />
              </button>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors">
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Saved creds */}
      {ocCreds.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><Lock size={13} className="text-primary" /> Saved Credentials</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ocCreds.map(c => (
              <div key={c.id} className="card-glass p-3 space-y-1">
                <div className="font-semibold text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.username}</div>
                {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1">Open <ExternalLink size={9} /></a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Service" : "Add Service"} onSubmit={save}>
        <FormField label="Service Name *">
          <FormInput value={form.name} onChange={v => uf("name", v)} placeholder="OpenClaw API v2" />
        </FormField>
        <FormField label="URL">
          <FormInput value={form.url} onChange={v => uf("url", v)} placeholder="https://api.openclaw.io" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status">
            <FormSelect value={form.status} onChange={v => uf("status", v)} options={[
              { value: "operational", label: "Operational" },
              { value: "degraded", label: "Degraded" },
              { value: "outage", label: "Outage" },
              { value: "maintenance", label: "Maintenance" },
            ]} />
          </FormField>
          <FormField label="Category">
            <FormInput value={form.category} onChange={v => uf("category", v)} placeholder="API, Dashboard, etc." />
          </FormField>
        </div>
        <FormField label="Notes">
          <FormTextarea value={form.notes} onChange={v => uf("notes", v)} rows={2} placeholder="Additional notes..." />
        </FormField>
      </FormModal>
    </div>
  );
}
