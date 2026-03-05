import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Search, Bell, Plus, Menu, Upload, Download, Sparkles, Mail } from 'lucide-react';
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
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-2xl border-b border-border/20 px-4 sm:px-6 lg:px-8 h-[72px] flex items-center gap-3">
        {/* Mobile menu */}
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-2 -ml-1 active:scale-90 transition-transform touch-manipulation">
          <Menu size={20} />
        </button>

        {/* Search — Dribbble style with shortcut indicator */}
        <motion.button
          onClick={() => setCommandPaletteOpen(true)}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2.5 flex-1 max-w-lg h-11 px-4 rounded-2xl bg-secondary/50 border border-border/20 hover:border-primary/20 hover:bg-secondary/70 transition-all duration-300 cursor-pointer group touch-manipulation"
        >
          <Search size={16} className="text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
          <span className="text-sm text-muted-foreground/40 flex-1 text-left truncate">Search task</span>
          <div className="hidden md:flex items-center gap-1">
            <kbd className="text-[10px] text-muted-foreground/30 bg-card px-2 py-1 rounded-lg font-mono border border-border/30 shadow-sm">⌘ F</kbd>
          </div>
        </motion.button>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Action buttons — clean icon-only style */}
          <motion.button
            onClick={() => setImportModalOpen(true)}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center w-10 h-10 rounded-2xl text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-all touch-manipulation"
            title="Import"
          >
            <Mail size={18} />
          </motion.button>

          <motion.button
            onClick={handleExport}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center w-10 h-10 rounded-2xl text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-all touch-manipulation"
            title="Export"
          >
            <Download size={18} />
          </motion.button>

          {/* Notifications — with count badge */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-all touch-manipulation"
          >
            <Bell size={18} />
            {notifCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center shadow-md"
              >
                {notifCount > 9 ? '9+' : notifCount}
              </motion.span>
            )}
          </motion.button>

          <div className="h-8 w-px bg-border/30 mx-1 hidden sm:block" />

          {/* User avatar — larger, with details */}
          <div className="hidden sm:flex items-center gap-3 pl-2">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-[13px] font-bold text-primary-foreground shadow-[var(--shadow-primary)] cursor-pointer"
            >
              {userName.charAt(0)}
            </motion.div>
            <div className="hidden lg:block min-w-0 mr-2">
              <div className="text-sm font-semibold text-foreground truncate">{userName}</div>
              <div className="text-[10px] text-muted-foreground/50 truncate">{userName.toLowerCase().replace(/\s/g, '')}@email.com</div>
            </div>
          </div>

          {/* Quick Add — floating action button */}
          <div className="relative">
            <motion.button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              whileTap={{ scale: 0.88 }}
              className="w-10 h-10 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-primary)] hover:shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.5)] transition-shadow touch-manipulation"
            >
              <Plus size={18} className={`transition-transform duration-200 ${quickAddOpen ? 'rotate-45' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {quickAddOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-foreground/10 sm:bg-transparent" onClick={() => setQuickAddOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed sm:absolute inset-x-3 sm:inset-x-auto bottom-20 sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 z-50 sm:w-60 bg-card/98 backdrop-blur-2xl rounded-3xl shadow-[var(--shadow-xl)] border border-border/40 p-2 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-widest">Quick Add</div>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-0.5">
                      {quickAddItems.map((item, i) => (
                        <motion.button
                          key={item.id}
                          onClick={() => handleQuickAdd(item.id)}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-2xl text-[13px] text-foreground hover:bg-secondary/60 active:bg-secondary transition-all touch-manipulation"
                        >
                          <span className="text-base sm:text-sm">{item.emoji}</span>
                          <span className="font-medium">{item.label}</span>
                        </motion.button>
                      ))}
                    </div>
                    <div className="border-t border-border/20 mt-1 pt-1">
                      <motion.button
                        onClick={() => { setQuickAddOpen(false); setImportModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-2xl text-[13px] text-foreground hover:bg-secondary/60 active:bg-secondary transition-all touch-manipulation"
                      >
                        <span className="text-base sm:text-sm">📥</span>
                        <span className="font-medium">Bulk Import</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onImport={() => setImportModalOpen(true)} />
      <BulkImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </>
  );
}
