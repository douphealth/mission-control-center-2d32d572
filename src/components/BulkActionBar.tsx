import { motion } from "framer-motion";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface BulkDropdown {
  label: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  allSelected: boolean;
  onDelete: () => void;
  dropdowns?: BulkDropdown[];
}

export default function BulkActionBar({
  selectedCount, totalCount, onSelectAll, allSelected, onDelete, dropdowns = [],
}: BulkActionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 flex-wrap"
    >
      <button
        onClick={onSelectAll}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 hover:bg-secondary transition-all"
      >
        {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
        {allSelected ? "Deselect All" : "Select All"}
      </button>

      <span className="text-xs text-muted-foreground font-medium">
        {selectedCount} of {totalCount} selected
      </span>

      {selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-border/30" />

          {dropdowns.map(dd => (
            <select
              key={dd.label}
              onChange={e => {
                if (e.target.value) dd.onSelect(e.target.value);
                e.target.value = "";
              }}
              className="px-2.5 py-1.5 rounded-lg bg-secondary/50 text-xs font-semibold text-muted-foreground border border-border/15 outline-none cursor-pointer"
            >
              <option value="">{dd.label}</option>
              {dd.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all ml-auto"
          >
            <Trash2 size={12} /> Delete ({selectedCount})
          </button>
        </>
      )}
    </motion.div>
  );
}
