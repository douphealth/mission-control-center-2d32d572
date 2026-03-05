import { useDashboard } from "@/contexts/DashboardContext";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Rocket, ExternalLink, GitBranch, CheckCircle2, Clock, AlertTriangle,
  Globe, RefreshCw, Activity, Zap, Lock, Code2, BarChart3
} from "lucide-react";
import { toast } from "sonner";

interface VercelProject {
  id: string;
  name: string;
  url: string;
  liveUrl: string;
  status: "ready" | "building" | "error" | "queued";
  framework: string;
  lastDeployedAt: string;
  branch: string;
  credentialId?: string;
}

const sampleProjects: VercelProject[] = [
  { id: "vp1", name: "saas-product", url: "https://vercel.com/dashboard", liveUrl: "https://saas-product.io", status: "ready", framework: "Next.js", lastDeployedAt: "2026-02-26 09:14", branch: "main" },
  { id: "vp2", name: "portfolio-next", url: "https://vercel.com/dashboard", liveUrl: "https://myportfolio.dev", status: "ready", framework: "Next.js", lastDeployedAt: "2026-02-18 14:33", branch: "main" },
  { id: "vp3", name: "ai-content-gen", url: "https://vercel.com/dashboard", liveUrl: "https://ai-content-gen.vercel.app", status: "building", framework: "React", lastDeployedAt: "2026-02-26 13:55", branch: "feat/templates" },
  { id: "vp4", name: "invoice-gen", url: "https://vercel.com/dashboard", liveUrl: "https://invoice-gen.vercel.app", status: "ready", framework: "React", lastDeployedAt: "2026-01-10 11:22", branch: "main" },
];

const vercelTools = [
  { label: "Dashboard", url: "https://vercel.com/dashboard", icon: "🚀", desc: "Manage all deployments" },
  { label: "Deployments", url: "https://vercel.com/dashboard", icon: "📦", desc: "Deployment history & logs" },
  { label: "Domains", url: "https://vercel.com/dashboard", icon: "🌐", desc: "Custom domain management" },
  { label: "Storage", url: "https://vercel.com/dashboard/stores", icon: "🗄️", desc: "KV, Blob, Postgres, Edge Config" },
  { label: "Edge Config", url: "https://vercel.com/dashboard", icon: "⚡", desc: "Global edge configuration" },
  { label: "Analytics", url: "https://vercel.com/analytics", icon: "📊", desc: "Real-user web analytics" },
  { label: "Speed Insights", url: "https://vercel.com/dashboard", icon: "🏎️", desc: "Core Web Vitals tracking" },
  { label: "Vercel AI SDK", url: "https://sdk.vercel.ai", icon: "🤖", desc: "Build AI apps with Vercel" },
  { label: "v0.dev", url: "https://v0.dev", icon: "✨", desc: "AI UI generation" },
  { label: "API Reference", url: "https://vercel.com/docs/rest-api", icon: "📖", desc: "REST API documentation" },
  { label: "Status", url: "https://www.vercel-status.com", icon: "💚", desc: "Platform health & incidents" },
  { label: "CLI Docs", url: "https://vercel.com/docs/cli", icon: "⌨️", desc: "Vercel CLI reference" },
];

function DeployBadge({ status }: { status: VercelProject["status"] }) {
  const map = {
    ready: { cls: "badge-success", label: "✅ Ready", pulse: false },
    building: { cls: "badge-warning", label: "⟳ Building", pulse: true },
    error: { cls: "badge-destructive", label: "✗ Error", pulse: false },
    queued: { cls: "badge-muted", label: "⏳ Queued", pulse: false },
  };
  const { cls, label, pulse } = map[status];
  return <span className={`badge ${cls} ${pulse ? "animate-pulse" : ""}`}>{label}</span>;
}

export default function VercelPage() {
  const { credentials, buildProjects } = useDashboard();
  const [projects] = useState<VercelProject[]>(sampleProjects);
  const vercelCreds = credentials.filter(c => c.service.toLowerCase().includes("vercel") || c.label.toLowerCase().includes("vercel"));

  const readyCount = projects.filter(p => p.status === "ready").length;
  const buildingCount = projects.filter(p => p.status === "building").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket size={22} className="text-foreground" /> Vercel Deployments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor all deployments, preview URLs, and project health</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://www.vercel-status.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 transition-colors">
            <Activity size={12} className="animate-pulse" /> Status
          </a>
          <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
            Open Vercel <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Projects", value: projects.length, icon: Rocket, color: "text-foreground bg-secondary" },
          { label: "Live", value: readyCount, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Building", value: buildingCount, icon: RefreshCw, color: "text-amber-500 bg-amber-500/10" },
          { label: "Saved Creds", value: vercelCreds.length, icon: Lock, color: "text-violet-500 bg-violet-500/10" },
        ].map(stat => (
          <div key={stat.label} className="card-glass p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon size={17} />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Code2 size={15} className="text-primary" /> Projects
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {projects.map((proj, i) => (
            <motion.div key={proj.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card-elevated p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{proj.name}</span>
                    <DeployBadge status={proj.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="badge-muted capitalize">{proj.framework}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <GitBranch size={9} /> {proj.branch}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors" title="Visit live site">
                    <Globe size={13} />
                  </a>
                  <a href={proj.url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors" title="Open Vercel project">
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock size={10} /> Last deployed: {proj.lastDeployedAt}
              </div>
              <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer"
                className="block text-[11px] font-mono text-primary/80 hover:text-primary hover:underline truncate">
                {proj.liveUrl}
              </a>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Zap size={15} className="text-primary" /> Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {vercelTools.map((tool, i) => (
            <motion.a key={tool.label} href={tool.url} target="_blank" rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="card-glass p-3.5 hover:border-primary/20 group transition-all block">
              <div className="text-xl mb-2">{tool.icon}</div>
              <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{tool.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{tool.desc}</div>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
}
