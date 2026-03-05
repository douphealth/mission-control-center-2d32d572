import { useDashboard } from "@/contexts/DashboardContext";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Cloud, Globe, Shield, Zap, Plus, ExternalLink, Copy,
  CheckCircle2, AlertTriangle, BarChart3, RefreshCw, Lock, Wifi, Activity
} from "lucide-react";
import { toast } from "sonner";
import FormModal, { FormField, FormInput } from "@/components/FormModal";

interface CloudflareZone {
  id: string;
  name: string;
  status: "active" | "pending" | "paused" | "deactivated";
  plan: string;
  nameservers: string[];
  credentialId?: string;
}

const sampleZones: CloudflareZone[] = [
  { id: "z1", name: "agency-demo.com", status: "active", plan: "Pro", nameservers: ["ns1.cloudflare.com", "ns2.cloudflare.com"] },
  { id: "z2", name: "fashion-store.com", status: "active", plan: "Free", nameservers: ["ns1.cloudflare.com", "ns2.cloudflare.com"] },
  { id: "z3", name: "saas-product.io", status: "active", plan: "Free", nameservers: ["ns1.cloudflare.com", "ns2.cloudflare.com"] },
  { id: "z4", name: "techinsights-blog.com", status: "active", plan: "Free", nameservers: ["ns1.cloudflare.com", "ns2.cloudflare.com"] },
];

const cfTools = [
  { label: "Cloudflare Dashboard", url: "https://dash.cloudflare.com", icon: "☁️", desc: "Main account & zone management" },
  { label: "DNS Management", url: "https://dash.cloudflare.com/?to=/:account/:zone/dns/records", icon: "🌐", desc: "Manage DNS records" },
  { label: "SSL/TLS Settings", url: "https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls", icon: "🔒", desc: "HTTPS & certificate config" },
  { label: "Firewall Rules", url: "https://dash.cloudflare.com/?to=/:account/:zone/security/waf", icon: "🛡️", desc: "Firewall & security rules" },
  { label: "Page Rules", url: "https://dash.cloudflare.com/?to=/:account/:zone/rules/page-rules", icon: "📋", desc: "URL redirects & caching" },
  { label: "Analytics", url: "https://dash.cloudflare.com/?to=/:account/:zone/analytics", icon: "📊", desc: "Traffic & bandwidth stats" },
  { label: "Workers", url: "https://dash.cloudflare.com/?to=/:account/workers", icon: "⚡", desc: "Edge computing & serverless" },
  { label: "Pages", url: "https://dash.cloudflare.com/?to=/:account/pages", icon: "🚀", desc: "Static site deployments" },
  { label: "R2 Storage", url: "https://dash.cloudflare.com/?to=/:account/r2", icon: "📦", desc: "Object storage, S3-compatible" },
  { label: "Turnstile", url: "https://dash.cloudflare.com/?to=/:account/turnstile", icon: "🤖", desc: "CAPTCHA alternative" },
  { label: "Status Page", url: "https://www.cloudflarestatus.com", icon: "💚", desc: "Cloudflare system status" },
  { label: "API Docs", url: "https://developers.cloudflare.com/api", icon: "📖", desc: "Cloudflare API reference" },
];

function StatusDot({ status }: { status: CloudflareZone["status"] }) {
  const map = { active: "bg-emerald-500", pending: "bg-amber-500", paused: "bg-zinc-400", deactivated: "bg-red-500" };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status]}`} />;
}

export default function CloudflarePage() {
  const { credentials } = useDashboard();
  const [zones] = useState<CloudflareZone[]>(sampleZones);
  const cfCreds = credentials.filter(c => c.service.toLowerCase().includes("cloudflare") || c.label.toLowerCase().includes("cloudflare"));

  const copyNs = (ns: string) => {
    navigator.clipboard.writeText(ns);
    toast.success("Nameserver copied");
  };

  const openZone = (zoneName: string) => {
    window.open(`https://dash.cloudflare.com/?to=/:account/${zoneName}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cloud size={22} className="text-orange-500" /> Cloudflare
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            DNS, security, Workers, and CDN — all in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://www.cloudflarestatus.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 transition-colors">
            <Activity size={12} className="animate-pulse" /> System Status
          </a>
          <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">
            Open Dashboard <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Zones", value: zones.filter(z => z.status === "active").length, icon: Globe, color: "text-blue-500 bg-blue-500/10" },
          { label: "Pro Zones", value: zones.filter(z => z.plan === "Pro").length, icon: Zap, color: "text-amber-500 bg-amber-500/10" },
          { label: "Saved Credentials", value: cfCreds.length, icon: Lock, color: "text-violet-500 bg-violet-500/10" },
          { label: "Total Domains", value: zones.length, icon: Cloud, color: "text-emerald-500 bg-emerald-500/10" },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zones list */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Globe size={15} className="text-primary" /> DNS Zones
          </h2>
          <div className="space-y-2">
            {zones.map((zone, i) => (
              <motion.div key={zone.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="card-elevated p-4 flex items-center gap-4 group cursor-pointer hover:border-primary/20"
                onClick={() => openZone(zone.name)}>
                <StatusDot status={zone.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{zone.name}</span>
                    <span className={`badge ${zone.plan === "Pro" ? "badge-primary" : "badge-muted"}`}>{zone.plan}</span>
                    <span className={`badge ${zone.status === "active" ? "badge-success" : "badge-warning"} capitalize`}>{zone.status}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                    ns: {zone.nameservers.join(" / ")}
                    <button className="ml-2 hover:text-foreground transition-colors" onClick={e => { e.stopPropagation(); copyNs(zone.nameservers.join("\n")); }}>
                      <Copy size={9} />
                    </button>
                  </div>
                </div>
                <ExternalLink size={13} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground px-1">
            💡 Tip: Add your sites to the <strong>Websites</strong> section and link Cloudflare credentials for auto-population.
          </p>
        </div>

        {/* Saved credentials */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Lock size={15} className="text-primary" /> Saved Accounts
          </h2>
          {cfCreds.length > 0 ? cfCreds.map(cred => (
            <div key={cred.id} className="card-glass p-3 space-y-1.5">
              <div className="text-sm font-semibold text-foreground">{cred.label}</div>
              <div className="text-xs text-muted-foreground truncate">{cred.username}</div>
              {cred.url && (
                <a href={cred.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  Open <ExternalLink size={9} />
                </a>
              )}
            </div>
          )) : (
            <div className="card-glass p-4 text-center text-muted-foreground text-sm">
              <Lock size={20} className="mx-auto mb-2 opacity-40" />
              <div>No Cloudflare credentials saved</div>
              <div className="text-xs mt-1">Add them in <strong>Credential Vault</strong></div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Zap size={15} className="text-primary" /> Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cfTools.map((tool, i) => (
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
