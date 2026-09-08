import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Lenis from "lenis";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Compass,
  MapPin,
  ArrowRight,
  Sparkles,
  Activity,
  ArrowUpRight,
  ShieldAlert,
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

// --- SUBCOMPONENT: Claymorphic Team Card ---
function TeamCard({ name, regNo, role, focus, badge, faIcon, colorClass }: { name: string; regNo: string; role: string; focus: string; badge: string; faIcon: string; colorClass: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ y: hovered ? -8 : 0 }}
      className={`relative rounded-[32px] p-8 bg-white border-4 border-white shadow-[16px_16px_32px_rgba(0,0,0,0.06),inset_8px_8px_16px_rgba(255,255,255,1),inset_-8px_-8px_16px_rgba(0,0,0,0.02)] hover:shadow-[24px_24px_48px_rgba(0,0,0,0.1),inset_8px_8px_16px_rgba(255,255,255,1),inset_-8px_-8px_16px_rgba(0,0,0,0.03)] transition-all duration-500 overflow-hidden`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <div className={`flex size-14 items-center justify-center rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),4px_4px_12px_rgba(0,0,0,0.05)] ${colorClass} text-white`}>
            <i className={`${faIcon} text-2xl`} />
          </div>
          <span className="font-mono text-[10px] font-bold text-primary uppercase rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.5)]">
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

      {/* Background blobs for organic feel */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute top-[-10%] right-[-10%] size-[600px] rounded-full bg-orange-100/50 blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] size-[500px] rounded-full bg-emerald-100/50 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-6 z-50 mx-auto max-w-5xl px-4 sm:px-6">
        <nav className="flex items-center justify-between rounded-[24px] bg-white/80 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl border border-white">
          <Link to="/" className="flex items-center gap-3 pl-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-[4px_4px_12px_rgba(15,118,110,0.2),inset_4px_4px_8px_rgba(255,255,255,0.3)]">
              <i className="fa-solid fa-compass text-white text-xl" />
            </div>
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-primary">CivicLens</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/privacy" className="hidden sm:block px-4 py-2 font-mono text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link
              to="/"
              className="group flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-[6px_6px_15px_rgba(217,119,6,0.2),inset_4px_4px_8px_rgba(255,255,255,0.2)] hover:scale-[1.03] transition-all active:scale-95"
            >
              <i className="fa-solid fa-map-location-dot" />
              <span>Live Map</span>
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Narrative */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-20 sm:pt-32">
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-bold text-orange-600 shadow-[4px_4px_12px_rgba(0,0,0,0.04),inset_2px_2px_4px_rgba(0,0,0,0.02)] border border-orange-100"
          >
            <i className="fa-solid fa-wand-magic-sparkles animate-pulse" />
            <span className="tracking-widest uppercase">The Civic Transparency Manifesto</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-10 font-display text-6xl font-bold tracking-tight text-foreground sm:text-8xl leading-[0.95]"
          >
            Every citizen <br />
            <span className="italic text-primary drop-shadow-[2px_2px_0_rgba(15,118,110,0.1)]">
              deserves a mirror.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-10 max-w-2xl text-lg leading-relaxed text-muted-foreground font-medium sm:text-xl px-4"
          >
            Complaints without public visibility become complaints without consequences.
            Four engineering students from <strong className="text-primary underline decoration-orange-400/30 decoration-4 underline-offset-4">VIT Chennai</strong> building the open ledger India’s cities never had.
          </motion.p>
        </section>

        {/* Big Claymorphic CTA Section */}
        <section className="mt-20 flex justify-center px-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="w-full rounded-[48px] bg-white p-12 text-center shadow-[24px_24px_64px_rgba(0,0,0,0.06),inset_12px_12px_24px_rgba(255,255,255,1),inset_-12px_-12px_24px_rgba(0,0,0,0.02)] border-4 border-white"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="flex size-20 items-center justify-center rounded-3xl bg-orange-100 text-orange-600 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.05),4px_4px_12px_rgba(249,115,22,0.1)]">
                <i className="fa-solid fa-bullhorn text-3xl" />
              </div>
              <h2 className="font-display text-4xl font-bold text-foreground">Ready to take action?</h2>
              <p className="max-w-md text-muted-foreground font-medium">Join the network of thousands of Chennai residents holding their wards accountable in real-time.</p>
              <Link to="/">
                <Button size="lg" className="rounded-2xl h-16 px-10 text-lg font-bold bg-primary hover:bg-primary/90 shadow-[8px_8px_20px_rgba(15,118,110,0.2),inset_4px_4px_8px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
                  <i className="fa-solid fa-location-crosshairs mr-2" />
                  Explore the Live Map
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Metrics Section */}
        <section className="mt-32">
          <div className="px-4 border-l-8 border-orange-500 pl-6 mb-12">
            <span className="font-mono text-xs font-black tracking-[0.2em] text-orange-600 uppercase">The Crisis</span>
            <h2 className="mt-2 font-display text-4xl font-bold text-foreground sm:text-5xl">The scale we are up against</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 px-2">
            {[
              { icon: "fa-users", val: 1, suff: " Crore+", label: "Chennai Residents", desc: "Across 200 wards with zero unified public visibility.", col: "bg-primary" },
              { icon: "fa-star-half-stroke", val: 1.9, decimals: 1, suff: " ★", label: "Namma Chennai", desc: "Current rating due to lack of photo-evidence transparency.", col: "bg-destructive" },
              { icon: "fa-person-walking-arrow-right", val: 96, suff: "%", label: "Non-Adoption", desc: "Citizens who drop off due to mandatory login walls.", col: "bg-orange-500" },
              { icon: "fa-indian-rupee-sign", val: 2, suff: " Lakh Cr", label: "Smart Cities", desc: "Funding spent with minimal street-level verification.", col: "bg-teal-600" }
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-[32px] bg-white p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.05),inset_8px_8px_16px_rgba(255,255,255,1)] border border-white"
              >
                <div className={`flex size-12 items-center justify-center rounded-2xl ${m.col} text-white shadow-lg mb-6`}>
                  <i className={`fa-solid ${m.icon} text-xl`} />
                </div>
                <div className="font-display text-4xl font-black text-foreground">
                  <AnimatedCounter value={m.val} suffix={m.suff} decimals={m.decimals ?? 0} />
                </div>
                <p className="mt-4 font-extrabold text-xs text-foreground uppercase tracking-widest">{m.label}</p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed font-medium">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Commitments Section */}
        <section className="mt-40 bg-black rounded-[64px] p-12 sm:p-20 text-white shadow-[24px_24px_64px_rgba(0,0,0,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <i className="fa-solid fa-shield-halved text-[120px] text-orange-500" />
          </div>
          <div className="relative z-10">
            <span className="font-mono text-xs font-bold tracking-[0.3em] text-orange-400 uppercase">Non-Negotiable</span>
            <h2 className="mt-4 font-display text-5xl font-bold sm:text-7xl leading-tight">The Architecture of Trust</h2>

            <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
              {[
                { i: "fa-eye", t: "Radical Transparency", d: "Every report is a public permanent record. No administrative black holes." },
                { i: "fa-bolt", t: "Zero Barriers", d: "No OTP, no passwords, no app store downloads. Action in 30 seconds." },
                { i: "fa-user-shield", t: "Privacy by Design", d: "Zero-PII storage. We collect hazard data, not your personal life." },
                { i: "fa-handshake-angle", t: "Community Truth", d: "Verification by neighbors ensures data integrity and collective weight." }
              ].map((c, i) => (
                <div key={i} className="flex gap-6">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.1)]">
                    <i className={`fa-solid ${c.i} text-2xl text-orange-400`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{c.t}</h3>
                    <p className="mt-2 text-zinc-400 leading-relaxed font-medium">{c.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Builders */}
        <section className="mt-40">
          <div className="text-center mb-16">
            <div className="inline-flex size-16 items-center justify-center rounded-3xl bg-primary shadow-lg mb-6">
              <i className="fa-solid fa-code text-white text-2xl" />
            </div>
            <h2 className="font-display text-5xl font-bold text-foreground sm:text-6xl">The Engineering Team</h2>
            <p className="mt-4 text-muted-foreground font-medium max-w-xl mx-auto uppercase tracking-widest text-xs">VIT Chennai Undergraduate Engineering Prototype</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 px-2">
            <TeamCard name="Karwin S.C" regNo="25BCE1682" role="Frontend & GIS" focus="Lead UI architecture, Leaflet clustering, and GeoJSON systems." badge="Architect" faIcon="fa-laptop-code" colorClass="bg-primary" />
            <TeamCard name="Adhavan" regNo="25BCE1144" role="Backend & DB" focus="Supabase PostgreSQL integration, Edge functions, and RLS security." badge="Data" faIcon="fa-server" colorClass="bg-orange-500" />
            <TeamCard name="Aryan Nama" regNo="25MID1157" role="Strategy & Research" focus="SLA metric design, ward boundary mapping, and civic policy logic." badge="Strategy" faIcon="fa-brain" colorClass="bg-teal-700" />
            <TeamCard name="Arjith" regNo="25BEC1209" role="Design & UX" focus="Visual systems, accessibility, and high-conversion mobile flows." badge="Product" faIcon="fa-palette" colorClass="bg-orange-600" />
          </div>
        </section>

        {/* Disclaimer Claymorphic Box */}
        <div className="mt-32 rounded-[32px] bg-orange-50 p-10 border-4 border-white shadow-[12px_12px_24px_rgba(0,0,0,0.03),inset_8px_8px_16px_rgba(255,255,255,1)]">
          <div className="flex items-start gap-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-200">
              <i className="fa-solid fa-triangle-exclamation text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-orange-950 uppercase tracking-tight">Independent Student Project</h4>
              <p className="mt-2 text-sm text-orange-900/70 leading-relaxed font-medium">
                CivicLens is a student-led initiative from VIT Chennai. It is not affiliated with the Greater Chennai Corporation (GCC).
                The platform is designed to facilitate civic engagement through open data and community accountability.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-40 border-t border-secondary/50 pt-16 px-6">
        <div className="mx-auto max-w-5xl flex flex-col items-center gap-10">
          <div className="flex items-center gap-3">
             <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
                <i className="fa-solid fa-shield-heart text-2xl" />
             </div>
             <span className="font-display text-3xl font-bold tracking-tight text-primary">CivicLens</span>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              { to: "/", l: "Live Map", i: "fa-map" },
              { to: "/ward", l: "Ward View", i: "fa-building" },
              { to: "/privacy", l: "Privacy", i: "fa-lock" }
            ].map(link => (
              <Link key={link.to} to={link.to} className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                <i className={`fa-solid ${link.i}`} />
                {link.l}
              </Link>
            ))}
          </div>

          <div className="flex gap-6 opacity-40">
             <i className="fa-brands fa-github text-xl hover:opacity-100 cursor-pointer" />
             <i className="fa-brands fa-x-twitter text-xl hover:opacity-100 cursor-pointer" />
             <i className="fa-brands fa-linkedin text-xl hover:opacity-100 cursor-pointer" />
          </div>

          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-10 text-center">
            Built with <i className="fa-solid fa-heart text-destructive mx-1" /> for a better Chennai
          </p>
        </div>
      </footer>
    </div>
  );
}
