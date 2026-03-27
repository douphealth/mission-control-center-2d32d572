import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, X, CheckCircle2, Sparkles, Wand2, Globe, Link2, Key, CreditCard,
  FileCode, ExternalLink, Clipboard, RotateCcw, ChevronDown, ChevronRight, AlertTriangle,
  Shield, Lightbulb, Zap, ArrowRight, Download, RefreshCw, Edit3, Check, Layers,
  Brain, Target, TrendingUp, Hash, Clock, Rocket, Split, Trash2
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
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Icon registry ──────────────────────────────────────────────────────────────

const TARGET_ICONS: Record<ImportTarget, any> = {
  websites: Globe, links: Link2, tasks: FileText, repos: FileCode,
  buildProjects: FileCode, credentials: Key, payments: CreditCard,
  notes: FileText, ideas: Lightbulb, habits: RefreshCw,
};

const TARGET_GRADIENTS: Record<ImportTarget, string> = {
  websites: 'from-blue-500 to-cyan-500', links: 'from-purple-500 to-pink-500',
  tasks: 'from-amber-500 to-orange-500', repos: 'from-green-500 to-emerald-500',
  buildProjects: 'from-orange-500 to-red-500', credentials: 'from-red-500 to-rose-500',
  payments: 'from-emerald-500 to-teal-500', notes: 'from-indigo-500 to-violet-500',
  ideas: 'from-yellow-500 to-amber-500', habits: 'from-cyan-500 to-blue-500',
};

const CONFIDENCE_STYLES = {
  high: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', label: 'High Confidence', icon: Shield },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', label: 'Medium', icon: AlertTriangle },
  low: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', label: 'Low', icon: AlertTriangle },
};

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return u.hostname.replace(/^www\./, '');
  } catch { return url; }
}

// ─── Component ──────────────────────────────────────────────────────────────────

type Phase = 'input' | 'analyzing' | 'review' | 'importing' | 'done';

export default function BulkImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { bulkAddItems } = useDashboard();
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<Phase>('input');
  const [rawText, setRawText] = useState('');
  const [result, setResult] = useState<AutonomousImportResult | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [importCount, setImportCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [skippedDupes, setSkippedDupes] = useState(0);
  const [autoClipboardDone, setAutoClipboardDone] = useState(false);
  const [removedCategories, setRemovedCategories] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const reset = useCallback(() => {
    setPhase('input');
    setRawText('');
    setResult(null);
    setExpandedItems(new Set());
    setImportCount(0);
    setImportProgress(0);
    setSkippedDupes(0);
    setAutoClipboardDone(false);
    setRemovedCategories(new Set());
  }, []);

  // Auto-read clipboard when modal opens
  useEffect(() => {
    if (!open || autoClipboardDone) return;
    setAutoClipboardDone(true);

    (async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 5 && text.trim().length < 100000) {
          setRawText(text);
          toast('📋 Clipboard data detected — hit Analyze to import!', { duration: 3000 });
        }
      } catch {
        // Clipboard access denied — that's fine
      }
    })();
  }, [open, autoClipboardDone]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(reset, 300);
      return () => clearTimeout(t);
    }
  }, [open, reset]);

  // Main analysis
  const handleAnalyze = useCallback(async (text: string, fileName?: string) => {
    if (!text.trim()) return;
    setPhase('analyzing');
    await new Promise(r => setTimeout(r, 300));

    try {
      const importResult = autonomousImport(text, fileName);

      if (importResult.totalItems === 0 && importResult.parsedData.rows.length === 0) {
        toast.error('Could not detect any importable data. Try another format.');
        setPhase('input');
        return;
      }

      // Deduplicate against existing data
      let totalSkipped = 0;
      for (const cat of importResult.categories) {
        const unique = await deduplicateItems(cat.target, cat.items);
        const dupeCount = cat.items.length - unique.length;
        totalSkipped += dupeCount;
        cat.items = unique;
      }
      // Remove empty categories after dedup
      importResult.categories = importResult.categories.filter(c => c.items.length > 0);
      importResult.totalItems = importResult.categories.reduce((s, c) => s + c.items.length, 0);
      setSkippedDupes(totalSkipped);
      setResult(importResult);

      if (importResult.totalItems > 0) {
        setPhase('review');
        const catLabels = importResult.categories.map(c => `${c.items.length} ${c.meta.label}`).join(', ');
        const dupeMsg = totalSkipped > 0 ? ` (${totalSkipped} duplicates filtered)` : '';

        if (importResult.categories.length > 1) {
          toast.success(`Multi-category detected: ${catLabels}${dupeMsg}`);
        } else {
          const conf = importResult.categories[0]?.confidence;
          if (conf === 'high') {
            toast.success(`Detected ${catLabels} with high confidence!${dupeMsg}`);
          } else {
            toast(`Detected ${catLabels}. Verify category below.${dupeMsg}`, { icon: '🔍' });
          }
        }
      } else if (totalSkipped > 0) {
        toast(`All ${totalSkipped} items already exist — nothing new to import.`, { icon: '🔄' });
        setPhase('input');
      } else {
        toast.error('Data was parsed but no valid items could be created.');
        setPhase('input');
      }
    } catch (err) {
      console.error('Import analysis error:', err);
      toast.error('Failed to analyze data. Try a different format.');
      setPhase('input');
    }
  }, []);

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

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { toast.error('Clipboard is empty.'); return; }
      setRawText(text);
      handleAnalyze(text);
    } catch {
      toast.error('Clipboard access denied. Paste manually into the text area.');
    }
  }, [handleAnalyze]);

  // Re-target a specific category
  const handleRetarget = useCallback(async (catIndex: number, newTarget: ImportTarget) => {
    if (!result) return;
    const cat = result.categories[catIndex];
    if (!cat) return;

    // Re-normalize items for the new target
    const { parsedData } = result;
    const fieldMap = autoMapFields(parsedData.sourceFields, newTarget);
    // Use original rows for this category's items
    const allItems = normalizeItems(parsedData.rows, newTarget, fieldMap);
    const items = await deduplicateItems(newTarget, allItems);

    const updated = { ...result };
    updated.categories = [...result.categories];
    updated.categories[catIndex] = {
      target: newTarget,
      meta: TARGET_META[newTarget],
      confidence: items.length > 0 ? 'medium' : 'low',
      items,
      fieldMap,
      score: 0,
    };
    updated.totalItems = updated.categories.reduce((s, c) => s + c.items.length, 0);
    setResult(updated);
  }, [result]);

  // Remove a category
  const handleRemoveCategory = useCallback((catIndex: number) => {
    if (!result) return;
    const updated = { ...result };
    updated.categories = result.categories.filter((_, i) => i !== catIndex);
    updated.totalItems = updated.categories.reduce((s, c) => s + c.items.length, 0);
    setResult(updated);
  }, [result]);

  // Import execution
  const handleImport = useCallback(async () => {
    if (!result || result.categories.length === 0) return;
    setPhase('importing');
    let total = 0;
    const totalItems = result.totalItems;

    for (const cat of result.categories) {
      const batchSize = 50;
      for (let i = 0; i < cat.items.length; i += batchSize) {
        const batch = cat.items.slice(i, i + batchSize);
        await bulkAddItems(cat.target, batch);
        total += batch.length;
        setImportProgress(Math.round((total / totalItems) * 100));
      }
    }

    setImportCount(total);
    setPhase('done');
    toast.success(`Successfully imported ${total} items!`);
  }, [result, bulkAddItems]);

  // Express import (high-confidence, skip review)
  const handleExpressImport = useCallback(async () => {
    if (!rawText.trim()) return;
    setPhase('analyzing');
    await new Promise(r => setTimeout(r, 200));

    try {
      const importResult = autonomousImport(rawText);
      let totalSkipped = 0;
      for (const cat of importResult.categories) {
        const unique = await deduplicateItems(cat.target, cat.items);
        totalSkipped += cat.items.length - unique.length;
        cat.items = unique;
      }
      importResult.categories = importResult.categories.filter(c => c.items.length > 0);
      importResult.totalItems = importResult.categories.reduce((s, c) => s + c.items.length, 0);
      setResult(importResult);

      if (importResult.totalItems === 0) {
        toast(totalSkipped > 0 ? 'All items already exist.' : 'No importable data detected.', { icon: '⚠️' });
        setPhase('input');
        return;
      }

      // Direct import
      setPhase('importing');
      let total = 0;
      for (const cat of importResult.categories) {
        await bulkAddItems(cat.target, cat.items);
        total += cat.items.length;
      }
      setImportCount(total);
      setImportProgress(100);
      setPhase('done');

      const catLabels = importResult.categories.map(c => `${c.items.length} ${c.meta.label}`).join(', ');
      toast.success(`⚡ Express imported: ${catLabels}!`);
    } catch (err) {
      console.error('Express import error:', err);
      toast.error('Express import failed. Try standard import.');
      setPhase('input');
    }
  }, [rawText, bulkAddItems]);

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

  // Handle paste event on textarea for instant analysis
  const handleTextareaPaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text && text.trim().length > 10) {
      // Let the textarea update first, then auto-analyze
      setTimeout(() => handleAnalyze(text), 100);
    }
  }, [handleAnalyze]);

  // Handle drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Handle dropped files
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setRawText(text);
        handleAnalyze(text, file.name);
      };
      reader.readAsText(file);
      return;
    }

    // Handle dropped text
    const text = e.dataTransfer.getData('text');
    if (text) {
      setRawText(text);
      handleAnalyze(text);
    }
  }, [handleAnalyze]);

  const stats = useMemo(() => {
    if (!result) return null;
    return {
      totalParsedRows: result.parsedData.rows.length,
      totalValidItems: result.totalItems,
      detectedFormat: result.parsedData.detectedFormat,
      sourceFields: result.parsedData.sourceFields,
    };
  }, [result]);

  const activeCategories = result?.categories.filter((_, i) => !removedCategories.has(String(i))) || [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-4xl bg-card/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-border/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="relative px-4 sm:px-6 py-4 sm:py-5 border-b border-border/30">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                    {phase === 'done' ? <CheckCircle2 size={20} className="text-white" /> :
                      phase === 'analyzing' ? <Brain size={20} className="text-white animate-pulse" /> :
                        phase === 'review' && (result?.categories.length ?? 0) > 1 ? <Split size={20} className="text-white" /> :
                          <Wand2 size={20} className="text-white" />}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-card-foreground">
                      {phase === 'input' ? 'Smart Import' :
                        phase === 'analyzing' ? 'Analyzing...' :
                          phase === 'review' ? (result?.categories.length ?? 0) > 1 ? 'Multi-Category Import' : 'Review & Import' :
                            phase === 'importing' ? 'Importing...' :
                              'Import Complete!'}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {phase === 'input' ? 'Paste anything — ultra-smart NLP engine handles the rest' :
                        phase === 'analyzing' ? 'Running NLP analysis + content-aware detection...' :
                          phase === 'review' ? `${result?.totalItems ?? 0} items across ${result?.categories.length ?? 0} ${(result?.categories.length ?? 0) === 1 ? 'category' : 'categories'}` :
                            phase === 'importing' ? `${importProgress}% complete...` :
                              `${importCount} items imported successfully`}
                    </p>
                  </div>
                </div>
                <button onClick={() => { reset(); onClose(); }} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                  <X size={18} />
                </button>
              </div>

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
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">

              {/* === INPUT PHASE === */}
              {phase === 'input' && (
                <div className="space-y-4">
                  {/* NLP engine banner */}
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-primary/8 via-accent/5 to-primary/3 border border-primary/10">
                    <Brain size={20} className="text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">Ultra-Smart NLP Engine v15</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        Paste <strong>any data</strong> — CSV, JSON, markdown tables, HTML tables, plain text, URL lists, key:value blocks, or even natural language.
                        Auto-detects categories, parses dates like "tomorrow" or "next Monday", extracts priorities, and splits mixed data into multiple categories.
                      </p>
                    </div>
                  </div>

                  {/* Main text input with drop zone */}
                  <div className="space-y-2">
                    <textarea
                      ref={textareaRef}
                      value={rawText}
                      onChange={e => setRawText(e.target.value)}
                      onPaste={handleTextareaPaste}
                      placeholder={`Just paste anything here — I'll figure it out:\n\n• "Fix the login bug by tomorrow [high]"\n• CSV/TSV with headers\n• JSON arrays or objects\n• Markdown tables (| col | col |)\n• HTML tables (<table>...)\n• URLs, emails, credentials\n• Key: Value blocks\n• "$500 invoice from Client Alpha due next Friday"\n• Mixed data — I auto-split into categories!`}
                      rows={isMobile ? 7 : 10}
                      className="w-full px-4 py-3.5 rounded-2xl bg-secondary/50 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none placeholder:text-muted-foreground/50 font-mono leading-relaxed border border-border/30"
                      autoFocus={!isMobile}
                    />

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button onClick={handlePaste} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all">
                        <Clipboard size={14} /> Paste from Clipboard
                      </button>
                      <div className="flex-1 flex gap-2">
                        <button onClick={() => handleAnalyze(rawText)} disabled={!rawText.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed">
                          <Zap size={14} /> Analyze & Detect
                        </button>
                        <button onClick={handleExpressImport} disabled={!rawText.trim()}
                          title="Skip review — import directly"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
                          <Rocket size={14} /> <span className="hidden sm:inline">Express</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* File upload */}
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border/30 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/3 transition-all group">
                    <div className="flex items-center justify-center gap-3">
                      <Upload size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-xs font-semibold text-card-foreground group-hover:text-primary transition-colors">Drop a file or click to upload</p>
                        <p className="text-[10px] text-muted-foreground">.csv, .json, .txt, .tsv, .jsonl, .md, .html</p>
                      </div>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.json,.txt,.tsv,.jsonl,.md,.html,.htm" onChange={handleFile} className="hidden" />

                  {/* Quick examples — collapsible on mobile */}
                  <details className="group" open={!isMobile}>
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5">
                      <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                      Quick Examples & Templates
                    </summary>
                    <div className="mt-2 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { label: 'Website + Creds', example: 'My Blog: https://myblog.com\nWP Admin: https://myblog.com/wp-admin\nUsername: admin\nPassword: pass123\nHosting: SiteGround' },
                          { label: 'Smart Tasks', example: '- Fix checkout bug by tomorrow [critical]\n- Write blog post about AI (due next Friday)\n- Deploy portfolio redesign @high [in progress]\n- Update SSL certificates [done]\n- Review client feedback by end of week' },
                          { label: 'Markdown Table', example: '| Name | URL | Status |\n|------|-----|--------|\n| Blog | https://blog.com | active |\n| Shop | https://shop.com | maintenance |' },
                          { label: 'Mixed Data', example: '- Fix login bug by tomorrow [high]\n$5000 invoice from Client Alpha due March 15\nhttps://docs.google.com\nhttps://github.com/myrepo\n- Buy domain for new project' },
                        ].map(ex => (
                          <button key={ex.label} onClick={() => { setRawText(ex.example); }}
                            className="text-left p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all border border-border/20 hover:border-primary/15 group/ex">
                            <p className="text-[10px] sm:text-xs font-semibold text-card-foreground group-hover/ex:text-primary transition-colors">{ex.label}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 truncate font-mono">{ex.example.split('\n')[0]}</p>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(Object.keys(TARGET_META) as ImportTarget[]).map(t => (
                          <button key={t} onClick={() => handleDownloadTemplate(t)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary/40 text-[9px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                            <Download size={8} /> {TARGET_META[t].emoji} {TARGET_META[t].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {/* === ANALYZING PHASE === */}
              {phase === 'analyzing' && (
                <div className="text-center py-12 sm:py-16">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5 shadow-xl shadow-primary/20"
                  >
                    <Brain size={24} className="text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-card-foreground mb-2">Analyzing Your Data</h3>
                  <p className="text-sm text-muted-foreground">NLP parsing + content-aware detection across 10 categories...</p>
                  <div className="flex justify-center gap-2 mt-5 flex-wrap">
                    {['Parsing', 'NLP Extract', 'Scoring', 'Splitting', 'Dedup'].map((step, i) => (
                      <motion.span key={step}
                        initial={{ opacity: 0.3 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.15, duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                        {step}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* === REVIEW PHASE === */}
              {phase === 'review' && result && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-card-foreground">{stats?.totalParsedRows ?? 0}</div>
                      <div className="text-[9px] text-muted-foreground font-medium">Rows Parsed</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-primary">{result.totalItems}</div>
                      <div className="text-[9px] text-muted-foreground font-medium">Valid Items</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-card-foreground uppercase">{stats?.detectedFormat}</div>
                      <div className="text-[9px] text-muted-foreground font-medium">Format</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-center">
                      <div className="text-lg font-extrabold text-card-foreground">{result.categories.length}</div>
                      <div className="text-[9px] text-muted-foreground font-medium">{result.categories.length === 1 ? 'Category' : 'Categories'}</div>
                    </div>
                  </div>

                  {skippedDupes > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
                      <RefreshCw size={14} className="text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-card-foreground">
                        <span className="font-semibold">{skippedDupes} duplicate{skippedDupes > 1 ? 's' : ''}</span> filtered out
                      </p>
                    </div>
                  )}

                  {/* Categories */}
                  {result.categories.map((cat, catIdx) => {
                    const gradient = TARGET_GRADIENTS[cat.target];
                    const confStyle = CONFIDENCE_STYLES[cat.confidence];
                    const catKey = `cat-${catIdx}`;
                    const isExpanded = expandedItems.has(catKey);

                    return (
                      <div key={catIdx} className="rounded-2xl border border-border/30 overflow-hidden bg-secondary/10">
                        {/* Category header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm`}>
                            <span className="text-sm">{cat.meta.emoji}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-card-foreground">{cat.meta.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${confStyle.bg} ${confStyle.text} font-semibold`}>
                                {confStyle.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{cat.items.length} items</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Retarget dropdown */}
                            <select
                              value={cat.target}
                              onChange={e => handleRetarget(catIdx, e.target.value as ImportTarget)}
                              className="text-[10px] px-2 py-1 rounded-lg bg-secondary/50 text-card-foreground border border-border/30 outline-none cursor-pointer"
                            >
                              {(Object.keys(TARGET_META) as ImportTarget[]).map(t => (
                                <option key={t} value={t}>{TARGET_META[t].emoji} {TARGET_META[t].label}</option>
                              ))}
                            </select>
                            {result.categories.length > 1 && (
                              <button onClick={() => handleRemoveCategory(catIdx)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                title="Remove this category">
                                <Trash2 size={12} />
                              </button>
                            )}
                            <button onClick={() => setExpandedItems(prev => {
                              const n = new Set(prev);
                              if (n.has(catKey)) n.delete(catKey); else n.add(catKey);
                              return n;
                            })}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Items preview (always show first 3, expand for all) */}
                        <div className="px-3 py-2 space-y-1">
                          {cat.items.slice(0, isExpanded ? undefined : 3).map((item, i) => {
                            const displayName = item.name || item.title || item.label || item.url || 'Untitled';
                            const displayUrl = item.url;
                            const itemKey = `${catIdx}-${i}`;
                            const isItemExpanded = expandedItems.has(itemKey);

                            return (
                              <div key={i} className="rounded-xl bg-card/40 border border-border/10 overflow-hidden">
                                <div className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/20 transition-colors"
                                  onClick={() => setExpandedItems(prev => {
                                    const n = new Set(prev);
                                    if (n.has(itemKey)) n.delete(itemKey); else n.add(itemKey);
                                    return n;
                                  })}
                                >
                                  <span className="text-[10px] text-muted-foreground/50 font-mono w-5 text-right flex-shrink-0">{i + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-card-foreground truncate block">{displayName}</span>
                                    {displayUrl && <span className="text-[9px] text-muted-foreground truncate block">{extractDomain(displayUrl)}</span>}
                                  </div>
                                  {/* Show key field badges */}
                                  <div className="flex gap-1 flex-shrink-0">
                                    {item.priority && item.priority !== 'medium' && (
                                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${
                                        item.priority === 'critical' ? 'bg-red-500/15 text-red-500' :
                                        item.priority === 'high' ? 'bg-orange-500/15 text-orange-500' :
                                        'bg-blue-500/15 text-blue-500'
                                      }`}>{item.priority}</span>
                                    )}
                                    {item.dueDate && item.dueDate !== new Date().toISOString().split('T')[0] && (
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{item.dueDate}</span>
                                    )}
                                    {item.amount > 0 && (
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-semibold">
                                        {item.currency || '$'}{item.amount}
                                      </span>
                                    )}
                                  </div>
                                  {isItemExpanded ? <ChevronDown size={10} className="text-muted-foreground/50" /> : <ChevronRight size={10} className="text-muted-foreground/50" />}
                                </div>

                                <AnimatePresence>
                                  {isItemExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.15 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-3 pb-2 pt-0.5">
                                        <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-secondary/30">
                                          {Object.entries(item)
                                            .filter(([k, v]) => !k.startsWith('__') && v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
                                            .map(([key, val]) => (
                                              <span key={key} className="text-[9px] px-1.5 py-0.5 rounded-md bg-card/60 text-muted-foreground border border-border/10">
                                                <span className="font-semibold text-card-foreground">{key}:</span>{' '}
                                                {Array.isArray(val) ? val.join(', ') : String(val).slice(0, 60)}
                                              </span>
                                            ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}

                          {!isExpanded && cat.items.length > 3 && (
                            <button onClick={() => setExpandedItems(prev => new Set(prev).add(catKey))}
                              className="w-full text-center text-[10px] text-primary font-medium py-1.5 hover:bg-primary/5 rounded-lg transition-colors">
                              Show all {cat.items.length} items
                            </button>
                          )}
                        </div>

                        {/* Field mapping */}
                        {cat.fieldMap && Object.keys(cat.fieldMap).length > 0 && isExpanded && (
                          <div className="px-3 pb-3">
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Layers size={10} className="text-primary" />
                                <span className="text-[9px] font-semibold text-card-foreground">Field Mapping</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(cat.fieldMap).map(([tf, sf]) => (
                                  <div key={tf} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/50 text-[8px]">
                                    <span className="font-mono text-muted-foreground">{sf}</span>
                                    <ArrowRight size={7} className="text-primary" />
                                    <span className="font-semibold text-card-foreground">{tf}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Source fields */}
                  {stats && stats.sourceFields.length > 0 && (
                    <details className="group">
                      <summary className="text-[10px] text-muted-foreground font-medium cursor-pointer flex items-center gap-1">
                        <ChevronRight size={10} className="group-open:rotate-90 transition-transform" />
                        {stats.sourceFields.length} source fields detected
                      </summary>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {stats.sourceFields.map(f => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary/50 text-muted-foreground font-mono">{f}</span>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* === IMPORTING PHASE === */}
              {phase === 'importing' && (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 relative">
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
                <div className="text-center py-10 sm:py-12">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200 }}>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 size={32} className="text-white" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl sm:text-2xl font-bold text-card-foreground mb-2">All Done! 🎉</h3>
                  <p className="text-muted-foreground mb-4">Successfully imported {importCount} items</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {result && result.categories.map(cat => (
                      <span key={cat.target} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                        {cat.meta.emoji} {cat.items.length} {cat.meta.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Footer ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-border/30 bg-secondary/10">
              <div className="text-[9px] sm:text-xs text-muted-foreground">
                {phase === 'review' && <span>Change category per section above</span>}
                {phase === 'input' && <span>v15 • NLP • Multi-Category • Express</span>}
              </div>
              <div className="flex items-center gap-2">
                {phase === 'input' && (
                  <button onClick={() => { reset(); onClose(); }}
                    className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
                    Cancel
                  </button>
                )}
                {phase === 'review' && (
                  <>
                    <button onClick={() => { setPhase('input'); setResult(null); }}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
                      <RotateCcw size={12} /> Back
                    </button>
                    <button onClick={handleImport} disabled={!result || result.totalItems === 0}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-40">
                      <Zap size={13} /> Import {result?.totalItems ?? 0} Items
                    </button>
                  </>
                )}
                {phase === 'done' && (
                  <button onClick={() => { reset(); onClose(); }}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25">
                    <Check size={14} /> Done
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
