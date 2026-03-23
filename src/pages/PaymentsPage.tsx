import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, CheckSquare, Copy } from "lucide-react";
import FormModal, { FormField, FormInput, FormTextarea, FormSelect } from "@/components/FormModal";
import type { Payment } from "@/lib/store";
import { toast } from "sonner";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

const typeIcons: Record<string, string> = { income: "💰", expense: "💸", invoice: "📄", subscription: "🔄" };
const statusBadge: Record<string, string> = { paid: "badge-success", pending: "badge-warning", overdue: "badge-destructive", cancelled: "badge-muted" };

const emptyPayment: Omit<Payment, "id"> = { title: "", amount: 0, currency: "USD", type: "expense", status: "pending", category: "General", from: "", to: "", dueDate: new Date().toISOString().split("T")[0], paidDate: "", recurring: false, recurringInterval: "", linkedProject: "", notes: "", createdAt: new Date().toISOString().split("T")[0] };

export default function PaymentsPage() {
  const { payments, updateData, duplicateItem } = useDashboard();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPayment);
  const bulk = useBulkActions<Payment>();
  const cd = useConfirmDialog();

  const filtered = payments
    .filter(p => filterType === "all" || p.type === filterType)
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalIncome = payments.filter(p => (p.type === "income") && p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalExpenses = payments.filter(p => (p.type === "expense" || p.type === "subscription") && p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount, 0);
  const overdueCount = payments.filter(p => p.status === "overdue").length;

  const openAdd = () => { setEditId(null); setForm(emptyPayment); setModalOpen(true); };
  const openEdit = (p: Payment) => { setEditId(p.id); const { id, ...rest } = p; setForm(rest); setModalOpen(true); };
  const saveForm = () => {
    if (!form.title.trim()) return;
    if (editId) {
      updateData({ payments: payments.map(p => p.id === editId ? { ...p, ...form } : p) });
      toast.success("Payment updated");
    } else {
      updateData({ payments: [{ id: Math.random().toString(36).slice(2, 10), ...form, createdAt: new Date().toISOString().split("T")[0] }, ...payments] });
      toast.success("Payment added");
    }
    setModalOpen(false);
  };
  const deletePayment = (id: string) => {
    cd.confirm({
      title: "Delete Payment",
      description: "This payment record will be permanently removed.",
      onConfirm: () => {
        updateData({ payments: payments.filter(p => p.id !== id) });
        toast.success("Payment deleted");
      },
    });
  };
  const duplicatePayment = async (id: string) => { const newId = await duplicateItem("payments", id, { status: "pending", paidDate: "" }); if (newId) toast.success("Payment duplicated"); };
  const markPaid = (id: string) => {
    updateData({ payments: payments.map(p => p.id === id ? { ...p, status: "paid" as const, paidDate: new Date().toISOString().split("T")[0] } : p) });
    toast.success("Marked as paid");
  };
  const uf = (field: keyof typeof form, val: any) => setForm(f => ({ ...f, [field]: val }));
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    if (!confirm(`Delete ${bulk.selectedCount} payment(s)?`)) return;
    updateData({ payments: payments.filter(p => !bulk.selectedIds.has(p.id)) });
    toast.success(`${bulk.selectedCount} payments deleted`);
    bulk.clearSelection();
  }, [bulk, payments, updateData]);

  const bulkUpdateStatus = useCallback((status: string) => {
    updateData({ payments: payments.map(p => bulk.selectedIds.has(p.id) ? { ...p, status: status as any } : p) });
    toast.success(`${bulk.selectedCount} payments updated`);
    bulk.clearSelection();
  }, [bulk, payments, updateData]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payments & Finance</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{payments.length} records{overdueCount > 0 && <span className="text-destructive font-medium"> · {overdueCount} overdue</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all ${bulk.bulkMode ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/20'}`}>
            <CheckSquare size={15} /> {bulk.bulkMode ? 'Cancel' : 'Bulk'}
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-lg shadow-primary/20">
            <Plus size={16} /> Add
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
              { value: "paid", label: "✅ Paid" }, { value: "pending", label: "⏳ Pending" },
              { value: "overdue", label: "🔴 Overdue" }, { value: "cancelled", label: "❌ Cancelled" },
            ]},
          ]}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Income", value: fmt(totalIncome), icon: ArrowUpRight, color: "text-success", bg: "from-success/15 to-success/5" },
          { label: "Total Expenses", value: fmt(totalExpenses), icon: ArrowDownRight, color: "text-destructive", bg: "from-destructive/15 to-destructive/5" },
          { label: "Net Profit", value: fmt(totalIncome - totalExpenses), icon: TrendingUp, color: totalIncome - totalExpenses >= 0 ? "text-success" : "text-destructive", bg: "from-primary/15 to-primary/5" },
          { label: "Pending", value: fmt(pendingAmount), icon: RefreshCw, color: "text-warning", bg: "from-warning/15 to-warning/5" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 sm:max-w-xs">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto hide-scrollbar">
          {["all", "income", "expense", "subscription"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap ${filterType === t ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "all" ? `All` : `${typeIcons[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Payment List */}
      <div className="space-y-2">
        {filtered.map((payment, i) => (
          <motion.div key={payment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            onClick={bulk.bulkMode ? () => bulk.toggleSelect(payment.id) : undefined}
            className={`card-elevated p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group ${bulk.bulkMode ? 'cursor-pointer' : ''} ${bulk.isSelected(payment.id) ? 'ring-1 ring-primary/30 border-primary/50' : ''}`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {bulk.bulkMode && (
                <div className="flex-shrink-0">{bulk.isSelected(payment.id) ? <CheckSquare size={16} className="text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/30" />}</div>
              )}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                {typeIcons[payment.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-card-foreground truncate">{payment.title}</span>
                  {payment.recurring && <RefreshCw size={10} className="text-muted-foreground flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{payment.category}</span>
                  {payment.linkedProject && <span className="text-[10px] text-primary hidden sm:inline">• {payment.linkedProject}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="text-left sm:text-right flex-shrink-0">
                <div className={`text-sm font-bold ${payment.type === "income" || payment.type === "invoice" ? "text-success" : "text-card-foreground"}`}>
                  {payment.type === "income" || payment.type === "invoice" ? "+" : "-"}{fmt(payment.amount)}
                </div>
                <div className="text-[10px] text-muted-foreground">{payment.dueDate || payment.paidDate}</div>
              </div>
              <span className={`${statusBadge[payment.status]} text-[10px] flex-shrink-0`}>{payment.status}</span>
              {!bulk.bulkMode && (
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {(payment.status === "pending" || payment.status === "overdue") && (
                    <button onClick={() => markPaid(payment.id)} className="text-[11px] text-success hover:underline px-1.5">Pay</button>
                  )}
                  <button onClick={() => duplicatePayment(payment.id)} className="text-muted-foreground hover:text-blue-500 p-1" title="Duplicate"><Copy size={12} /></button>
                  <button onClick={() => openEdit(payment)} className="text-muted-foreground hover:text-foreground p-1"><Edit2 size={12} /></button>
                  <button onClick={() => deletePayment(payment.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={12} /></button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">💰</div>
          <p className="font-medium">No payments found</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary hover:underline">+ Add your first payment</button>
        </div>
      )}

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Payment" : "Add Payment"} onSubmit={saveForm} size="lg">
        <FormField label="Title *"><FormInput value={form.title} onChange={v => uf("title", v)} placeholder="Payment description" /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount"><FormInput value={String(form.amount)} onChange={v => uf("amount", parseFloat(v) || 0)} type="number" placeholder="0.00" /></FormField>
          <FormField label="Type">
            <FormSelect value={form.type} onChange={v => uf("type", v)} options={[{value:"income",label:"💰 Income"},{value:"expense",label:"💸 Expense"},{value:"invoice",label:"📄 Invoice"},{value:"subscription",label:"🔄 Subscription"}]} />
          </FormField>
          <FormField label="Status">
            <FormSelect value={form.status} onChange={v => uf("status", v)} options={[{value:"paid",label:"Paid"},{value:"pending",label:"Pending"},{value:"overdue",label:"Overdue"},{value:"cancelled",label:"Cancelled"}]} />
          </FormField>
          <FormField label="Category"><FormInput value={form.category} onChange={v => uf("category", v)} placeholder="Freelance, Hosting, etc." /></FormField>
          <FormField label="Due Date"><FormInput value={form.dueDate} onChange={v => uf("dueDate", v)} type="date" /></FormField>
          <FormField label="Paid Date"><FormInput value={form.paidDate} onChange={v => uf("paidDate", v)} type="date" /></FormField>
          <FormField label="From"><FormInput value={form.from} onChange={v => uf("from", v)} placeholder="Payer" /></FormField>
          <FormField label="To"><FormInput value={form.to} onChange={v => uf("to", v)} placeholder="Payee" /></FormField>
        </div>
        <FormField label="Linked Project"><FormInput value={form.linkedProject} onChange={v => uf("linkedProject", v)} placeholder="Project name" /></FormField>
        <FormField label="Notes"><FormTextarea value={form.notes} onChange={v => uf("notes", v)} placeholder="Additional notes..." rows={2} /></FormField>
      </FormModal>
    </div>
  );
}
