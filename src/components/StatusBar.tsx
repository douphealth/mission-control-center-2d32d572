import { useState, useEffect } from 'react';
import { WifiOff, Database, Cloud, Check, Loader2, AlertCircle } from 'lucide-react';
import { isSupabaseConnected } from '@/lib/supabase';
import { onSaveStatus } from '@/stores/dataStore';

export default function StatusBar() {
  const [online, setOnline] = useState(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    return onSaveStatus((status) => {
      setSaveStatus(status);
      if (status === 'saved') {
        const t = setTimeout(() => setSaveStatus('idle'), 3000);
        return () => clearTimeout(t);
      }
    });
  }, []);

  const supabaseConnected = isSupabaseConnected();

  return (
    <footer className="sticky bottom-0 z-20 hidden lg:flex bg-card/80 backdrop-blur-xl border-t border-border/20 px-5 h-8 items-center justify-between text-[11px] text-muted-foreground/60">
      <div className="flex items-center gap-4">
        {online ? (
          <span className="flex items-center gap-1.5 text-success font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-destructive font-medium animate-pulse">
            <WifiOff size={11} /> Offline
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground/40">
          <Database size={10} /> IndexedDB
        </span>
        {supabaseConnected && (
          <span className="flex items-center gap-1 text-success/70">
            <Cloud size={10} /> Cloud
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 text-amber-500/70 animate-pulse">
            <Loader2 size={10} className="animate-spin" /> Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-success/70">
            <Check size={10} /> Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-destructive/70">
            <AlertCircle size={10} /> Sync error
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <kbd className="text-[10px] text-muted-foreground/30 bg-secondary/40 px-1.5 py-0.5 rounded font-mono border border-border/20">⌘K</kbd>
        <span className="font-medium text-muted-foreground/35">Mission Control v9.1</span>
      </div>
    </footer>
  );
}
