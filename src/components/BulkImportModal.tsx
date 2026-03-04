import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, X, CheckCircle2, Sparkles, Wand2, Globe, Link2, Key, CreditCard,
  FileCode, ExternalLink, Clipboard, RotateCcw, ChevronDown, ChevronRight, AlertTriangle,
  Shield, Lightbulb, Zap, ArrowRight, Download, RefreshCw, Edit3, Check, Layers,
  Brain, Target, TrendingUp, Hash, Clock
} from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { toast } from 'sonner';
import {
  autonomousImport,
  autoMapFields,
  normalizeItems,
  TARGET_META,
  type ImportTarget,
  type AutonomousImportResult,
  type TargetMeta,
  generateTemplate,
} from '@/lib/importEngine';
import { deduplicateItems } from '@/lib/dedup';

// ─── Icon registry ──────────────────────────────────────────────────────────────

const TARGET_ICONS: Record<ImportTarget, any> = {
  websites: Globe,
  links: Link2,
  tasks: FileText,
  repos: FileCode,
  buildProjects: FileCode,
  credentials: Key,
  payments: CreditCard,
  notes: FileText,
  ideas: Lightbulb,
  habits: RefreshCw,
};

const TARGET_GRADIENTS: Record<ImportTarget, string> = {
  websites: 'from-blue-500 to-cyan-500',
  links: 'from-purple-500 to-pink-500',
  tasks: 'from-amber-500 to-orange-500',
  repos: 'from-green-500 to-emerald-500',
  buildProjects: 'from-orange-500 to-red-500',
  credentials: 'from-red-500 to-rose-500',
  payments: 'from-emerald-500 to-teal-500',
  notes: 'from-indigo-500 to-violet-500',
  ideas: 'from-yellow-500 to-amber-500',
  habits: 'from-cyan-500 to-blue-500',
};

const CONFIDENCE_STYLES = {
  high: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', label: 'High Confidence', icon: Shield },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', label: 'Medium Confidence', icon: AlertTriangle },
  low: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'Low Confidence', icon: AlertTriangle },
};

function normalizeUrl(url: string): string {
  let u = url.trim().replace(/[,;|'"<>)}\]]+$/, '');
  if (u && !u.match(/^https?:\/\//i)) u = 'https://' + u;
  return u;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(normalizeUrl(url));
    return u.hostname.replace(/^www\./, '');
  } catch { return url; }
}

// ─── Component ──────────────────────────────────────────────────────────────────

type Phase = 'input' | 'analyzing' | 'review' | 'importing' | 'done';

export default function BulkImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { bulkAddItems } = useDashboard();
  const [phase, setPhase] = useState<Phase>('input');
  const [pasteMode, setPasteMode] = useState(true);
  const [rawText, setRawText] = useState('');
  const [result, setResult] = useState<AutonomousImportResult | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<ImportTarget | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [importCount, setImportCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [skippedDupes, setSkippedDupes] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPhase('input');
    setRawText('');
    setResult(null);
    setOverrideTarget(null);
    setExpandedItems(new Set());
    setImportCount(0);
    setImportProgress(0);
    setSkippedDupes(0);
    setPasteMode(true);
  }, []);

  // Main analysis — uses the full autonomous import engine
  const handleAnalyze = useCallback(async (text: string, fileName?: string) => {
    if (!text.trim()) return;
    setPhase('analyzing');

    // Brief delay for visual feedback
    await new Promise(r => setTimeout(r, 350));

    try {
      const importResult = autonomousImport(text, fileName);

      if (importResult.totalItems === 0 && importResult.parsedData.rows.length === 0) {
        toast.error('Could not detect any importable data. Try another format.');
        setPhase('input');
        return;
      }

      // ─── Deduplicate against existing data ─────────────────────────
      let totalSkipped = 0;
      for (const cat of importResult.categories) {
        const unique = await deduplicateItems(cat.target, cat.items);
        const dupeCount = cat.items.length - unique.length;
        totalSkipped += dupeCount;
        cat.items = unique;
      }
      importResult.totalItems = importResult.categories.reduce((s, c) => s + c.items.length, 0);
      setSkippedDupes(totalSkipped);

      setResult(importResult);
      setPhase('review');

      if (importResult.totalItems > 0) {
        const bestCat = importResult.categories[0];
        const conf = bestCat?.confidence;
        const dupeMsg = totalSkipped > 0 ? ` (${totalSkipped} duplicate(s) filtered out)` : '';
        if (conf === 'high') {
          toast.success(`Detected ${importResult.totalItems} ${bestCat.meta.label} with high confidence!${dupeMsg}`);
        } else if (conf === 'medium') {
          toast(`Detected ${importResult.totalItems} items as ${bestCat.meta.label}. You can change the category below.${dupeMsg}`, { icon: '🔍' });
        } else {
          toast(`Detection confidence is low. Please verify the category.${dupeMsg}`, { icon: '⚠️' });
        }
      } else if (totalSkipped > 0) {
        toast(`All ${totalSkipped} items already exist in the database — nothing new to import.`, { icon: '🔄' });
        setPhase('input');
      } else {
        toast.error('Data was parsed but no valid items could be created. Check your data format.');
        setPhase('input');
      }
    } catch (err) {
      console.error('Import analysis error:', err);
      toast.error('Failed to analyze data. Try a different format.');
      setPhase('input');
    }
  }, []);

  // File upload handler
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
      handleAnalyze(text, file.name);
    };
    reader.readAsText(file);
  }, [handleAnalyze]);

  // Clipboard paste
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { toast.error('Clipboard is empty.'); return; }
      setRawText(text);
      handleAnalyze(text);
    } catch {
      toast.error('Clipboard access denied. Please paste manually into the text area.');
    }
  }, [handleAnalyze]);

  // Re-analyze with a different target override
  const handleRetarget = useCallback(async (newTarget: ImportTarget) => {
    if (!result) return;
    setOverrideTarget(newTarget);
    // Re-run normalization with the new target
    const { parsedData } = result;
    const fieldMap = autoMapFields(parsedData.sourceFields, newTarget);
    const allItems = normalizeItems(parsedData.rows, newTarget, fieldMap);
    const meta = TARGET_META[newTarget];
    // ─── Deduplicate against existing data ───────────────────────────
    const items = await deduplicateItems(newTarget, allItems);
    const dupeCount = allItems.length - items.length;
    setSkippedDupes(dupeCount);

    setResult({
      ...result,
      categories: [{
        target: newTarget,
        meta,
        confidence: items.length > 0 ? 'medium' : 'low',
        items,
        fieldMap,
        score: 0,
      }],
      totalItems: items.length,
    });
  }, [result]);

  // Import execution
  const handleImport = useCallback(async () => {
    if (!result || result.categories.length === 0) return;
    setPhase('importing');
    let total = 0;

    for (const cat of result.categories) {
      const batchSize = 50;
      for (let i = 0; i < cat.items.length; i += batchSize) {
        const batch = cat.items.slice(i, i + batchSize);
        await bulkAddItems(cat.target, batch);
        total += batch.length;
        setImportProgress(Math.round((total / result.totalItems) * 100));
      }
    }

    setImportCount(total);
    setPhase('done');
    toast.success(`Successfully imported ${total} items!`);
  }, [result, bulkAddItems]);

  // Template download
  const handleDownloadTemplate = useCallback((target: ImportTarget) => {
    const csv = generateTemplate(target);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${TARGET_META[target].label} template!`);
  }, []);

  // Derived data
  const bestCategory = result?.categories[0];
  const activeTarget = overrideTarget || bestCategory?.target;

  // Stat counts
  const stats = useMemo(() => {
    if (!result) return null;
    return {
      totalParsedRows: result.parsedData.rows.length,
      totalValidItems: result.totalItems,
      detectedFormat: result.parsedData.detectedFormat,
      sourceFields: result.parsedData.sourceFields,
    };
  }, [result]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-4xl w-full bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl max-h-[90vh] flex flex-col border border-border/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="relative px-6 py-5 border-b border-border/30">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                    {phase === 'done' ? <CheckCircle2 size={22} className="text-white" /> :
                      phase === 'analyzing' ? <Brain size={22} className="text-white animate-pulse" /> :
                        <Wand2 size={22} className="text-white" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-card-foreground">
                      {phase === 'input' ? 'Smart Import' :
                        phase === 'analyzing' ? 'Analyzing Data...' :
                          phase === 'review' ? 'Review & Import' :
                            phase === 'importing' ? 'Importing...' :
                              'Import Complete!'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {phase === 'input' ? 'Paste anything — autonomous AI detection handles the rest' :
                        phase === 'analyzing' ? 'Running content-aware analysis on your data...' :
                          phase === 'review' ? `${result?.totalItems ?? 0} items detected across ${result?.categories.length ?? 0} categories` :
                            phase === 'importing' ? `${importProgress}% complete...` :
                              `${importCount} items imported successfully`}
                    </p>
                  </div>
                </div>
                <button onClick={() => { reset(); onClose(); }} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Progress bar for analyzing/importing */}
              {(phase === 'analyzing' || phase === 'importing') && (
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/20">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: '0%' }}
                    animate={{ width: phase === 'analyzing' ? '90%' : `${importProgress}%` }}
                    transition={{ duration: phase === 'analyzing' ? 0.8 : 0.3 }}
                  />
                </motion.div>
              )}
            </div>

            {/* ─── Body ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* === INPUT PHASE === */}
              {phase === 'input' && (
                <div className="space-y-5">
                  {/* AI engine banner */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/8 via-accent/5 to-primary/3 border border-primary/10">
                    <Brain size={22} className="text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">Autonomous Smart Engine</p>
                      <p className="text-xs text-muted-foreground">Content-aware AI analyzes every cell value, not just headers. Supports CSV, TSV, JSON, JSON Lines, key:value pairs, URL lists, and plain text. Auto-detects websites, credentials, tasks, payments, and 7 more categories.</p>
                    </div>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex gap-2">
                    <button onClick={() => setPasteMode(true)}
                      className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-semibold transition-all ${pasteMode ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
                      <Clipboard size={16} /> Paste Data
                    </button>
                    <button onClick={() => setPasteMode(false)}
                      className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-semibold transition-all ${!pasteMode ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
                      <Upload size={16} /> Upload File
                    </button>
                  </div>

                  {pasteMode ? (
                    <div className="space-y-3">
                      <textarea
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        placeholder={`Paste ANY data — the engine auto-detects everything:\n\n• Websites with credentials (name, URL, passwords...)\n• CSV/TSV with headers\n• JSON arrays of objects\n• Lists of URLs\n• Key: Value pairs\n• Plain text lists (tasks, notes)\n• Mixed formats — we handle it all`}
                        rows={10}
                        className="w-full px-4 py-3.5 rounded-2xl bg-secondary/50 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none placeholder:text-muted-foreground/60 font-mono leading-relaxed border border-border/30"
                      />
                      <div className="flex gap-2">
                        <button onClick={handlePaste} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all">
                          <Clipboard size={14} /> Paste from Clipboard
                        </button>
                        <button onClick={() => handleAnalyze(rawText)} disabled={!rawText.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed">
                          <Zap size={14} /> Analyze & Auto-Detect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-border/40 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-all group">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-all group-hover:scale-105">
                          <Upload size={28} className="text-primary" />
                        </div>
                        <p className="text-sm text-card-foreground font-semibold">Click to upload or drag a file</p>
                        <p className="text-xs text-muted-foreground mt-1.5">Supports .csv, .json, .txt, .tsv, .jsonl files</p>
                      </div>
                      <input ref={fileRef} type="file" accept=".csv,.json,.txt,.tsv,.jsonl" onChange={handleFile} className="hidden" />
                    </div>
                  )}

                  {/* Quick examples */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quick Examples</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Website + Creds', example: 'My Blog: https://myblog.com\nWP Admin: https://myblog.com/wp-admin\nUsername: admin\nPassword: pass123\nHosting: SiteGround' },
                        { label: 'Multiple URLs', example: 'https://google.com\nhttps://github.com\nhttps://dribbble.com\nhttps://figma.com' },
                        { label: 'CSV Format', example: 'name,url,username,password\nBlog,https://blog.com,admin,pass1\nShop,https://shop.com,user,pass2' },
                        { label: 'Tasks List', example: '- Fix checkout bug\n- Write blog post about AI\n- Deploy portfolio redesign\n- Update SSL certificates\n- Review client feedback' },
                      ].map(ex => (
                        <button key={ex.label} onClick={() => { setRawText(ex.example); }}
                          className="text-left p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all border border-border/20 hover:border-primary/15 group">
                          <p className="text-xs font-semibold text-card-foreground group-hover:text-primary transition-colors">{ex.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">{ex.example.split('\n')[0]}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template downloads */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Download CSV Templates</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(TARGET_META) as ImportTarget[]).map(t => (
                        <button key={t} onClick={() => handleDownloadTemplate(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/40 text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                          <Download size={9} /> {TARGET_META[t].emoji} {TARGET_META[t].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* === ANALYZING PHASE === */}
              {phase === 'analyzing' && (
                <div className="text-center py-16">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5 shadow-xl shadow-primary/20"
                  >
                    <Brain size={28} className="text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-card-foreground mb-2">Analyzing Your Data</h3>
                  <p className="text-sm text-muted-foreground">Running content-aware detection across 10 categories...</p>
                  <div className="flex justify-center gap-2 mt-5">
                    {['Parsing', 'Scoring', 'Mapping', 'Validating'].map((step, i) => (
                      <motion.span key={step}
                        initial={{ opacity: 0.3 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.2, duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                        {step}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* === REVIEW PHASE === */}
              {phase === 'review' && result && bestCategory && (
                <div className="space-y-5">
                  {/* Detection stats banner */}
                  <div className="grid grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-card-foreground">{stats?.totalParsedRows ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">Rows Parsed</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-primary">{result.totalItems}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">Valid Items</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-card-foreground uppercase">{stats?.detectedFormat}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">Format</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-card-foreground">{stats?.sourceFields.length ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">Fields Found</div>
                    </div>
                  </div>

                  {/* Dedup info banner */}
                  {skippedDupes > 0 && (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/15">
                      <RefreshCw size={16} className="text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-card-foreground">
                          {skippedDupes} duplicate{skippedDupes > 1 ? 's' : ''} filtered out
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          These items already exist in your database and won't be imported again.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Confidence + Category selector */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl ${CONFIDENCE_STYLES[bestCategory.confidence].bg} ${CONFIDENCE_STYLES[bestCategory.confidence].border} border`}>
                      {(() => { const Icon = CONFIDENCE_STYLES[bestCategory.confidence].icon; return <Icon size={14} className={CONFIDENCE_STYLES[bestCategory.confidence].text} />; })()}
                      <span className={`text-xs font-bold ${CONFIDENCE_STYLES[bestCategory.confidence].text}`}>
                        {CONFIDENCE_STYLES[bestCategory.confidence].label}
                      </span>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">Import as:</span>
                      <select
                        value={activeTarget}
                        onChange={e => handleRetarget(e.target.value as ImportTarget)}
                        className="px-3 py-2 rounded-xl bg-secondary/50 text-sm font-semibold text-card-foreground border border-border/30 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      >
                        {(Object.keys(TARGET_META) as ImportTarget[]).map(t => (
                          <option key={t} value={t}>{TARGET_META[t].emoji} {TARGET_META[t].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Field mapping preview */}
                  {bestCategory.fieldMap && Object.keys(bestCategory.fieldMap).length > 0 && (
                    <div className="p-3.5 rounded-xl bg-secondary/20 border border-border/20">
                      <div className="flex items-center gap-2 mb-2.5">
                        <Layers size={13} className="text-primary" />
                        <span className="text-xs font-semibold text-card-foreground">Field Mapping</span>
                        <span className="text-[10px] text-muted-foreground">(auto-detected)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(bestCategory.fieldMap).map(([targetField, sourceField]) => (
                          <div key={targetField} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 text-[10px]">
                            <span className="font-mono text-muted-foreground">{sourceField}</span>
                            <ArrowRight size={8} className="text-primary" />
                            <span className="font-semibold text-card-foreground">{targetField}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto scrollbar-thin pr-1">
                    {bestCategory.items.map((item, i) => {
                      const meta = bestCategory.meta;
                      const gradient = TARGET_GRADIENTS[bestCategory.target];
                      const isExpanded = expandedItems.has(i);
                      const displayName = item.name || item.title || item.label || item.url || 'Untitled';
                      const displayUrl = item.url;

                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5) }}
                          className="rounded-xl bg-secondary/20 border border-border/15 hover:border-primary/10 transition-all overflow-hidden"
                        >
                          <div className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer"
                            onClick={() => setExpandedItems(prev => {
                              const n = new Set(prev);
                              if (n.has(i)) n.delete(i); else n.add(i);
                              return n;
                            })}
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}>
                              {meta.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-card-foreground truncate block">{displayName}</span>
                              {displayUrl && (
                                <span className="text-[10px] text-muted-foreground truncate block">{extractDomain(displayUrl)}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 font-mono">#{i + 1}</span>
                            {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                          </div>

                          {/* Expanded field details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3.5 pb-3 pt-0.5">
                                  <div className="flex flex-wrap gap-1 p-2.5 rounded-lg bg-secondary/30">
                                    {Object.entries(item).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)).map(([key, val]) => (
                                      <span key={key} className="text-[10px] px-2 py-0.5 rounded-md bg-card/60 text-muted-foreground border border-border/10">
                                        <span className="font-semibold text-card-foreground">{key}:</span>{' '}
                                        {Array.isArray(val) ? val.join(', ') : String(val).slice(0, 50)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Source fields detected */}
                  {stats && stats.sourceFields.length > 0 && (
                    <div className="p-3 rounded-xl bg-secondary/15 border border-border/10">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Source fields detected:</p>
                      <div className="flex flex-wrap gap-1">
                        {stats.sourceFields.map(f => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/50 text-muted-foreground font-mono">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === IMPORTING PHASE === */}
              {phase === 'importing' && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-5 relative">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                      <motion.circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary"
                        strokeDasharray={226} strokeDashoffset={226 - (226 * importProgress / 100)}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-extrabold text-primary">{importProgress}%</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground mb-2">Importing Items</h3>
                  <p className="text-sm text-muted-foreground">Writing to database...</p>
                </div>
              )}

              {/* === DONE PHASE === */}
              {phase === 'done' && (
                <div className="text-center py-12">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200 }}>
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 size={40} className="text-white" />
                    </div>
                  </motion.div>
                  <h3 className="text-2xl font-bold text-card-foreground mb-2">All Done! 🎉</h3>
                  <p className="text-muted-foreground mb-4">Successfully imported {importCount} items</p>
                  {result && result.categories.map(cat => (
                    <span key={cat.target} className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 mx-1">
                      {cat.meta.emoji} {cat.items.length} {cat.meta.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Footer ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/30 bg-secondary/10">
              <div className="text-xs text-muted-foreground">
                {phase === 'review' && <span>Change category with the dropdown above</span>}
                {phase === 'input' && <span>Powered by Smart Import Engine v10</span>}
              </div>
              <div className="flex items-center gap-2">
                {phase === 'input' && (
                  <button onClick={() => { reset(); onClose(); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
                    Cancel
                  </button>
                )}
                {phase === 'review' && (
                  <>
                    <button onClick={() => { setPhase('input'); setResult(null); setOverrideTarget(null); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
                      <RotateCcw size={13} /> Start Over
                    </button>
                    <button onClick={handleImport} disabled={!result || result.totalItems === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-40">
                      <Sparkles size={14} /> Import {result?.totalItems ?? 0} Items
                    </button>
                  </>
                )}
                {phase === 'done' && (
                  <button onClick={() => { reset(); onClose(); }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25">
                    <CheckCircle2 size={14} /> Done
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
