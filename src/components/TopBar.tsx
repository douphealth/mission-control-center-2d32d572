import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Search, Bell, Plus, Menu, Upload, Download, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from './CommandPalette';
import BulkImportModal from './BulkImportModal';

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const quickAddItems = [
  { id: 'websites', label: 'Website', emoji: '🌐' },
  { id: 'tasks', label: 'Task', emoji: '✅' },
  { id: 'github', label: 'GitHub Repo', emoji: '🐙' },
  { id: 'builds', label: 'Build Project', emoji: '🛠️' },
  { id: 'links', label: 'Link', emoji: '🔗' },
  { id: 'notes', label: 'Note', emoji: '📝' },
  { id: 'projects', label: 'Kanban Card', emoji: '📋' },
  { id: 'payments', label: 'Payment', emoji: '💰' },
  { id: 'ideas', label: 'Idea', emoji: '💡' },
  { id: 'credentials', label: 'Credential', emoji: '🔐' },
];

export default function TopBar() {
  const { tasks, exportAllData } = useDashboard();
  const { userName } = useSettingsStore();
  const { setSidebarOpen, setActiveSection, commandPaletteOpen, setCommandPaletteOpen, importModalOpen, setImportModalOpen } = useNavigationStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(t => t.status !== 'done' && t.dueDate < today).length;
  const dueTodayCount = tasks.filter(t => t.status !== 'done' && t.dueDate === today).length;
  const notifCount = overdueCount + dueTodayCount;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setQuickAddOpen(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    if (!quickAddOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setQuickAddOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [quickAddOpen]);

  const handleQuickAdd = (sectionId: string) => {
    setActiveSection(sectionId);
    setQuickAddOpen(false);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mission-control-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border/40 px-3 sm:px-4 lg:px-6 h-14 flex items-center gap-2">
        {/* Mobile menu */}
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 -ml-1 active:scale-95 transition-transform">
          <Menu size={18} />
        </button>

        {/* Search — enhanced with glow effect */}
        <motion.button
          onClick={() => setCommandPaletteOpen(true)}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          className="flex items-center gap-2 flex-1 max-w-md h-9 px-3 rounded-xl bg-secondary/40 border border-border/30 hover:border-primary/30 hover:shadow-[var(--shadow-glow)] transition-all cursor-pointer group"
        >
          <Search size={14} className="text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
          <span className="text-[13px] text-muted-foreground/40 flex-1 text-left hidden sm:inline">Search everything...</span>
          <div className="hidden md:flex items-center gap-1">
            <kbd className="text-[10px] text-muted-foreground/30 bg-background/80 px-1.5 py-0.5 rounded font-mono border border-border/20">⌘K</kbd>
          </div>
        </motion.button>

        <div className="flex items-center gap-1 ml-auto">
          {/* Date chip */}
          <div className="hidden md:flex items-center text-[11px] text-muted-foreground font-medium px-2.5 py-1.5 rounded-lg bg-secondary/30 mr-1 gap-1.5">
            <Sparkles size={11} className="text-primary/40" />
            {formatDate()}
          </div>

          {/* Import */}
          <motion.button
            onClick={() => setImportModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-all"
            title="Import"
          >
            <Upload size={15} />
          </motion.button>

          {/* Export */}
          <motion.button
            onClick={handleExport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-all"
            title="Export"
          >
            <Download size={15} />
          </motion.button>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            <Bell size={15} />
            {notifCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center shadow-sm"
              >
                {notifCount > 9 ? '9+' : notifCount}
              </motion.span>
            )}
          </motion.button>

          {/* Quick Add */}
          <div className="relative">
            <motion.button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="w-8 h-8 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-primary)] hover:shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.5)] transition-shadow"
            >
              <Plus size={15} className={`transition-transform duration-200 ${quickAddOpen ? 'rotate-45' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {quickAddOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQuickAddOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 z-50 w-56 bg-card/95 backdrop-blur-xl rounded-2xl shadow-[var(--shadow-xl)] border border-border/50 p-1.5 overflow-hidden"
                  >
                    <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Quick Add</div>
                    {quickAddItems.map((item, i) => (
                      <motion.button
                        key={item.id}
                        onClick={() => handleQuickAdd(item.id)}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        whileHover={{ x: 2 }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-foreground hover:bg-secondary/60 transition-all active:scale-[0.98]"
                      >
                        <span className="text-sm">{item.emoji}</span>
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    ))}
                    <div className="border-t border-border/30 mt-1 pt-1">
                      <motion.button
                        onClick={() => { setQuickAddOpen(false); setImportModalOpen(true); }}
                        whileHover={{ x: 2 }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-foreground hover:bg-secondary/60 transition-all"
                      >
                        <span className="text-sm">📥</span>
                        <span className="font-medium">Bulk Import</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="hidden sm:flex w-8 h-8 rounded-lg gradient-primary items-center justify-center text-[11px] font-bold text-primary-foreground ml-0.5 shadow-sm cursor-pointer"
          >
            {userName.charAt(0)}
          </motion.div>
        </div>
      </header>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onImport={() => setImportModalOpen(true)} />
      <BulkImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </>
  );
}
