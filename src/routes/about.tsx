import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { motion, useInView } from "framer-motion";
import {
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

// --- SUBCOMPONENT: Animated Counter ---
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!isInView) return undefined;
    let start: number | null = null;
    let fId: number;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 2000, 1);
      const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(ease * value);
      if (p < 1) fId = requestAnimationFrame(step);
    };
    fId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(fId);
  }, [isInView, value]);

  return <span ref={ref} className="font-mono tabular-nums">{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

// --- SUBCOMPONENT: Claymorphic Card ---
function DetailCard({ icon, title, description, colorClass, delay = 0 }: { icon: string, title: string, description: string, colorClass: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="relative rounded-[32px] p-8 bg-white border-4 border-white shadow-[12px_12px_24px_rgba(0,0,0,0.04),inset_8px_8px_16px_rgba(255,255,255,1)] group hover:shadow-[20px_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500"
    >
      <div className={`flex size-14 items-center justify-center rounded-2xl shadow-lg ${colorClass} text-white mb-6 group-hover:scale-110 transition-transform`}>
        <i className={`fa-solid ${icon} text-2xl`} />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground font-medium">{description}</p>
    </motion.div>
  );
}

// --- SUBCOMPONENT: Claymorphic Team Card ---
function TeamCard({ name, regNo, role, focus, badge, faIcon, colorClass }: { name: string; regNo: string; role: string; focus: string; badge: string; faIcon: string; colorClass: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ y: hovered ? -8 : 0 }}
      className={`relative rounded-[32px] p-8 bg-white border-4 border-white shadow-[16px_16px_32px_rgba(0,0,0,0.06),inset_8px_8px_16px_rgba(255,255,255,1),inset_-8px_-8px_16px_rgba(0,0,0,0.02)] hover:shadow-[24px_24px_48px_rgba(0,0,0,0.1)] transition-all duration-500`}
    >
      <div className="relative z-10 flex flex-col h-full text-left">
        <div className="flex items-center justify-between">
          <div className={`flex size-14 items-center justify-center rounded-2xl shadow-lg ${colorClass} text-white`}>
            <i className={`${faIcon} text-2xl`} />
          </div>
          <span className="font-mono text-[10px] font-bold text-primary uppercase rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20">
            {badge}
          </span>
        </div>
        <div className="mt-8">
          <h3 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{name}</h3>
          <p className="font-mono text-xs text-muted-foreground mt-1 opacity-70">{regNo}</p>
        </div>
        <div className="mt-8 border-t border-secondary/50 pt-6">
          <p className="text-xs font-extrabold text-foreground uppercase tracking-widest">{role}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-medium">{focus}</p>
        </div>
      </div>
    </motion.div>
  );
}

// --- MAIN ABOUT PAGE COMPONENT ---
export default function AboutPage() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-foreground selection:bg-orange-500/30 selection:text-orange-950 font-sans pb-20">

      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute top-[-10%] right-[-10%] size-[600px] rounded-full bg-orange-100/50 blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] size-[500px] rounded-full bg-emerald-100/50 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-6 z-50 mx-auto max-w-5xl px-4 sm:px-6">
        <nav className="flex items-center justify-between rounded-[24px] bg-white/80 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.05)] backdrop-blur-xl border border-white">
          <Link to="/" className="flex items-center gap-3 pl-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-lg">
              <i className="fa-solid fa-compass text-white text-xl" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-primary">CivicLens</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/privacy" className="hidden sm:block px-4 py-2 font-mono text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/" className="group flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-lg hover:scale-[1.03] transition-all">
              <i className="fa-solid fa-map-location-dot" />
              <span>Live Map</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-20 sm:pt-32">
        {/* HERO */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-bold text-orange-600 shadow-sm border border-orange-100"
          >
            <i className="fa-solid fa-wand-magic-sparkles animate-pulse" />
            <span className="tracking-widest uppercase">Radical Transparency for Indian Cities</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-10 font-display text-6xl font-bold tracking-tight text-foreground sm:text-8xl leading-[0.95]"
          >
            "The government built a <br />
            <span className="italic text-primary">complaint box.</span> <br />
            We built a mirror."
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-10 max-w-3xl text-lg leading-relaxed text-muted-foreground font-medium sm:text-xl"
          >
            CivicLens is a web-first <strong>Public Transparency Layer</strong> that publishes every pothole, sewage leak, and broken streetlight on a live public map.
            We don't wait for permission to hold officials accountable.
          </motion.p>
        </section>

        {/* THE CRISIS (Metrics) */}
        <section className="mt-32">
          <div className="px-4 border-l-8 border-orange-500 pl-6 mb-12">
            <span className="font-mono text-xs font-black tracking-[0.2em] text-orange-600 uppercase">The Structural Failure</span>
            <h2 className="mt-2 font-display text-4xl font-bold text-foreground sm:text-5xl">Why existing portals fail</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 px-2">
            {[
              { icon: "fa-eye-slash", val: 1, suff: " Crore+", label: "Hidden Issues", desc: "Citizens cannot see neighboring complaints, shielding systemic failure.", col: "bg-primary" },
              { icon: "fa-camera-rotate", val: 1.9, decimals: 1, suff: " ★", label: "Fake Closures", desc: "Tickets are closed with old/unrelated photos before SLAs expire.", col: "bg-destructive" },
              { icon: "fa-user-lock", val: 96, suff: "%", label: "Digital Divide", desc: "Complex OTP gates and app downloads restrict usage to only 4%.", col: "bg-orange-500" },
              { icon: "fa-money-bill-trend-up", val: 2, suff: " Lakh Cr", label: "Zero Audit", desc: "Smart Cities funding spent with no real street-level accountability.", col: "bg-teal-600" }
            ].map((m, i) => (
              <motion.div key={i} transition={{ delay: i * 0.1 }} className="rounded-[32px] bg-white p-8 shadow-sm border border-white">
                <div className={`flex size-12 items-center justify-center rounded-2xl ${m.col} text-white shadow-lg mb-6`}><i className={`fa-solid ${m.icon} text-xl`} /></div>
                <div className="font-display text-4xl font-black text-foreground"><AnimatedCounter value={m.val} suffix={m.suff} decimals={m.decimals ?? 0} /></div>
                <p className="mt-4 font-extrabold text-xs text-foreground uppercase tracking-widest">{m.label}</p>
                <p className="mt-2 text-xs text-muted-foreground font-medium">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-40">
          <div className="text-center mb-16">
             <span className="font-mono text-xs font-black tracking-[0.2em] text-primary uppercase">The CivicLens Protocol</span>
             <h2 className="mt-4 font-display text-5xl font-bold text-foreground">How we fix accountability</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
             <DetailCard
                icon="fa-location-crosshairs"
                title="Geotagged Filing"
                description="Instant, zero-PII filing. We read camera EXIF metadata to verify coordinates and timestamps automatically."
                colorClass="bg-orange-500"
                delay={0}
             />
             <DetailCard
                icon="fa-robot"
                title="AI Vision Intake"
                description="Google Gemini AI analyzes photos to filter out memes or indoor shots and auto-populates complaint categories."
                colorClass="bg-primary"
                delay={0.1}
             />
             <DetailCard
                icon="fa-users-viewfinder"
                title="Community Audit"
                description="Neighbors verify if a fix is real. 2 negative flags reopen a ticket with a 'Resolution Fraud' banner."
                colorClass="bg-teal-600"
                delay={0.2}
             />
          </div>
        </section>

        {/* KEY FEATURES BENTO */}
        <section className="mt-40 bg-black rounded-[64px] p-12 sm:p-20 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><i className="fa-solid fa-layer-group text-[200px] text-white" /></div>
          <div className="relative z-10">
            <span className="font-mono text-xs font-bold tracking-[0.3em] text-orange-400 uppercase">Core Architecture</span>
            <h2 className="mt-4 font-display text-5xl font-bold sm:text-7xl leading-tight">Radical by Design</h2>
            <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
              <div className="flex gap-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><i className="fa-solid fa-map text-2xl text-orange-400" /></div>
                <div>
                  <h3 className="text-xl font-bold">OpenStreetMap Integration</h3>
                  <p className="mt-2 text-zinc-400 leading-relaxed font-medium">No proprietary API keys. Completely free, open-source tile layers powered by Leaflet.js for unlimited city scaling.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><i className="fa-solid fa-user-secret text-2xl text-orange-400" /></div>
                <div>
                  <h3 className="text-xl font-bold">Zero-PII Privacy</h3>
                  <p className="mt-2 text-zinc-400 leading-relaxed font-medium">No phone numbers stored. Field staff see only GPS and category data, protecting citizens from intimidation or pressure.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><i className="fa-solid fa-bolt text-2xl text-orange-400" /></div>
                <div>
                  <h3 className="text-xl font-bold">Realtime WebSockets</h3>
                  <p className="mt-2 text-zinc-400 leading-relaxed font-medium">Powered by Supabase Realtime—filings on one device instantly drop pins on all open maps globally without page refreshes.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><i className="fa-solid fa-ranking-star text-2xl text-orange-400" /></div>
                <div>
                  <h3 className="text-xl font-bold">Political Accountability</h3>
                  <p className="mt-2 text-zinc-400 leading-relaxed font-medium">A live leaderboard ranking Chennai's 15 zones. We highlight failing wards first to drive political pressure for resolution.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="mt-40">
           <div className="px-4 border-l-8 border-teal-600 pl-6 mb-12">
              <span className="font-mono text-xs font-black tracking-[0.2em] text-teal-700 uppercase">The Evolution</span>
              <h2 className="mt-2 font-display text-4xl font-bold text-foreground sm:text-5xl">Roadmap to 400M Citizens</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
              <div className="rounded-[40px] bg-white p-10 shadow-sm border border-white">
                 <div className="flex items-center gap-3 mb-6">
                    <span className="bg-emerald-500 text-white font-mono text-[10px] font-black px-2 py-1 rounded">PHASE 1</span>
                    <h3 className="font-bold text-xl text-primary">Public Mirror (Current)</h3>
                 </div>
                 <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                    <li><i className="fa-solid fa-check text-emerald-500 mr-2" /> Real-time Interactive Map</li>
                    <li><i className="fa-solid fa-check text-emerald-500 mr-2" /> Zero-PII Anonymous Filing</li>
                    <li><i className="fa-solid fa-check text-emerald-500 mr-2" /> Gemini AI Vision Verification</li>
                    <li><i className="fa-solid fa-check text-emerald-500 mr-2" /> Ward Performance Dashboard</li>
                    <li><i className="fa-solid fa-check text-emerald-500 mr-2" /> One-Click Audit PDF Generator</li>
                 </ul>
              </div>
              <div className="rounded-[40px] bg-emerald-50 p-10 border-4 border-white shadow-lg">
                 <div className="flex items-center gap-3 mb-6">
                    <span className="bg-orange-500 text-white font-mono text-[10px] font-black px-2 py-1 rounded">PHASE 2</span>
                    <h3 className="font-bold text-xl text-orange-950">Official Integration</h3>
                 </div>
                 <ul className="space-y-4 text-sm font-medium text-orange-900/70">
                    <li><i className="fa-solid fa-clock text-orange-500 mr-2" /> Geofenced Zonal Ticket Routing</li>
                    <li><i className="fa-solid fa-clock text-orange-500 mr-2" /> WhatsApp Submission Bridge</li>
                    <li><i className="fa-solid fa-clock text-orange-500 mr-2" /> Multi-language support (Tamil)</li>
                    <li><i className="fa-solid fa-clock text-orange-500 mr-2" /> Automated Council Digest Emails</li>
                    <li><i className="fa-solid fa-clock text-orange-500 mr-2" /> Smart AI Duplicate Clustering</li>
                 </ul>
              </div>
           </div>
        </section>

        {/* TEAM */}
        <section className="mt-40">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl font-bold text-foreground">The Architects</h2>
            <p className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs">VIT Chennai Undergraduate Engineering Team</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 px-2">
            <TeamCard name="Karwin S.C" regNo="25BCE1682" role="Frontend & GIS" focus="Lead UI architecture, Leaflet clustering, and GeoJSON systems." badge="Architect" faIcon="fa-laptop-code" colorClass="bg-primary" />
            <TeamCard name="Adhavan" regNo="25BCE1144" role="Backend & DB" focus="Supabase PostgreSQL integration, Edge functions, and RLS security." badge="Data" faIcon="fa-server" colorClass="bg-orange-500" />
            <TeamCard name="Aryan Nama" regNo="25MID1157" role="Strategy & Research" focus="SLA metric design, ward boundary mapping, and civic policy logic." badge="Strategy" faIcon="fa-brain" colorClass="bg-teal-700" />
            <TeamCard name="Arjith" regNo="25BEC1209" role="Design & UX" focus="Visual systems, accessibility, and high-conversion mobile flows." badge="Product" faIcon="fa-palette" colorClass="bg-orange-600" />
          </div>
        </section>

        {/* DISCLAIMER */}
        <div className="mt-32 rounded-[32px] bg-orange-50 p-10 border-4 border-white shadow-sm">
          <div className="flex items-start gap-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg"><i className="fa-solid fa-triangle-exclamation" /></div>
            <div>
              <h4 className="text-lg font-bold text-orange-950 uppercase tracking-tight">Independent Student Project</h4>
              <p className="mt-2 text-sm text-orange-900/70 leading-relaxed font-medium">CivicLens is a student-led initiative from VIT Chennai. It is not affiliated with the Greater Chennai Corporation (GCC). The platform is designed to facilitate civic engagement through open data and community accountability.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-40 border-t border-secondary/50 pt-16 px-6">
        <div className="mx-auto max-w-5xl flex flex-col items-center gap-10">
          <div className="flex items-center gap-3">
             <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg"><i className="fa-solid fa-shield-heart text-2xl" /></div>
             <span className="font-display text-3xl font-bold tracking-tight text-primary">CivicLens</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[ { to: "/", l: "Live Map", i: "fa-map" }, { to: "/ward", l: "Ward View", i: "fa-building" }, { to: "/privacy", l: "Privacy", i: "fa-lock" } ].map(link => (
              <Link key={link.to} to={link.to} className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                <i className={`fa-solid ${link.i}`} /> {link.l}
              </Link>
            ))}
          </div>
          <div className="flex gap-6 opacity-40">
             <i className="fa-brands fa-github text-xl hover:opacity-100 cursor-pointer" />
             <i className="fa-brands fa-x-twitter text-xl hover:opacity-100 cursor-pointer" />
             <i className="fa-brands fa-linkedin text-xl hover:opacity-100 cursor-pointer" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-10 text-center">Built with <i className="fa-solid fa-heart text-destructive mx-1" /> for a better Chennai</p>
        </div>
      </footer>
    </div>
  );
}
