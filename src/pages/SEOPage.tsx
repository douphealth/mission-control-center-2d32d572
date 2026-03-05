import { useDashboard } from "@/contexts/DashboardContext";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, TrendingUp, TrendingDown, ArrowUpRight, ExternalLink,
  Globe, AlertTriangle, CheckCircle2, BarChart3, FileText, Plus,
  RefreshCw, Eye, Zap, Target, Star
} from "lucide-react";
import FormModal, { FormField, FormInput, FormSelect, FormTextarea } from "@/components/FormModal";
import { toast } from "sonner";

// SEO Site tracker using the websites from DB + manual SEO metrics
interface SEOEntry {
  id: string;
  websiteName: string;
  url: string;
  clicks30d: number;
  impressions30d: number;
  avgPosition: number;
  indexedPages: number;
  issues: string[];
  status: "healthy" | "warnings" | "critical";
  lastChecked: string;
}

const sampleSEO: SEOEntry[] = [
  { id: "1", websiteName: "Tech Blog", url: "https://techinsights-blog.com", clicks30d: 4820, impressions30d: 89400, avgPosition: 18.3, indexedPages: 142, issues: [], status: "healthy", lastChecked: "2026-02-26" },
  { id: "2", websiteName: "Digital Marketing Agency", url: "https://agency-demo.com", clicks30d: 1240, impressions30d: 28900, avgPosition: 31.5, indexedPages: 38, issues: ["Core Web Vitals: LCP > 2.5s", "Mobile usability errors on 3 pages"], status: "warnings", lastChecked: "2026-02-25" },
  { id: "3", websiteName: "E-Commerce Fashion Store", url: "https://fashion-store.com", clicks30d: 9310, impressions30d: 145000, avgPosition: 12.1, indexedPages: 521, issues: [], status: "healthy", lastChecked: "2026-02-26" },
  { id: "4", websiteName: "SaaS Landing Page", url: "https://saas-product.io", clicks30d: 230, impressions30d: 6700, avgPosition: 42.8, indexedPages: 8, issues: ["Low impression count", "Missing meta descriptions on 2 pages", "No structured data"], status: "critical", lastChecked: "2026-02-24" },
];

const quickLinks = [
  { label: "Google Search Console", url: "https://search.google.com/search-console", icon: "🔍", desc: "Performance, coverage & Core Web Vitals" },
  { label: "Bing Webmaster Tools", url: "https://www.bing.com/webmasters", icon: "🌐", desc: "Bing crawl stats & SEO diagnostics" },
  { label: "Google PageSpeed", url: "https://pagespeed.web.dev", icon: "⚡", desc: "Core Web Vitals & performance scores" },
  { label: "Screaming Frog", url: "https://www.screamingfrog.co.uk", icon: "🐸", desc: "Site crawler & SEO audit tool" },
  { label: "Ahrefs", url: "https://ahrefs.com", icon: "📊", desc: "Backlinks, keywords & competitor research" },
  { label: "SEMrush", url: "https://semrush.com", icon: "🎯", desc: "Comprehensive SEO & content platform" },
  { label: "Google Analytics", url: "https://analytics.google.com", icon: "📈", desc: "Traffic & conversion analytics" },
  { label: "Schema Markup Validator", url: "https://validator.schema.org", icon: "✅", desc: "Validate structured data / rich results" },
];

function StatusBadge({ status }: { status: SEOEntry["status"] }) {
  return status === "healthy"
    ? <span className="badge badge-success">🟢 Healthy</span>
    : status === "warnings"
      ? <span className="badge badge-warning">🟡 Warnings</span>
      : <span className="badge badge-destructive">🔴 Critical</span>;
}

function MetricCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="card-glass p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function SEOPage() {
  const { websites } = useDashboard();
  const [seoData] = useState<SEOEntry[]>(sampleSEO);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const totalClicks = seoData.reduce((s, e) => s + e.clicks30d, 0);
  const totalImpressions = seoData.reduce((s, e) => s + e.impressions30d, 0);
  const avgPos = (seoData.reduce((s, e) => s + e.avgPosition, 0) / seoData.length).toFixed(1);
  const totalIssues = seoData.reduce((s, e) => s + e.issues.length, 0);

  const filtered = seoData.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.websiteName.toLowerCase().includes(q) || e.url.toLowerCase().includes(q);
    const matchF = filter === "all" || e.status === filter;
    return matchQ && matchF;
  });

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search size={22} className="text-primary" /> SEO Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor rankings, crawl health, and site performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.info("Reconnect to Google Search Console API to auto-refresh")} className="btn-secondary text-sm gap-2">
            <RefreshCw size={13} /> Refresh
          </button>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
            Open GSC <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Metrics overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Clicks (30d)" value={fmt(totalClicks)} sub="All tracked sites" icon={TrendingUp} color="text-emerald-500 bg-emerald-500/10" />
        <MetricCard label="Total Impressions" value={fmt(totalImpressions)} sub="30 days" icon={Eye} color="text-blue-500 bg-blue-500/10" />
        <MetricCard label="Avg. Position" value={avgPos} sub="Across all sites" icon={Target} color="text-violet-500 bg-violet-500/10" />
        <MetricCard label="Open Issues" value={String(totalIssues)} sub={totalIssues === 0 ? "All clear! ✨" : "Click to review"} icon={AlertTriangle} color={totalIssues > 0 ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10"} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 flex-1 max-w-xs">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sites..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
        {["all", "healthy", "warnings", "critical"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Site SEO cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((site, i) => (
          <motion.div key={site.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card-elevated p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-foreground">{site.websiteName}</div>
                  <StatusBadge status={site.status} />
                </div>
                <a href={site.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                  {site.url} <ExternalLink size={9} />
                </a>
              </div>
              <a href={`https://search.google.com/search-console/index?resource_id=${encodeURIComponent(site.url)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors shrink-0 flex items-center gap-1">
                GSC <ArrowUpRight size={11} />
              </a>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Clicks", value: fmt(site.clicks30d), color: "text-emerald-500" },
                { label: "Impr.", value: fmt(site.impressions30d), color: "text-blue-500" },
                { label: "Avg. Pos", value: site.avgPosition.toFixed(1), color: "text-violet-500" },
                { label: "Indexed", value: site.indexedPages.toString(), color: "text-amber-500" },
              ].map(m => (
                <div key={m.label} className="text-center p-2.5 rounded-xl bg-secondary/50">
                  <div className={`text-base font-bold ${m.color}`}>{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>

            {site.issues.length > 0 && (
              <div className="space-y-1.5">
                {site.issues.map((issue, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/8 rounded-lg px-3 py-1.5">
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    {issue}
                  </div>
                ))}
              </div>
            )}

            {site.issues.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/8 rounded-lg px-3 py-1.5">
                <CheckCircle2 size={11} /> No issues detected · Last checked {site.lastChecked}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Access Links */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Zap size={16} className="text-primary" /> Quick Access — SEO Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((link, i) => (
            <motion.a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-glass p-4 hover:border-primary/20 transition-all group block"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{link.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{link.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{link.desc}</div>
                </div>
                <ExternalLink size={11} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
}
