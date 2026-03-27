import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import StatusBar from '@/components/StatusBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboard } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';
import { motion, AnimatePresence } from 'framer-motion';
import React, { lazy, Suspense } from 'react';
import RouteErrorBoundary from '@/components/RouteErrorBoundary';

const DashboardHome = lazy(() => import('@/pages/DashboardHome'));
const TasksPage = lazy(() => import('@/pages/TasksPage'));
const WebsitesPage = lazy(() => import('@/pages/WebsitesPage'));
const GitHubPage = lazy(() => import('@/pages/GitHubPage'));
const BuildsPage = lazy(() => import('@/pages/BuildsPage'));
const LinksPage = lazy(() => import('@/pages/LinksPage'));
const NotesPage = lazy(() => import('@/pages/NotesPage'));
const FocusPage = lazy(() => import('@/pages/FocusPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const IdeasPage = lazy(() => import('@/pages/IdeasPage'));
const CredentialsPage = lazy(() => import('@/pages/CredentialsPage'));
const SEOPage = lazy(() => import('@/pages/SEOPage'));
const CloudflarePage = lazy(() => import('@/pages/CloudflarePage'));
const VercelPage = lazy(() => import('@/pages/VercelPage'));
const OpenClawPage = lazy(() => import('@/pages/OpenClawPage'));
const HabitsPage = lazy(() => import('@/pages/HabitsPage'));

const sectionMap: Record<string, React.LazyExoticComponent<any>> = {
  dashboard: DashboardHome,
  tasks: TasksPage,
  websites: WebsitesPage,
  github: GitHubPage,
  builds: BuildsPage,
  links: LinksPage,
  notes: NotesPage,
  focus: FocusPage,
  calendar: CalendarPage,
  projects: ProjectsPage,
  settings: SettingsPage,
  payments: PaymentsPage,
  ideas: IdeasPage,
  credentials: CredentialsPage,
  seo: SEOPage,
  cloudflare: CloudflarePage,
  vercel: VercelPage,
  openclaw: OpenClawPage,
  habits: HabitsPage,
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-2">
      <div className="h-8 bg-muted/50 rounded-xl w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/30 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-muted/30 rounded-2xl" />
        <div className="h-64 bg-muted/30 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { isLoading } = useDashboard();
  const { activeSection } = useNavigationStore();
  const isMobile = useIsMobile();
  const Section = sectionMap[activeSection] || DashboardHome;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-12 h-12 mx-auto rounded-xl gradient-primary flex items-center justify-center shadow-[var(--shadow-primary)]"
          >
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground"
          >
            Loading Mission Control...
          </motion.div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Hide sidebar on mobile — use bottom nav instead */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 overscroll-contain">
          <div className="max-w-[1600px] mx-auto p-3 sm:p-5 lg:p-8">
            <RouteErrorBoundary sectionName={activeSection} key={activeSection}>
              <Suspense fallback={<LoadingSkeleton />}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Section sectionId={activeSection} key={activeSection} {...({ sectionId: activeSection } as any)} />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </main>
        {!isMobile && <StatusBar />}
      </div>
      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
