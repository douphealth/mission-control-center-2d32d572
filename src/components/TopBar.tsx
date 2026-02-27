import { useDashboard } from '@/contexts/DashboardContext';
import { Search, Bell, Plus, Menu, Upload, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from './CommandPalette';
import BulkImportModal from './BulkImportModal';

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  const { userName, setSidebarOpen, setActiveSection, tasks, exportAllData } = useDashboard();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(t => t.status !== 'done' && t.dueDate < today).length;
  const dueTodayCount = tasks.filter(t => t.status !== 'done' && t.dueDate === today).length;
  const notifCount = overdueCount + dueTodayCount;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setQuickAddOpen(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 -ml-1">
          <Menu size={18} />
        </button>

        {/* Search */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 flex-1 max-w-md h-9 px-3 rounded-lg bg-secondary/50 border border-border/30 hover:border-border/60 transition-all cursor-pointer"
        >
          <Search size={14} className="text-muted-foreground/60 flex-shrink-0" />
          <span className="text-[13px] text-muted-foreground/50 flex-1 text-left hidden sm:inline">Search...</span>
          <kbd className="text-[10px] text-muted-foreground/40 bg-background px-1.5 py-0.5 rounded font-mono hidden md:inline border border-border/30">⌘K</kbd>
        </button>

        <div className="flex items-center gap-1 ml-auto">
          {/* Date */}
          <div className="hidden md:flex items-center text-xs text-muted-foreground font-medium px-2.5 py-1.5 rounded-lg bg-secondary/30 mr-1">
            📅 {formatDate()}
          </div>

          {/* Import */}
          <button onClick={() => setImportOpen(true)}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all" title="Import">
            <Upload size={15} />
          </button>

          {/* Export */}
          <button onClick={handleExport}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all" title="Export">
            <Download size={15} />
          </button>

          {/* Notifications */}
          <button className="relative flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all">
            <Bell size={15} />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>

          {/* Quick Add */}
          <div className="relative">
            <button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all"
            >
              <Plus size={15} className={`transition-transform duration-150 ${quickAddOpen ? 'rotate-45' : ''}`} />
            </button>

            <AnimatePresence>
              {quickAddOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQuickAddOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-card rounded-xl shadow-lg border border-border/50 p-1.5"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Quick Add</div>
                    {quickAddItems.map(item => (
                      <button key={item.id} onClick={() => handleQuickAdd(item.id)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-foreground hover:bg-secondary/60 transition-colors">
                        <span className="text-sm">{item.emoji}</span>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                    <div className="border-t border-border/40 mt-1 pt-1">
                      <button onClick={() => { setQuickAddOpen(false); setImportOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-foreground hover:bg-secondary/60 transition-colors">
                        <span className="text-sm">📥</span>
                        <span className="font-medium">Bulk Import</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User avatar */}
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-secondary items-center justify-center text-xs font-semibold text-foreground ml-0.5">
            {userName.charAt(0)}
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onImport={() => setImportOpen(true)} />
      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
