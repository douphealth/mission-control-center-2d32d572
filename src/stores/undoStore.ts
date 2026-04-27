import { create } from 'zustand';
import { toast } from 'sonner';

interface UndoEntry {
  id: string;
  label: string;
  restore: () => Promise<void>;
  expiresAt: number;
}

interface UndoState {
  stack: UndoEntry[];
  push: (entry: Omit<UndoEntry, 'id' | 'expiresAt'>) => string;
  undo: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const TTL_MS = 10_000; // undo window: 10 seconds

export const useUndoStore = create<UndoState>((set, get) => ({
  stack: [],

  push: (entry) => {
    const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = Date.now() + TTL_MS;

    set(s => ({ stack: [{ ...entry, id, expiresAt }, ...s.stack].slice(0, 5) }));

    // Auto-expire
    setTimeout(() => {
      get().remove(id);
    }, TTL_MS);

    return id;
  },

  undo: async (id) => {
    const entry = get().stack.find(e => e.id === id);
    if (!entry) return;
    get().remove(id);
    try {
      await entry.restore();
      toast.success(`Restored: ${entry.label}`);
    } catch {
      toast.error(`Failed to restore ${entry.label}`);
    }
  },

  remove: (id) => {
    set(s => ({ stack: s.stack.filter(e => e.id !== id) }));
  },

  clear: () => set({ stack: [] }),
}));

// Helper to show a toast with undo action
export function toastWithUndo(
  message: string,
  undoLabel: string,
  restore: () => Promise<void>,
) {
  const undoId = useUndoStore.getState().push({ label: undoLabel, restore });

  toast.success(message, {
    duration: 10_000,
    action: {
      label: 'Undo',
      onClick: () => useUndoStore.getState().undo(undoId),
    },
  });

  return undoId;
}
