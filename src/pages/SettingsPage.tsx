import { useDashboard } from "@/contexts/DashboardContext";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Download, Upload, Trash2, AlertTriangle, Database, Palette,
  User, Shield, Info, Cloud, Copy, CheckCircle2, XCircle, RefreshCw,
  Loader2, Key, ExternalLink, ChevronRight, Terminal, ArrowUpDown, Sliders,
  Plug, ArrowDown, ArrowUp, Monitor, Calendar, CloudOff, Check, X
} from "lucide-react";
import {
  getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig,
  testSupabaseConnection, pullFromSupabase, fullSync,
  isSupabaseConnected, SUPABASE_SCHEMA_SQL, getLastSyncTime
} from "@/lib/supabase";
import { generateStrongKey, setEncryptionKey, hasCustomEncryptionKey } from "@/lib/encryption";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

import { toast } from "sonner";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "google-calendar", label: "Google Calendar", icon: Calendar },
  { id: "supabase", label: "Cloud Backup", icon: Cloud },
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

  // Google Calendar
  const gcal = useGoogleCalendar({ autoFetch: false });
  const [gcalClientIdInput, setGcalClientIdInput] = useState(gcal.clientId);
  const [gcalRedirectOverride, setGcalRedirectOverride] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mc_gcal_config') || '{}').redirectUri || ''; } catch { return ''; }
  });
  const isInIframe = window.self !== window.top;
  const computedRedirectUri = gcalRedirectOverride || (window.location.origin + '/oauth-callback.html');
  const computedOrigin = gcalRedirectOverride ? new URL(gcalRedirectOverride).origin : window.location.origin;

  // Supabase state
  const [sbUrl, setSbUrl] = useState(getSupabaseConfig()?.url || "");
  const [sbKey, setSbKey] = useState(getSupabaseConfig()?.anonKey || "");
  const [sbConnected, setSbConnected] = useState(isSupabaseConnected());
  const [sbTesting, setSbTesting] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sbSyncing, setSbSyncing] = useState<null | 'sync' | 'refresh'>(null);
  const [sbLastSync, setSbLastSync] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);

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
    a.download = `mission-control-backup-${new Date().toISOString().split("T")[0]}.json`;
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
        if (isSupabaseConnected()) {
          await fullSync();
        }
        toast.success("Backup imported and synced");
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

  const handleSyncNow = async () => {
    setSbSyncing('sync');
    const result = await fullSync();
    setSbSyncing(null);

    if (result.success) {
      toast.success(`✅ Synced ${result.pushed} pushed + ${result.pulled} pulled`);
      setSbLastSync(new Date().toISOString());
      return;
    }

    toast.error(`Sync failed: ${result.error}`);
  };

  const handleRefreshFromCloud = async () => {
    setSbSyncing('refresh');
    const result = await pullFromSupabase();
    setSbSyncing(null);

    if (result.success) {
      toast.success(`✅ Refreshed ${result.added} new + ${result.updated} updated items from cloud`);
      setSbLastSync(new Date().toISOString());
      return;
    }

    toast.error(`Refresh failed: ${result.error}`);
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

            {/* ─── Google Calendar ─── */}
            {activeTab === "google-calendar" && (
              <motion.div key="google-calendar" {...fadeIn} className="space-y-4">
                {/* Status Banner */}
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${gcal.connected
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-blue-500/5 border-blue-500/20"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${gcal.connected ? "bg-emerald-500/15" : "bg-blue-500/15"
                    }`}>
                    <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" alt="" className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${gcal.connected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-blue-600 dark:text-blue-400"
                      }`}>
                      {gcal.connected ? "🟢 Google Calendar Connected" : "⚡ Google Calendar Not Connected"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {gcal.connected
                        ? gcal.email
                          ? `Signed in as ${gcal.email}`
                          : "Connected — events are syncing"
                        : "Connect your Google Calendar to see all your events in Mission Control"
                      }
                    </div>
                    {gcal.lastSync && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Last sync: {new Date(gcal.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {gcal.connected && (
                    <button onClick={() => gcal.syncEvents(true)} disabled={gcal.syncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors shrink-0">
                      {gcal.syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Sync Now
                    </button>
                  )}
                </div>

                {/* Connection Settings */}
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Connection Settings</h2>
                    {gcal.connected && (
                      <button onClick={() => {
                        gcal.disconnect();
                        toast.info("Google Calendar disconnected");
                      }} className="text-xs text-destructive hover:underline font-medium">
                        Disconnect
                      </button>
                    )}
                  </div>

                  {isInIframe && !gcalRedirectOverride && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20">
                      <AlertTriangle size={15} />
                      <span>⚠️ Set your <strong>Published URL Override</strong> below before connecting — Google OAuth cannot work from the Lovable preview origin.</span>
                    </div>
                  )}
                  {isInIframe && gcalRedirectOverride && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Info size={15} />
                      <span>Override set — the OAuth popup will open on <strong>{new URL(gcalRedirectOverride).origin}</strong>. Make sure this domain is whitelisted in Google Cloud Console.</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">OAuth Client ID</label>
                      <input
                        value={gcalClientIdInput}
                        onChange={e => setGcalClientIdInput(e.target.value)}
                        className="input-base font-mono text-xs"
                        placeholder="123456789-xxxxx.apps.googleusercontent.com"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        Published URL Override <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <input
                        value={gcalRedirectOverride}
                        onChange={e => {
                          setGcalRedirectOverride(e.target.value);
                          // Save to config
                          const uri = e.target.value.trim();
                          const raw = JSON.parse(localStorage.getItem('mc_gcal_config') || '{}');
                          raw.redirectUri = uri || undefined;
                          localStorage.setItem('mc_gcal_config', JSON.stringify(raw));
                        }}
                        className="input-base font-mono text-xs"
                        placeholder="https://your-app.pages.dev/oauth-callback.html"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Set this to your deployed URL's callback if testing from Lovable preview
                      </p>
                    </div>

                    {/* Required Google Cloud Console URLs */}
                    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Add these to your Google Cloud Console:</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-muted-foreground w-32 shrink-0">Authorized JS Origin</span>
                          <code className="text-[11px] font-mono bg-background px-2 py-1 rounded-lg border border-border flex-1 truncate">{computedOrigin}</code>
                          <CopyButton text={computedOrigin} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-muted-foreground w-32 shrink-0">Redirect URI</span>
                          <code className="text-[11px] font-mono bg-background px-2 py-1 rounded-lg border border-border flex-1 truncate">{computedRedirectUri}</code>
                          <CopyButton text={computedRedirectUri} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {gcal.error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-destructive/10 text-destructive">
                      <XCircle size={15} />
                      {gcal.error}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {!gcal.connected ? (
                      <button
                        onClick={async () => {
                          if (!gcalClientIdInput.trim()) { toast.error("Enter Client ID first"); return; }
                          const result = await gcal.connect(gcalClientIdInput.trim());
                          if (result.success) {
                            toast.success(`✅ Connected as ${result.email}`);
                          } else {
                            toast.error(result.error || "Connection failed");
                          }
                        }}
                        disabled={gcal.connecting || !gcalClientIdInput.trim() || (isInIframe && !gcalRedirectOverride)}
                        className="btn-primary text-sm gap-2"
                      >
                        {gcal.connecting ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                        Connect with Google
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                        <CheckCircle2 size={15} />
                        Connected{gcal.email ? ` as ${gcal.email}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Calendar Picker */}
                {gcal.connected && gcal.calendars.length > 0 && (
                  <div className="card-elevated p-6 space-y-4">
                    <h2 className="font-semibold text-lg">Calendars</h2>
                    <p className="text-xs text-muted-foreground">Choose which calendars to show in Mission Control</p>
                    <div className="space-y-2">
                      {gcal.calendars.map(cal => {
                        const enabled = gcal.enabledCalendarIds.includes(cal.id);
                        return (
                          <button
                            key={cal.id}
                            onClick={() => gcal.toggleCalendar(cal.id)}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${enabled
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/30 hover:border-border/60 hover:bg-secondary/30"
                              }`}
                          >
                            <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: enabled ? (cal.backgroundColor || '#039BE5') : 'transparent', border: `2px solid ${cal.backgroundColor || '#039BE5'}` }}
                            >
                              {enabled && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">{cal.summary}</div>
                              {cal.primary && <span className="text-[10px] text-primary font-medium">Primary</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Auto-sync */}
                {gcal.connected && (
                  <div className="card-elevated p-6 space-y-4">
                    <h2 className="font-semibold text-lg">Sync Settings</h2>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">Auto-sync</div>
                        <div className="text-xs text-muted-foreground">Automatically refresh events every 5 minutes</div>
                      </div>
                      <button
                        onClick={() => {
                          gcal.setAutoSync(!gcal.autoSync);
                          toast.success(gcal.autoSync ? "Auto-sync disabled" : "Auto-sync enabled");
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${gcal.autoSync ? "bg-primary" : "bg-secondary"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${gcal.autoSync ? "translate-x-6" : ""}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Setup Guide */}
                <div className="card-elevated p-6 space-y-3">
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Info size={16} className="text-muted-foreground" /> Setup Guide
                  </h2>
                  <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                    <p><strong className="text-foreground">1.</strong> Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></p>
                    <p><strong className="text-foreground">2.</strong> Create a new OAuth 2.0 Client ID (Web application type)</p>
                    <p><strong className="text-foreground">3.</strong> Add <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground">{window.location.origin}</code> as an Authorized JavaScript Origin</p>
                    <p><strong className="text-foreground">4.</strong> Copy the Client ID and paste it above</p>
                    <p><strong className="text-foreground">5.</strong> Enable the <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Calendar API</a> in your project</p>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                      Google Cloud Console <ExternalLink size={10} />
                    </a>
                    <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                      Enable Calendar API <ExternalLink size={10} />
                    </a>
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

                {/* Cloud Backup Actions */}
                {sbConnected && (
                  <div className="card-elevated p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">Cloud Backup</h2>
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={10} /> Auto-Save Active
                      </span>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Auto-save is always on.</strong> Every change you make is automatically backed up to the cloud within seconds. No manual action needed.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Save to Cloud — push only */}
                      <button onClick={() => handleSyncAction('push')} disabled={!!sbSyncing}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all text-left group">
                        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 transition-transform group-hover:scale-105">
                          {sbSyncing === 'push' ? <Loader2 size={18} className="text-primary-foreground animate-spin" /> : <ArrowUp size={18} className="text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-foreground">Save to Cloud</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">Push all local data to the cloud now</div>
                        </div>
                      </button>

                      {/* Restore from Cloud — pull only, with warning */}
                      <button onClick={() => handleSyncAction('pull')} disabled={!!sbSyncing}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/30 border-2 border-border/30 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left group">
                        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                          {sbSyncing === 'pull' ? <Loader2 size={18} className="text-foreground animate-spin" /> : <ArrowDown size={18} className="text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-foreground">Restore from Cloud</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">Overwrites local data with cloud backup</div>
                        </div>
                      </button>
                    </div>

                    {sbLastSync && (
                      <div className="text-[11px] text-muted-foreground text-center">
                        Last manual save: {new Date(sbLastSync).toLocaleString()}
                      </div>
                    )}
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
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${syncConfirm === 'pull' ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                              {syncConfirm === 'push' ? <ArrowUp size={18} className="text-primary" /> : <ArrowDown size={18} className="text-amber-500" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground">
                                {syncConfirm === 'push' ? 'Save to Cloud' : 'Restore from Cloud'}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {syncConfirm === 'push' ? 'Back up your local data to the cloud' : 'Download cloud data to this device'}
                              </p>
                            </div>
                          </div>

                          {loadingPreview ? (
                            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                              <Loader2 size={16} className="animate-spin" /> Analyzing data...
                            </div>
                          ) : syncPreview && (
                            <div className="space-y-3">
                              {syncConfirm === 'push' ? (
                                <>
                                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                                    <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                      <ArrowUp size={12} /> {syncPreview.totalPush} items will be saved
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      Your current local data will be safely backed up to the cloud.
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-lg">
                                    <CheckCircle2 size={12} className="shrink-0" />
                                    Safe operation — cloud data is overwritten with your latest local data.
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                      <AlertTriangle size={12} /> Warning: This will overwrite your local data
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      All your current local edits will be replaced with the cloud backup. Use this only if you want to restore a previous version.
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-secondary/60 border border-border/20 space-y-1">
                                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                      <ArrowDown size={12} /> {syncPreview.totalPullNew} new + {syncPreview.totalPullUpdate} existing items from cloud
                                    </div>
                                  </div>
                                </>
                              )}
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
                            className={`text-sm flex-1 gap-2 ${syncConfirm === 'pull' ? 'btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500' : 'btn-primary'}`}
                          >
                            {syncConfirm === 'push' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {syncConfirm === 'push' ? 'Save Now' : 'Restore Now'}
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
