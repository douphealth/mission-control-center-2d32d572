import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, Cloud } from 'lucide-react';
import { isSupabaseConnected } from '@/lib/supabase';

export default function StatusBar() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const supabaseConnected = isSupabaseConnected();

  return (
    <footer className="sticky bottom-0 z-20 bg-card/60 backdrop-blur-xl border-t border-border/30 px-4 lg:px-6 h-8 flex items-center justify-between text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        {online ? (
          <span className="flex items-center gap-1.5 text-emerald-500">
            <Wifi size={11} /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-500 animate-pulse">
            <WifiOff size={11} /> Offline
          </span>
        )}
        <span className="hidden sm:inline text-muted-foreground/30">·</span>
        <span className="hidden sm:inline flex items-center gap-1">
          <Database size={10} /> IndexedDB
        </span>
        {supabaseConnected && (
          <>
            <span className="hidden sm:inline text-muted-foreground/30">·</span>
            <span className="hidden sm:inline flex items-center gap-1 text-emerald-500">
              <Cloud size={10} /> Supabase Synced
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline">⌘K Search</span>
        <span className="hidden sm:inline text-muted-foreground/30">·</span>
        <span className="font-medium">Mission Control v7.0</span>
      </div>
    </footer>
  );
}
