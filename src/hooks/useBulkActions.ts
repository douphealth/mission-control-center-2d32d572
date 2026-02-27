import { useState, useCallback, useMemo } from "react";

export interface BulkActionsReturn<T extends { id: string }> {
  bulkMode: boolean;
  selectedIds: Set<string>;
  toggleBulkMode: () => void;
  toggleSelect: (id: string) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

export function useBulkActions<T extends { id: string }>(): BulkActionsReturn<T> {
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleBulkMode = useCallback(() => {
    setBulkMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(prev => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map(i => i.id));
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBulkMode(false);
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    bulkMode, selectedIds, toggleBulkMode, toggleSelect,
    selectAll, clearSelection, isSelected,
    selectedCount: selectedIds.size,
  };
}
