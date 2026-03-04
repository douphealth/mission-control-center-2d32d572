import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Download, Upload, Trash2, AlertTriangle, Database, Palette,
  User, Shield, Info, Cloud, Copy, CheckCircle2, XCircle, RefreshCw,
  Loader2, Key, ExternalLink, ChevronRight, Terminal, ArrowUpDown, Sliders,
  Plug, ArrowDown, ArrowUp, Monitor
} from "lucide-react";
import {
  getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig,
  testSupabaseConnection, pushToSupabase, pullFromSupabase, fullSync,
  isSupabaseConnected, SUPABASE_SCHEMA_SQL, getLastSyncTime,
  type SyncPreview, getSyncPreview
} from "@/lib/supabase";
import { generateStrongKey, setEncryptionKey, hasCustomEncryptionKey } from "@/lib/encryption";

import { toast } from "sonner";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "supabase", label: "Supabase Sync", icon: Cloud },
  { id: "security", label: "Security", icon: Shield },
  { id: "data", label: "Data", icon: Database },
  { id: "about", label: "About", icon: Info },
];

const themes = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

export default function SettingsPage() {
  const { userName, userRole, theme, setTheme, toggleTheme, updateData, exportAllData, importAllData } = useDashboard();
  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState(userName);
  const [role, setRole] = useState(userRole);
  const [confirmDelete, setConfirmDelete] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  // Supabase state
  const [sbUrl, setSbUrl] = useState(getSupabaseConfig()?.url || "");
  const [sbKey, setSbKey] = useState(getSupabaseConfig()?.anonKey || "");
  const [sbConnected, setSbConnected] = useState(isSupabaseConnected());
  const [sbTesting, setSbTesting] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sbSyncing, setSbSyncing] = useState<null | 'push' | 'pull' | 'full'>(null);
  const [sbLastSync, setSbLastSync] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [syncConfirm, setSyncConfirm] = useState<null | 'push' | 'pull' | 'full'>(null);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Security state
  const [encKey, setEncKey] = useState("");
  const [showEncKey, setShowEncKey] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(hasCustomEncryptionKey());

  useEffect(() => {
    if (sbConnected) {
      getLastSyncTime().then(setSbLastSync);
    }
  }, [sbConnected]);

  useEffect(() => { setName(userName); }, [userName]);
  useEffect(() => { setRole(userRole); }, [userRole]);

  const saveName = () => updateData({ userName: name, userRole: role });

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mission-control-v8-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    toast.success("Backup downloaded");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await importAllData(ev.target?.result as string);
        toast.success("Data imported successfully");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast.error("Invalid file or import failed.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    if (confirmDelete !== "DELETE") return;
    localStorage.clear();
    const req = indexedDB.deleteDatabase("MissionControlDB");
    req.onsuccess = () => { window.location.reload(); };
    toast.success("All data cleared");
  };

  // Supabase handlers
  const handleTestConnection = async () => {
    if (!sbUrl || !sbKey) { toast.error("Enter URL and anon key first"); return; }
    setSbTesting(true);
    setSbTestResult(null);
    const result = await testSupabaseConnection(sbUrl, sbKey);
    setSbTestResult({ ok: result.ok, msg: result.ok ? "Connected successfully!" : result.error || "Connection failed" });
    setSbTesting(false);
  };

  const handleSaveSupabase = () => {
    if (!sbUrl || !sbKey) { toast.error("Both URL and anon key are required"); return; }
    setSupabaseConfig(sbUrl, sbKey);
    setSbConnected(true);
    toast.success("Supabase connected & saved");
  };

  const handleDisconnectSupabase = () => {
    clearSupabaseConfig();
    setSbConnected(false);
    setSbLastSync(null);
    setSbTestResult(null);
    toast.info("Supabase disconnected");
  };

  const handleSyncAction = async (action: 'push' | 'pull' | 'full') => {
    // Load preview first for confirmation
    setLoadingPreview(true);
    setSyncConfirm(action);
    const preview = await getSyncPreview();
    setSyncPreview(preview);
    setLoadingPreview(false);
  };

  const executeSyncAction = async (action: 'push' | 'pull' | 'full') => {
    setSyncConfirm(null);
    setSbSyncing(action);
    
    if (action === 'push') {
      const result = await pushToSupabase();
      setSbSyncing(null);
      if (result.success) {
        toast.success(`✅ Pushed ${result.synced} items to cloud`);
        setSbLastSync(new Date().toISOString());
      } else {
        toast.error(`Push failed: ${result.error}`);
      }
    } else if (action === 'pull') {
      const result = await pullFromSupabase();
      setSbSyncing(null);
      if (result.success) {
        toast.success(`✅ Merged ${result.added} new + ${result.updated} updated items from cloud`);
        setSbLastSync(new Date().toISOString());
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error(`Pull failed: ${result.error}`);
      }
    } else {
      const result = await fullSync();
      setSbSyncing(null);
      if (result.success) {
        toast.success(`✅ Full sync complete — pushed ${result.pushed}, pulled ${result.pulled} items`);
        setSbLastSync(new Date().toISOString());
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    }
  };

  const handleGenerateEncKey = () => {
    const key = generateStrongKey();
    setEncKey(key);
  };

  const handleSaveEncKey = () => {
    if (!encKey.trim()) { toast.error("Enter an encryption key"); return; }
    setEncryptionKey(encKey.trim());
    setHasCustomKey(true);
    toast.success("Encryption key saved");
  };

  const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your Mission Control preferences, sync, and security</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar nav */}
        <div className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap w-full text-left
                ${activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <tab.icon size={15} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={13} className="ml-auto opacity-60" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          <AnimatePresence mode="wait">
            {/* ─── Profile ─── */}
            {activeTab === "profile" && (
              <motion.div key="profile" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-5">
                  <h2 className="font-semibold text-lg">Profile</h2>
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Display Name</label>
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          onBlur={saveName}
                          className="input-base"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Role / Title</label>
                        <input
                          value={role}
                          onChange={e => setRole(e.target.value)}
                          onBlur={saveName}
                          className="input-base"
                          placeholder="Digital Creator & Developer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Appearance ─── */}
            {activeTab === "appearance" && (
              <motion.div key="appearance" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-5">
                  <h2 className="font-semibold text-lg">Appearance</h2>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-3 block">Theme</label>
                    <div className="flex gap-2">
                      {themes.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${theme === t.id
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                        >
                          <t.icon size={17} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Supabase Sync ─── */}
            {activeTab === "supabase" && (
              <motion.div key="supabase" {...fadeIn} className="space-y-4">
                {/* Status Banner */}
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${sbConnected ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
                  }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sbConnected ? "bg-emerald-500/15" : "bg-amber-500/15"
                    }`}>
                    <Cloud size={17} className={sbConnected ? "text-emerald-500" : "text-amber-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${sbConnected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {sbConnected ? "🟢 Supabase Connected" : "⚡ Supabase Not Connected"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {sbConnected
                        ? sbLastSync
                          ? `Last sync: ${new Date(sbLastSync).toLocaleString()}`
                          : "Ready to sync — no pushes yet"
                        : "Connect your Supabase project for multi-device sync & backup"
                      }
                    </div>
                  </div>
                  {sbConnected && (
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0">
                      Dashboard <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Config */}
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Connection Settings</h2>
                    {sbConnected && (
                      <button onClick={handleDisconnectSupabase} className="text-xs text-destructive hover:underline font-medium">
                        Disconnect
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Project URL</label>
                      <input
                        value={sbUrl}
                        onChange={e => setSbUrl(e.target.value)}
                        className="input-base font-mono text-xs"
                        placeholder="https://your-project.supabase.co"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Anon Key</label>
                      <input
                        value={sbKey}
                        onChange={e => setSbKey(e.target.value)}
                        type="password"
                        className="input-base font-mono text-xs"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      />
                    </div>
                  </div>

                  {sbTestResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${sbTestResult.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                      }`}>
                      {sbTestResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      {sbTestResult.msg}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={handleTestConnection} disabled={sbTesting} className="btn-secondary text-sm gap-2.5">
                      {sbTesting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                      Test Connection
                    </button>
                    <button onClick={handleSaveSupabase} className="btn-primary text-sm">
                      Save & Connect
                    </button>
                  </div>
                </div>

                {/* Sync actions */}
                {sbConnected && (
                  <div className="card-elevated p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">Sync Actions</h2>
                      <span className="text-[10px] font-medium text-muted-foreground/50 bg-secondary px-2 py-1 rounded-lg">Smart Merge — never loses data</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {/* Full Sync — recommended */}
                      <button onClick={() => handleSyncAction('full')} disabled={!!sbSyncing}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all text-left group">
                        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                          {sbSyncing === 'full' ? <Loader2 size={18} className="text-primary animate-spin" /> : <RefreshCw size={18} className="text-primary" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-foreground flex items-center gap-2">
                            Full Sync (Recommended)
                            <span className="text-[9px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">SAFE</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">Push local → cloud, then merge cloud → local. Both sides get all data.</div>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Push */}
                        <button onClick={() => handleSyncAction('push')} disabled={!!sbSyncing}
                          className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border/30 hover:border-primary/30 hover:bg-secondary/80 transition-all text-left group">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            {sbSyncing === 'push' ? <Loader2 size={16} className="text-primary animate-spin" /> : <ArrowUp size={16} className="text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground">Push to Cloud</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">Upload local data to Supabase (upsert, no cloud data deleted)</div>
                          </div>
                        </button>

                        {/* Pull */}
                        <button onClick={() => handleSyncAction('pull')} disabled={!!sbSyncing}
                          className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border/30 hover:border-primary/30 hover:bg-secondary/80 transition-all text-left group">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            {sbSyncing === 'pull' ? <Loader2 size={16} className="text-primary animate-spin" /> : <ArrowDown size={16} className="text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground">Pull from Cloud</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">Merge cloud data into local — adds new items, updates existing</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 border border-border/20">
                      <Shield size={14} className="text-primary shrink-0 mt-0.5" />
                      <div className="text-[11px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Zero data loss guarantee:</strong> All sync operations use smart merge (upsert). Your local data is never deleted — cloud items are added or updated alongside your existing records.
                      </div>
                    </div>
                  </div>
                )}

                {/* Sync Confirmation Dialog */}
                <AnimatePresence>
                  {syncConfirm && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm p-0 sm:p-4"
                      onClick={() => setSyncConfirm(null)}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border/40 shadow-2xl overflow-hidden"
                      >
                        <div className="p-5 sm:p-6 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                              {syncConfirm === 'full' ? <RefreshCw size={18} className="text-primary" /> :
                               syncConfirm === 'push' ? <ArrowUp size={18} className="text-primary" /> :
                               <ArrowDown size={18} className="text-primary" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground">
                                {syncConfirm === 'full' ? 'Full Sync' : syncConfirm === 'push' ? 'Push to Cloud' : 'Pull from Cloud'}
                              </h3>
                              <p className="text-xs text-muted-foreground">Review what will happen before proceeding</p>
                            </div>
                          </div>

                          {loadingPreview ? (
                            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                              <Loader2 size={16} className="animate-spin" /> Analyzing data...
                            </div>
                          ) : syncPreview && (
                            <div className="space-y-3">
                              {(syncConfirm === 'push' || syncConfirm === 'full') && (
                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                                  <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                    <ArrowUp size={12} /> Push: {syncPreview.totalPush} items → cloud
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {syncPreview.push.filter(p => p.count > 0).map(p => 
                                      `${p.table.replace('mc_', '')}: ${p.count}`
                                    ).join(' · ') || 'No local data to push'}
                                  </div>
                                </div>
                              )}
                              {(syncConfirm === 'pull' || syncConfirm === 'full') && (
                                <div className="p-3 rounded-xl bg-secondary/60 border border-border/20 space-y-1">
                                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <ArrowDown size={12} /> Pull: {syncPreview.totalPullNew} new + {syncPreview.totalPullUpdate} updates
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {syncPreview.pull.filter(p => p.newCount > 0 || p.updateCount > 0).map(p => 
                                      `${p.table.replace('mc_', '')}: +${p.newCount} new, ${p.updateCount} upd`
                                    ).join(' · ') || 'No cloud data to pull'}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <CheckCircle2 size={12} className="text-primary" />
                                No data will be deleted from either side
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 px-5 sm:px-6 py-4 border-t border-border/20 bg-secondary/20 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
                          <button onClick={() => setSyncConfirm(null)} className="btn-secondary text-sm flex-1">
                            Cancel
                          </button>
                          <button
                            onClick={() => executeSyncAction(syncConfirm)}
                            disabled={loadingPreview}
                            className="btn-primary text-sm flex-1 gap-2"
                          >
                            {syncConfirm === 'full' ? <RefreshCw size={14} /> : syncConfirm === 'push' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {syncConfirm === 'full' ? 'Sync Now' : syncConfirm === 'push' ? 'Push Now' : 'Pull Now'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Schema */}
                <div className="card-elevated p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Terminal size={16} className="text-muted-foreground" /> Database Schema
                    </h2>
                    <button onClick={() => setShowSchema(!showSchema)} className="text-xs font-medium text-primary hover:underline">
                      {showSchema ? "Hide" : "Show SQL"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    First time setup: Run this SQL in your Supabase SQL Editor to create all required tables.
                  </p>
                  {showSchema && (
                    <div className="relative">
                      <pre className="bg-secondary/50 rounded-xl p-4 text-[10px] font-mono text-muted-foreground overflow-auto max-h-60 leading-relaxed">
                        {SUPABASE_SCHEMA_SQL.trim()}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <CopyButton text={SUPABASE_SCHEMA_SQL.trim()} />
                      </div>
                    </div>
                  )}
                  <a
                    href="https://supabase.com/dashboard/project/_/editor"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Open SQL Editor <ExternalLink size={10} />
                  </a>
                </div>
              </motion.div>
            )}

            {/* ─── Security ─── */}
            {activeTab === "security" && (
              <motion.div key="security" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Key size={18} className="text-primary" />
                    <h2 className="font-semibold text-lg">Encryption Key</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your credential vault passwords and API keys are encrypted using AES-256.
                    Set a custom master key below for enhanced security. Keep it safe — you'll need it to decrypt your data.
                  </p>
                  <div className={`rounded-xl p-3 ${hasCustomKey ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"} text-sm font-medium flex items-center gap-2`}>
                    {hasCustomKey ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    {hasCustomKey ? "Custom encryption key is set" : "Using default key — set a custom key for better security"}
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground block">Encryption Key</label>
                    <div className="flex gap-2">
                      <input
                        value={encKey}
                        onChange={e => setEncKey(e.target.value)}
                        type={showEncKey ? "text" : "password"}
                        className="input-base font-mono text-xs flex-1"
                        placeholder="Enter or generate a strong key..."
                      />
                      <button
                        onClick={() => setShowEncKey(!showEncKey)}
                        className="btn-secondary px-3 text-xs shrink-0"
                      >
                        {showEncKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleGenerateEncKey} className="btn-secondary text-sm gap-2">
                        <RefreshCw size={13} /> Generate Key
                      </button>
                      <button onClick={handleSaveEncKey} disabled={!encKey} className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        Save Key
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Data ─── */}
            {activeTab === "data" && (
              <motion.div key="data" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-4">
                  <h2 className="font-semibold text-lg">Backup & Restore</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={handleExport} className="flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left">
                      <Download size={19} className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Export All Data</div>
                        <div className="text-xs text-muted-foreground">Download full JSON backup</div>
                      </div>
                    </button>
                    <button onClick={() => importRef.current?.click()} className="flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left">
                      <Upload size={19} className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Import Data</div>
                        <div className="text-xs text-muted-foreground">Restore from JSON backup</div>
                      </div>
                    </button>
                    <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </div>
                </div>

                <div className="card-elevated p-6 space-y-4 border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={17} className="text-destructive" />
                    <h2 className="font-semibold text-destructive">Danger Zone</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently deletes ALL data — websites, tasks, notes, credentials, settings. This cannot be undone.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">Type "DELETE" to confirm:</label>
                    <input
                      value={confirmDelete}
                      onChange={e => setConfirmDelete(e.target.value)}
                      placeholder='DELETE'
                      className="input-base max-w-xs"
                    />
                    <button
                      onClick={handleClearAll}
                      disabled={confirmDelete !== "DELETE"}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      <Trash2 size={14} /> Delete All Data
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── About ─── */}
            {activeTab === "about" && (
              <motion.div key="about" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">M</div>
                    <div>
                      <h2 className="font-bold text-xl">Mission Control</h2>
                      <div className="badge-primary mt-1">v8.0 Enterprise</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Framework", value: "React 18 + TypeScript + Vite" },
                      { label: "Styling", value: "Tailwind CSS + Framer Motion" },
                      { label: "Storage", value: "IndexedDB (Dexie.js) — Offline-first" },
                      { label: "Cloud Sync", value: "Supabase (optional)" },
                      { label: "Encryption", value: "AES-256 via crypto-js" },
                      { label: "Layout", value: "react-grid-layout — Drag & Drop" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className="text-foreground font-semibold text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Built with ❤️ for infinite flexibility</span>
                    <span className="badge-muted">Open Source</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
