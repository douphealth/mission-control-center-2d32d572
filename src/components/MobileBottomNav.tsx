import { useNavigationStore } from '@/stores/navigationStore';
import { useDashboard } from '@/contexts/DashboardContext';
import { Home, CheckSquare, FileText, Globe, Grip, DollarSign, Calendar, Timer, Lightbulb, KeyRound, Settings, Search, Flame } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';

const primaryTabs = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'websites', label: 'Sites', icon: Globe },
  { id: 'more', label: 'More', icon: Grip },
];

const moreItems = [
  { id: 'calendar', label: 'Calendar', icon: Calendar, emoji: '📅' },
  { id: 'habits', label: 'Habits', icon: Flame, emoji: '🔥' },
  { id: 'payments', label: 'Payments', icon: DollarSign, emoji: '💰' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, emoji: '💡' },
  { id: 'focus', label: 'Focus', icon: Timer, emoji: '⏱️' },
  { id: 'credentials', label: 'Vault', icon: KeyRound, emoji: '🔐' },
  { id: 'github', label: 'GitHub', icon: Search, emoji: '🐙' },
  { id: 'builds', label: 'Builds', icon: Search, emoji: '🛠️' },
  { id: 'links', label: 'Links', icon: Search, emoji: '🔗' },
  { id: 'projects', label: 'Kanban', icon: Search, emoji: '📋' },
  { id: 'seo', label: 'SEO', icon: Search, emoji: '🔍' },
  { id: 'settings', label: 'Settings', icon: Settings, emoji: '⚙️' },
];

export default function MobileBottomNav() {
  const { activeSection, setActiveSection } = useNavigationStore();
  const { tasks } = useDashboard();
  const [moreOpen, setMoreOpen] = useState(false);
  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 200], [1, 0]);

  const openTasks = tasks.filter(t => t.status !== 'done').length;

  const handleTab = (id: string) => {
    if (id === 'more') {
      setMoreOpen(!moreOpen);
    } else {
      setActiveSection(id);
      setMoreOpen(false);
    }
  };

  // Bottom sheet drag-to-dismiss
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.velocity.y > 300 || info.offset.y > 120) {
      setMoreOpen(false);
    }
  }, []);

  return (
    <>
      {/* Bottom sheet overlay & content */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
              style={{ y: dragY, opacity: sheetOpacity }}
              className="fixed bottom-[72px] left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-x border-border/50 shadow-[var(--shadow-xl)] lg:hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>

              {/* Grid of items */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-4 gap-1.5">
                  {moreItems.map(item => (
                    <motion.button
                      key={item.id}
                      onClick={() => handleTab(item.id)}
                      whileTap={{ scale: 0.92 }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all
                        ${activeSection === item.id
                          ? 'bg-primary/8 text-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary active:bg-secondary'}`}
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-[10px] font-semibold">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="bg-card/90 backdrop-blur-2xl border-t border-border/40 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-around h-16">
            {primaryTabs.map(tab => {
              const isActive = tab.id === 'more' ? moreOpen : activeSection === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  whileTap={{ scale: 0.9 }}
                  className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors
                    ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <div className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                    {tab.id === 'tasks' && openTasks > 0 && (
                      <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                        {openTasks > 9 ? '9+' : openTasks}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : ''}`}>{tab.label}</span>
                  {isActive && tab.id !== 'more' && (
                    <motion.div
                      layoutId="bottomTabIndicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
