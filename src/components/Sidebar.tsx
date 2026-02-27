import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Home, CheckSquare, Calendar, FileText, Timer,
  Globe, Github, Hammer, Link2, BarChart3,
  Search as SearchIcon, Cloud, Rocket, Bug,
  Settings, Sun, Moon, X, Sparkles,
  DollarSign, Lightbulb, KeyRound, Flame,
  ChevronLeft, ChevronRight, Plus, Check
} from 'lucide-react';
import { toast } from 'sonner';

const navGroups = [
  {
    label: 'GENERAL',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'notes', label: 'Notes', icon: FileText },
      { id: 'habits', label: 'Habit Tracker', icon: Flame },
      { id: 'focus', label: 'Focus Timer', icon: Timer },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { id: 'websites', label: 'My Websites', icon: Globe },
      { id: 'github', label: 'GitHub', icon: Github },
      { id: 'builds', label: 'Build Projects', icon: Hammer },
      { id: 'links', label: 'Links Hub', icon: Link2 },
      { id: 'projects', label: 'Kanban Board', icon: BarChart3 },
    ],
  },
  {
    label: 'BUSINESS',
    items: [
      { id: 'payments', label: 'Payments', icon: DollarSign },
      { id: 'ideas', label: 'Ideas', icon: Lightbulb },
      { id: 'credentials', label: 'Credentials', icon: KeyRound },
    ],
  },
  {
    label: 'PLATFORMS',
    items: [
      { id: 'seo', label: 'SEO Center', icon: SearchIcon },
      { id: 'cloudflare', label: 'Cloudflare', icon: Cloud },
      { id: 'vercel', label: 'Vercel', icon: Rocket },
      { id: 'openclaw', label: 'OpenClaw', icon: Bug },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const { tasks, payments, ideas, customModules, addItem, genId } = useDashboard();
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useNavigationStore();
  const { userName, userRole, theme, toggleTheme } = useSettingsStore();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newModName, setNewModName] = useState('');
  const [newModEmoji, setNewModEmoji] = useState('📁');

  const openTaskCount = tasks.filter(t => t.status !== 'done').length;
  const overduePayments = payments.filter(p => p.status === 'overdue').length;
  const activeIdeas = ideas.filter(i => i.status === 'exploring' || i.status === 'validated').length;

  const getBadge = (id: string): number | null => {
    if (id === 'tasks') return openTaskCount || null;
    if (id === 'payments' && overduePayments > 0) return overduePayments;
    if (id === 'ideas' && activeIdeas > 0) return activeIdeas;
    return null;
  };

  const isCollapsed = sidebarCollapsed;

  const handleAddModule = async (groupLabel: string) => {
    if (!newModName.trim()) return;
    await addItem('customModules', {
      name: newModName.trim(),
      icon: newModEmoji,
      description: '',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'url', label: 'URL', type: 'url' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      data: [],
      createdAt: new Date().toISOString(),
      order: customModules.length,
      visible: true,
      color: '',
    });
    toast.success(`"${newModName}" added!`);
    setNewModName('');
    setNewModEmoji('📁');
    setAddingTo(null);
  };

  const emojiOptions = ['📁', '📊', '🎯', '🏷️', '📱', '🖥️', '🎨', '📐', '🔧', '⚙️', '🌟', '💎', '🏠', '📈', '🛒', '📡', '🔬', '🎮', '🎵', '📚'];

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed top-0 left-0 z-50 h-full flex flex-col bg-card border-r border-border/50
          lg:relative lg:translate-x-0 transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: isCollapsed ? 68 : 248 }}
      >
        {/* Close (mobile) */}
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 lg:hidden text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>

        {/* Logo / Brand */}
        <div className={`h-14 flex items-center border-b border-border/40 ${isCollapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.5 }}
            className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0 shadow-[var(--shadow-primary)]"
          >
            N
          </motion.div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm text-foreground tracking-tight">Nexus</div>
              <div className="text-[10px] text-muted-foreground">Mission Control</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-50 w-6 h-6 items-center justify-center rounded-full bg-card border border-border shadow-sm hover:bg-secondary hover:scale-110 transition-all"
        >
          {isCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              {!isCollapsed && (
                <div className="flex items-center justify-between px-2.5 mb-1">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/40 uppercase">
                    {group.label}
                  </span>
                  {group.label !== 'SYSTEM' && (
                    <button
                      onClick={() => setAddingTo(addingTo === group.label ? null : group.label)}
                      className="p-0.5 rounded text-muted-foreground/25 hover:text-primary transition-all hover:scale-110"
                      title={`Add to ${group.label}`}
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = activeSection === item.id;
                  const badge = getBadge(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                      whileHover={{ x: isCollapsed ? 0 : 2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative
                        ${isCollapsed ? 'justify-center px-0' : ''}
                        ${active
                          ? 'bg-primary/8 text-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebarActiveIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <item.icon size={16} strokeWidth={active ? 2 : 1.6} className="flex-shrink-0" />
                      {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {badge !== null && !isCollapsed && (
                        <span className="text-[10px] font-semibold bg-primary/8 text-primary min-w-[20px] text-center px-1.5 py-0.5 rounded-md">{badge}</span>
                      )}
                      {badge !== null && isCollapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{badge}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Inline Add Form */}
              <AnimatePresence>
                {addingTo === group.label && !isCollapsed && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-1 mx-0.5 p-2.5 rounded-lg bg-secondary/40 border border-border/40 space-y-2">
                      <div className="flex gap-1.5">
                        <select value={newModEmoji} onChange={e => setNewModEmoji(e.target.value)}
                          className="w-8 h-8 rounded-md bg-secondary text-center text-sm appearance-none cursor-pointer outline-none border border-transparent focus:border-primary/30">
                          {emojiOptions.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <input value={newModName} onChange={e => setNewModName(e.target.value)} placeholder="Module name..." autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleAddModule(group.label); if (e.key === 'Escape') setAddingTo(null); }}
                          className="flex-1 px-2 py-1.5 rounded-md bg-secondary text-foreground text-xs outline-none border border-transparent focus:border-primary/30 placeholder:text-muted-foreground/40" />
                        <button onClick={() => handleAddModule(group.label)} disabled={!newModName.trim()}
                          className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30">
                          <Check size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Custom Modules */}
          {customModules.filter(m => m.visible).length > 0 && (
            <div>
              {!isCollapsed && (
                <div className="flex items-center justify-between px-2.5 mb-1">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/40 uppercase">CUSTOM</span>
                </div>
              )}
              <div className="space-y-0.5">
                {customModules.filter(m => m.visible).sort((a, b) => a.order - b.order).map(mod => (
                  <motion.button key={mod.id}
                    onClick={() => { setActiveSection(`custom-${mod.id}`); setSidebarOpen(false); }}
                    whileHover={{ x: isCollapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                      ${isCollapsed ? 'justify-center px-0' : ''}
                      ${activeSection === `custom-${mod.id}` ? 'bg-primary/8 text-primary' : 'text-muted-foreground hover:bg-secondary/60'}`}
                    title={isCollapsed ? mod.name : undefined}>
                    <span className="text-sm">{mod.icon}</span>
                    {!isCollapsed && <span className="flex-1 text-left">{mod.name}</span>}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Add custom module when none exist */}
          {customModules.filter(m => m.visible).length === 0 && !isCollapsed && (
            <div>
              {addingTo !== 'NEW_CUSTOM' ? (
                <motion.button onClick={() => setAddingTo('NEW_CUSTOM')}
                  whileHover={{ scale: 1.01 }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground/30 hover:text-primary hover:bg-secondary/40 transition-all border border-dashed border-border/30 hover:border-primary/20">
                  <Plus size={15} />
                  <span>Add Custom Module</span>
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/40 space-y-2">
                    <div className="flex gap-1.5">
                      <select value={newModEmoji} onChange={e => setNewModEmoji(e.target.value)}
                        className="w-8 h-8 rounded-md bg-secondary text-center text-sm appearance-none cursor-pointer outline-none">
                        {emojiOptions.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <input value={newModName} onChange={e => setNewModName(e.target.value)} placeholder="Module name..." autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleAddModule('NEW_CUSTOM'); if (e.key === 'Escape') setAddingTo(null); }}
                        className="flex-1 px-2 py-1.5 rounded-md bg-secondary text-foreground text-xs outline-none placeholder:text-muted-foreground/40" />
                      <button onClick={() => handleAddModule('NEW_CUSTOM')} disabled={!newModName.trim()}
                        className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30">
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom — Team selector + Theme */}
        <div className="border-t border-border/40 p-2.5 space-y-1">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-secondary/30">
              <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 shadow-sm">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{userName}</div>
                <div className="text-[10px] text-muted-foreground truncate">{userRole}</div>
              </div>
            </div>
          )}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all ${isCollapsed ? 'justify-center' : ''}`}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <motion.div
              animate={{ rotate: theme === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </motion.div>
            {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}
