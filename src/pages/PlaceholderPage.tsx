import { motion } from "framer-motion";
import { Construction } from "lucide-react";

const sectionNames: Record<string, { title: string; emoji: string; desc: string }> = {
  seo: { title: "SEO Command Center", emoji: "🔍", desc: "Google Search Console, Bing Webmaster Tools, and SEO analytics — coming soon." },
  cloudflare: { title: "Cloudflare", emoji: "☁️", desc: "Manage DNS, security, Pages deployments, and system status — coming soon." },
  vercel: { title: "Vercel Deployments", emoji: "🚀", desc: "Monitor all Vercel projects and deployments — coming soon." },
  openclaw: { title: "OpenClaw", emoji: "🐙", desc: "Track and monitor OpenClaw services — coming soon." },
};

export default function PlaceholderPage({ sectionId }: { sectionId: string }) {
  const info = sectionNames[sectionId] || { title: sectionId, emoji: "🔧", desc: "This section is under construction." };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="text-6xl mb-4">{info.emoji}</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{info.title}</h1>
        <p className="text-muted-foreground max-w-md">{info.desc}</p>
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Construction size={16} />
          <span>Under construction</span>
        </div>
      </motion.div>
    </div>
  );
}
