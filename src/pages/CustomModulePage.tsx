import { useState, useMemo, useCallback } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import type { CustomModule } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Search, X, Settings2, Table2, Download, Upload } from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect, FormTagsInput } from "@/components/FormModal";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Long Text" },
  { value: "boolean", label: "Checkbox" },
  { value: "tags", label: "Tags" },
  { value: "select", label: "Dropdown" },
];

interface Props {
  sectionId: string;
}

export default function CustomModulePage({ sectionId }: Props) {
  const moduleId = sectionId.replace("custom-", "");
  const { customModules, updateItem, deleteItem, genId } = useDashboard();
  const mod = customModules.find(m => m.id === moduleId);

  const [search, setSearch] = useState("");
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [newField, setNewField] = useState({ key: "", label: "", type: "text" as string, options: "" });

  const cd = useConfirmDialog();

  if (!mod) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h1 className="text-xl font-bold text-foreground mb-2">Module not found</h1>
        <p className="text-muted-foreground text-sm">This custom module may have been deleted.</p>
      </div>
    );
  }

  const fields = mod.fields || [];
  const data = mod.data || [];

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      fields.some(f => String(row[f.key] || "").toLowerCase().includes(q))
    );
  }, [data, search, fields]);

  const openAddRow = () => {
    const empty: Record<string, any> = { __id: `row-${Date.now()}` };
    fields.forEach(f => { empty[f.key] = f.type === "boolean" ? false : f.type === "tags" ? [] : f.type === "number" ? 0 : ""; });
    setEditingRow(empty);
    setEditingRowIdx(null);
  };

  const openEditRow = (row: Record<string, any>, idx: number) => {
    setEditingRow({ ...row });
    setEditingRowIdx(idx);
  };

  const saveRow = async () => {
    if (!editingRow || !mod) return;
    const newData = [...data];
    if (editingRowIdx !== null) {
      newData[editingRowIdx] = editingRow;
    } else {
      newData.push(editingRow);
    }
    await updateItem<CustomModule>("customModules", mod.id, { data: newData });
    setEditingRow(null);
    setEditingRowIdx(null);
    toast.success(editingRowIdx !== null ? "Row updated" : "Row added");
  };

  const deleteRow = (idx: number) => {
    cd.confirm({
      title: "Delete Row",
      description: "This row will be permanently removed.",
      onConfirm: async () => {
        const newData = data.filter((_, i) => i !== idx);
        await updateItem<CustomModule>("customModules", mod.id, { data: newData });
        toast.success("Row deleted");
      },
    });
  };

  const addField = async () => {
    if (!newField.label.trim()) return;
    const key = newField.key || newField.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (fields.some(f => f.key === key)) { toast.error("Field key already exists"); return; }
    const field: any = { key, label: newField.label.trim(), type: newField.type };
    if (newField.type === "select" && newField.options) {
      field.options = newField.options.split(",").map(o => o.trim()).filter(Boolean);
    }
    await updateItem<CustomModule>("customModules", mod.id, { fields: [...fields, field] });
    setNewField({ key: "", label: "", type: "text", options: "" });
    toast.success("Field added");
  };

  const removeField = async (key: string) => {
    await updateItem<CustomModule>("customModules", mod.id, {
      fields: fields.filter(f => f.key !== key),
      data: data.map(row => { const { [key]: _, ...rest } = row; return rest; }),
    });
    toast.success("Field removed");
  };

  const exportCSV = () => {
    const headers = fields.map(f => f.label);
    const rows = data.map(row => fields.map(f => {
      const v = row[f.key];
      return Array.isArray(v) ? v.join("; ") : String(v ?? "");
    }));
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${mod.name}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mod.icon}</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{mod.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {data.length} rows · {fields.length} columns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFieldEditor(e => !e)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium transition-colors touch-manipulation">
            <Settings2 size={14} /> Columns
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-medium transition-colors touch-manipulation">
            <Download size={14} /> Export
          </button>
          <button onClick={openAddRow}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20 touch-manipulation">
            <Plus size={16} /> Add Row
          </button>
        </div>
      </div>

      {/* Column editor */}
      <AnimatePresence>
        {showFieldEditor && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="card-elevated p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Table2 size={14} /> Manage Columns</h3>
              <div className="space-y-1.5">
                {fields.map(f => (
                  <div key={f.key} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50">
                    <span className="text-sm text-foreground flex-1">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{f.type}</span>
                    <button onClick={() => removeField(f.key)} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <input value={newField.label} onChange={e => setNewField(f => ({ ...f, label: e.target.value }))}
                  placeholder="Column name" className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none" />
                <select value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))}
                  className="px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none appearance-none">
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {newField.type === "select" && (
                  <input value={newField.options} onChange={e => setNewField(f => ({ ...f, options: e.target.value }))}
                    placeholder="Options (comma separated)" className="flex-1 min-w-[150px] px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none" />
                )}
                <button onClick={addField} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 max-w-sm">
        <Search size={14} className="text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rows..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
        {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>}
      </div>

      {/* Table */}
      {fields.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Table2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No columns defined</p>
          <p className="text-sm mt-1">Click "Columns" to add your first column, then start adding rows.</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  {fields.map(f => (
                    <th key={f.key} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.__id || idx} className="border-b border-border/20 hover:bg-secondary/30 transition-colors group">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                    {fields.map(f => (
                      <td key={f.key} className="px-4 py-3 max-w-[250px]">
                        {f.type === "url" && row[f.key] ? (
                          <a href={row[f.key]} target="_blank" rel="noopener" className="text-primary hover:underline truncate block text-xs">{row[f.key]}</a>
                        ) : f.type === "boolean" ? (
                          <span className={row[f.key] ? "text-emerald-500" : "text-muted-foreground"}>{row[f.key] ? "✓" : "✗"}</span>
                        ) : f.type === "tags" && Array.isArray(row[f.key]) ? (
                          <div className="flex gap-1 flex-wrap">
                            {(row[f.key] as string[]).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">{t}</span>)}
                          </div>
                        ) : (
                          <span className="text-foreground text-xs truncate block">{String(row[f.key] ?? "")}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditRow(row, data.indexOf(row))} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => deleteRow(data.indexOf(row))} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && data.length > 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No rows match your search</div>
          )}
          {data.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No data yet. Click "Add Row" to start.</p>
            </div>
          )}
        </div>
      )}

      {/* Row edit modal */}
      {editingRow && (
        <FormModal open={!!editingRow} onClose={() => { setEditingRow(null); setEditingRowIdx(null); }}
          title={editingRowIdx !== null ? "Edit Row" : "Add Row"} onSubmit={saveRow}>
          {fields.map(f => (
            <FormField key={f.key} label={f.label}>
              {f.type === "textarea" ? (
                <FormTextarea value={editingRow[f.key] || ""} onChange={v => setEditingRow(r => r ? { ...r, [f.key]: v } : r)} />
              ) : f.type === "tags" ? (
                <FormTagsInput value={editingRow[f.key] || []} onChange={v => setEditingRow(r => r ? { ...r, [f.key]: v } : r)} />
              ) : f.type === "select" && f.options ? (
                <FormSelect value={editingRow[f.key] || ""} onChange={v => setEditingRow(r => r ? { ...r, [f.key]: v } : r)}
                  options={f.options.map(o => ({ value: o, label: o }))} />
              ) : f.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingRow(r => r ? { ...r, [f.key]: !r[f.key] } : r)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${editingRow[f.key] ? "bg-primary" : "bg-secondary"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editingRow[f.key] ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-sm text-muted-foreground">{editingRow[f.key] ? "Yes" : "No"}</span>
                </div>
              ) : (
                <FormInput value={String(editingRow[f.key] ?? "")}
                  onChange={v => setEditingRow(r => r ? { ...r, [f.key]: f.type === "number" ? parseFloat(v) || 0 : v } : r)}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"} />
              )}
            </FormField>
          ))}
        </FormModal>
      )}

      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
