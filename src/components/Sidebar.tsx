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
  ChevronLeft, ChevronRight, Plus, Check, Download
} from 'lucide-react';
import { toast } from 'sonner';

const navGroups = [
  {
    label: 'MENU',
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
    label: 'GENERAL',
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
    const newId = await addItem('customModules', {
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
    if (newId) toast.success(`"${newModName}" added!`);
    else toast.error(`"${newModName}" already exists`);
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
        className={`fixed top-0 left-0 z-50 h-full flex flex-col bg-card border-r border-border/30
          lg:relative lg:translate-x-0 transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: isCollapsed ? 72 : 260 }}
      >
        {/* Close (mobile) */}
        <button onClick={() => setSidebarOpen(false)} className="absolute top-5 right-5 lg:hidden text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>

        {/* Logo / Brand */}
        <div className={`h-[72px] flex items-center border-b border-border/20 ${isCollapsed ? 'justify-center px-3' : 'px-5 gap-3'}`}>
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.5 }}
            className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-extrabold text-base flex-shrink-0"
            style={{ boxShadow: 'var(--shadow-primary)' }}
          >
            N
          </motion.div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-bold text-[15px] text-foreground tracking-tight">Nexus</div>
              <div className="text-[10px] text-muted-foreground/60 font-medium">Mission Control</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 w-7 h-7 items-center justify-center rounded-full bg-card border border-border/50 shadow-sm hover:bg-secondary hover:scale-110 transition-all"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navGroups.map(group => (
            <div key={group.label}>
              {!isCollapsed && (
                <div className="flex items-center justify-between px-3 mb-2">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/35 uppercase">
                    {group.label}
                  </span>
                  {group.label !== 'GENERAL' && group.label !== 'SYSTEM' && (
                    <button
                      onClick={() => setAddingTo(addingTo === group.label ? null : group.label)}
                      className="p-0.5 rounded text-muted-foreground/20 hover:text-primary transition-all hover:scale-110"
                      title={`Add to ${group.label}`}
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map(item => {
                  const active = activeSection === item.id;
                  const badge = getBadge(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-200 group relative
                        ${isCollapsed ? 'justify-center px-0 rounded-xl' : 'rounded-[14px]'}
                        ${active
                          ? 'bg-primary text-primary-foreground shadow-[var(--shadow-primary)]'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon size={17} strokeWidth={active ? 2.2 : 1.6} className="flex-shrink-0" />
                      {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {badge !== null && !isCollapsed && (
                        <span className={`text-[10px] font-bold min-w-[22px] text-center px-1.5 py-0.5 rounded-full ${active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                          {badge}
                        </span>
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
                    <div className="mt-2 mx-1 p-3 rounded-2xl bg-secondary/30 border border-border/30 space-y-2">
                      <div className="flex gap-1.5">
                        <select value={newModEmoji} onChange={e => setNewModEmoji(e.target.value)}
                          className="w-9 h-9 rounded-xl bg-secondary text-center text-sm appearance-none cursor-pointer outline-none border border-transparent focus:border-primary/30">
                          {emojiOptions.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <input value={newModName} onChange={e => setNewModName(e.target.value)} placeholder="Module name..." autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleAddModule(group.label); if (e.key === 'Escape') setAddingTo(null); }}
                          className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-xs outline-none border border-transparent focus:border-primary/30 placeholder:text-muted-foreground/40" />
                        <button onClick={() => handleAddModule(group.label)} disabled={!newModName.trim()}
                          className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30">
                          <Check size={13} />
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
                <div className="flex items-center justify-between px-3 mb-2">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/35 uppercase">CUSTOM</span>
                </div>
              )}
              <div className="space-y-1">
                {customModules.filter(m => m.visible).sort((a, b) => a.order - b.order).map(mod => (
                  <motion.button key={mod.id}
                    onClick={() => { setActiveSection(`custom-${mod.id}`); setSidebarOpen(false); }}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-200
                      ${isCollapsed ? 'justify-center px-0 rounded-xl' : 'rounded-[14px]'}
                      ${activeSection === `custom-${mod.id}` ? 'bg-primary text-primary-foreground shadow-[var(--shadow-primary)]' : 'text-muted-foreground hover:bg-secondary/60'}`}
                    title={isCollapsed ? mod.name : undefined}>
                    <span className="text-sm">{mod.icon}</span>
                    {!isCollapsed && <span className="flex-1 text-left">{mod.name}</span>}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Add custom module */}
          {customModules.filter(m => m.visible).length === 0 && !isCollapsed && (
            <div>
              {addingTo !== 'NEW_CUSTOM' ? (
                <motion.button onClick={() => setAddingTo('NEW_CUSTOM')}
                  whileHover={{ scale: 1.01 }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[13px] font-medium text-muted-foreground/30 hover:text-primary hover:bg-secondary/40 transition-all border border-dashed border-border/30 hover:border-primary/20">
                  <Plus size={15} />
                  <span>Add Custom Module</span>
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="p-3 rounded-2xl bg-secondary/30 border border-border/30 space-y-2">
                    <div className="flex gap-1.5">
                      <select value={newModEmoji} onChange={e => setNewModEmoji(e.target.value)}
                        className="w-9 h-9 rounded-xl bg-secondary text-center text-sm appearance-none cursor-pointer outline-none">
                        {emojiOptions.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <input value={newModName} onChange={e => setNewModName(e.target.value)} placeholder="Module name..." autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleAddModule('NEW_CUSTOM'); if (e.key === 'Escape') setAddingTo(null); }}
                        className="flex-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-xs outline-none placeholder:text-muted-foreground/40" />
                      <button onClick={() => handleAddModule('NEW_CUSTOM')} disabled={!newModName.trim()}
                        className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30">
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom — promo/user */}
        <div className="border-t border-border/20 p-3 space-y-2">
          {/* Promo card — like Dribbble's "Get App" card */}
          {!isCollapsed && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Download size={14} className="text-primary" />
                <span className="text-[11px] font-semibold text-foreground">Get the Mobile App</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed mb-3">Access your dashboard on the go. Available for iOS & Android.</p>
              <button className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-all shadow-[var(--shadow-primary)]">
                Download
              </button>
            </div>
          )}

          {/* User + Theme */}
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-secondary/30">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 shadow-sm">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{userName}</div>
                <div className="text-[10px] text-muted-foreground/50 truncate">{userRole}</div>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          )}
          {isCollapsed && (
            <motion.button
              onClick={toggleTheme}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center py-2.5 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </motion.button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
