import { motion } from "framer-motion";
import { SquareCheck as CheckSquare, Square, Trash2, Download, Tag, ArrowRight } from "lucide-react";

export interface BulkDropdown {
  label: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "success";
}

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  allSelected: boolean;
  onDelete: () => void;
  onExport?: () => void;
  dropdowns?: BulkDropdown[];
  actions?: BulkAction[];
}

import React from "react";

export default function BulkActionBar({
  selectedCount, totalCount, onSelectAll, allSelected, onDelete, onExport, dropdowns = [], actions = [],
}: BulkActionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      role="toolbar"
      aria-label="Bulk actions"
      className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 flex-wrap"
    >
      <button
        onClick={onSelectAll}
        aria-label={allSelected ? "Deselect all items" : "Select all items"}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 hover:bg-secondary transition-all"
      >
        {allSelected ? <CheckSquare size={13} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
        {allSelected ? "Deselect All" : "Select All"}
      </button>

      <span className="text-xs text-muted-foreground font-medium" aria-live="polite" aria-atomic="true">
        {selectedCount} of {totalCount} selected
      </span>

      {selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-border/30" />

          {dropdowns.map(dd => (
            <select
              key={dd.label}
              aria-label={dd.label}
              onChange={e => {
                if (e.target.value) dd.onSelect(e.target.value);
                e.target.value = "";
              }}
              className="px-2.5 py-1.5 rounded-lg bg-secondary/50 text-xs font-semibold text-muted-foreground border border-border/15 outline-none cursor-pointer hover:bg-secondary transition-all"
            >
              <option value="">{dd.label}</option>
              {dd.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}

          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                action.variant === "destructive"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : action.variant === "success"
                  ? "bg-success/10 text-success hover:bg-success/20"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {action.icon && <span aria-hidden="true">{action.icon}</span>}
              {action.label}
            </button>
          ))}

          {onExport && (
            <button
              onClick={onExport}
              aria-label={`Export ${selectedCount} selected items as JSON`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <Download size={12} aria-hidden="true" /> Export ({selectedCount})
            </button>
          )}

          <button
            onClick={onDelete}
            aria-label={`Delete ${selectedCount} selected items`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all ml-auto"
          >
            <Trash2 size={12} aria-hidden="true" /> Delete ({selectedCount})
          </button>
        </>
      )}
    </motion.div>
  );
}
