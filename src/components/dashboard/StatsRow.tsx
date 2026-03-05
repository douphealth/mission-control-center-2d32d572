import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowUp, BarChart3, CheckSquare, TrendingUp, DollarSign } from 'lucide-react';

interface Stat { label: string; value: string | number; change: string; sub: string; Icon: any; isHero: boolean; accent: string; shadow: string; onClick: () => void; }

export function StatsRow({ stats }: { stats: Stat[] }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
                <motion.div key={s.label}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    onClick={s.onClick} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="relative overflow-hidden cursor-pointer p-7 flex flex-col gap-4 transition-all duration-300"
                    style={{ borderRadius: 24, background: s.isHero ? s.accent : 'hsl(var(--card))', boxShadow: s.isHero ? s.shadow : 'var(--shadow-sm)', border: s.isHero ? 'none' : '1px solid hsl(var(--border) / 0.4)', color: s.isHero ? 'white' : undefined }}>
                    {s.isHero && <>
                        <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -16, left: -16, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                    </>}
                    <div className="flex items-start justify-between">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.isHero ? 'bg-white/18' : 'bg-secondary/70'}`}>
                            <s.Icon size={17} className={s.isHero ? 'text-white' : 'text-muted-foreground/60'} />
                        </div>
                        <ArrowUpRight size={14} className={s.isHero ? 'text-white/60' : 'text-muted-foreground/30'} />
                    </div>
                    <div>
                        <motion.div className={`text-4xl font-extrabold tracking-tighter leading-none mb-2 tabular-nums ${s.isHero ? 'text-white' : 'text-foreground'}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: i * 0.07 + 0.2 }}>
                            {s.value}
                        </motion.div>
                        <div className={`text-[11px] font-semibold mb-1 ${s.isHero ? 'text-white/70' : 'text-muted-foreground/60'}`}>{s.label}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {s.change && (
                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isHero ? 'bg-white/20 text-white' : 'bg-success/12 text-success'}`}>
                                    <ArrowUp size={8} />{s.change}
                                </span>
                            )}
                            <span className={`text-[10px] ${s.isHero ? 'text-white/50' : 'text-muted-foreground/40'}`}>{s.sub}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
