import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValue, animate } from "framer-motion";
import Lenis from "lenis";
import { ArrowLeft, Check, ChevronRight, Github, Globe, Linkedin, ShieldCheck, Twitter } from "lucide-react";
import { CivicSphere } from "@/components/about/CivicSphere";
import { CustomCursor } from "@/components/about/CustomCursor";
import { Button } from "@/components/ui/button";

// Data from original file
const priorities = [
  {
    number: "01",
    title: "Radical Transparency",
    description: "Every complaint is public. Every ward is scored. No administrative black holes.",
  },
  {
    number: "02",
    title: "Citizen Privacy First",
    description: "Zero-PII architecture. No phone numbers or OTPs. We protect your identity while publishing the truth.",
  },
  {
    number: "03",
    title: "Zero Barriers",
    description: "Instant filing from any browser. No app downloads or complex onboarding to slow down civic action.",
  },
  {
    number: "04",
    title: "Community Truth",
    description: "Neighbours verify each other's reports. This decentralized audit adds public weight to every pin.",
  },
  {
    number: "05",
    title: "Open Infrastructure",
    description: "Built on low-cost, scalable tech. Designed to mirror local governance across every Indian city.",
  },
];

const team = [
  { name: "Karwin S.C", id: "25BCE1682", role: "Frontend & Maps Architecture", github: "#", linkedin: "#" },
  { name: "Adhavan", id: "25BCE1144", role: "Backend & Database Infrastructure", github: "#", linkedin: "#" },
  { name: "Aryan Nama", id: "25MID1157", role: "Research & Municipal Strategy", github: "#", linkedin: "#" },
  { name: "Arjith", id: "25BEC1209", role: "Design Systems & UX Architecture", github: "#", linkedin: "#" },
];

const nextSteps = [
  "AI duplicate clustering (geospatial grouping)",
  "WhatsApp submission bridge",
  "Tamil (தமிழ்) vernacular UI layer",
  "Open REST API for civic researchers",
  "Automated council digest emails",
];

const metrics = [
  { value: 10000000, suffix: "+", label: "Chennai citizens with no public visibility", prefix: "" },
  { value: 1.9, suffix: "★", label: "Official Namma Chennai app rating (iOS)", prefix: "" },
  { value: 96, suffix: "%", label: "Residents who do not use the official app", prefix: "" },
  { value: 200000, suffix: "Cr", label: "Smart Cities Budget with zero ward transparency", prefix: "₹" },
];

function Counter({ value, suffix, prefix }: { value: number; suffix: string, prefix: string }) {
  const nodeRef = useRef(null);
  const isInView = useInView(nodeRef, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate(latest) {
          setDisplayValue(latest);
        },
      });
      return () => controls.stop();
    }
    return undefined;
  }, [value, isInView]);

  return (
    <span ref={nodeRef}>
      {prefix}{value % 1 === 0 ? Math.floor(displayValue).toLocaleString() : displayValue.toFixed(1)}{suffix}
    </span>
  );
}

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#09090b] text-zinc-100 selection:bg-teal-500/30 selection:text-teal-200 overflow-x-hidden">
      <CustomCursor />

      {/* 2. Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center lg:px-12">
        <CivicSphere />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="z-10"
        >
          <span className="mb-6 inline-block font-mono text-[10px] font-bold tracking-[0.3em] text-teal-400 uppercase">
            [ 25BCE1682 · 25BCE1144 · 25MID1157 · 25BEC1209 ]
          </span>
          <h1 className="max-w-5xl font-display text-6xl leading-[0.9] font-bold tracking-tight text-zinc-50 sm:text-8xl lg:text-[10rem]">
            Every citizen deserves a mirror.
          </h1>
          <p className="mx-auto mt-10 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-xl">
            Complaints without visibility become complaints without consequences. We are four second-year students from VIT Chennai building the transparency layer India's cities never had.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link to="/">
              <Button
                size="lg"
                data-cursor="hover"
                className="group relative h-14 overflow-hidden rounded-full bg-teal-500 px-8 text-zinc-950 hover:bg-teal-400 transition-colors duration-300"
              >
                <span className="relative z-10 font-bold">Go to Live Map</span>
                <div className="absolute inset-0 z-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              data-cursor="hover"
              className="h-14 rounded-full border-zinc-800 bg-transparent px-8 text-zinc-100 hover:bg-zinc-900 transition-colors"
              onClick={() => {
                document.getElementById('metrics')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Read our mission
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">Scroll to explore</span>
            <div className="h-12 w-[1px] bg-gradient-to-b from-teal-500/50 to-transparent" />
          </div>
        </motion.div>
      </section>

      {/* 3. Metrics Section */}
      <section id="metrics" className="relative border-y border-zinc-900 py-32 lg:py-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="mb-20">
            <span className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">The Ground Reality</span>
            <h2 className="mt-4 font-display text-4xl font-bold text-zinc-50 sm:text-6xl">The scale we're up against.</h2>
          </div>

          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col gap-4 border-l border-zinc-800 pl-6"
              >
                <div className="font-display text-5xl font-bold text-teal-400">
                  <Counter value={metric.value} suffix={metric.suffix} prefix={metric.prefix} />
                </div>
                <p className="text-sm leading-relaxed text-zinc-500">{metric.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Pillars Section */}
      <section className="relative py-32 lg:py-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="mb-24 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">Core Values</span>
              <h2 className="mt-4 font-display text-5xl font-bold text-zinc-50 sm:text-7xl">Engineered for radical accountability.</h2>
            </div>
            <p className="max-w-sm text-zinc-500">
              CivicLens is not a portal; it is a mirrors. Every design choice is optimized to ensure visibility leads to action.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-900 lg:grid-cols-5">
            {priorities.map((pillar, i) => (
              <motion.div
                key={pillar.number}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative flex flex-col justify-between bg-[#09090b] p-8 lg:p-10 transition-colors hover:bg-zinc-900/50"
                data-cursor="hover"
              >
                <div>
                  <span className="font-display text-5xl font-bold text-teal-500/20 group-hover:text-teal-500 transition-colors">
                    {pillar.number}
                  </span>
                  <h3 className="mt-8 font-display text-2xl font-bold text-zinc-100">{pillar.title}</h3>
                </div>
                <p className="mt-12 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Builders Section */}
      <section className="relative bg-zinc-900/30 py-32 lg:py-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="mb-24">
            <span className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">The Architects</span>
            <h2 className="mt-4 font-display text-5xl font-bold text-zinc-50 sm:text-7xl">Student-built, city-scale.</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#09090b] p-8 transition-all hover:border-teal-500/50"
                data-cursor="hover"
              >
                <div className="absolute top-0 left-0 h-1 w-0 bg-teal-500 group-hover:w-full transition-all duration-500" />
                <div className="mb-12 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-teal-400 group-hover:bg-teal-500 group-hover:text-zinc-950 transition-colors">
                  <Globe className="size-6" />
                </div>
                <h3 className="font-display text-2xl font-bold text-zinc-50">{member.name}</h3>
                <span className="mt-1 font-mono text-[10px] text-zinc-600 uppercase tracking-widest">{member.id}</span>
                <p className="mt-6 text-sm italic text-teal-400/80 leading-relaxed">{member.role}</p>

                <div className="mt-12 flex gap-4">
                   <a href={member.github} className="text-zinc-600 hover:text-zinc-100 transition-colors"><Github className="size-4" /></a>
                   <a href={member.linkedin} className="text-zinc-600 hover:text-zinc-100 transition-colors"><Linkedin className="size-4" /></a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Roadmap Section */}
      <section className="relative py-32 lg:py-48">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-32">
            <div>
              <span className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">The Lineage</span>
              <h2 className="mt-6 font-display text-4xl font-bold text-zinc-50 sm:text-6xl">India's turn.</h2>
              <p className="mt-10 text-base leading-relaxed text-zinc-400 sm:text-lg">
                Built in the spirit of <strong>FixMyStreet UK</strong> (citizen-built in 2008, government-adopted in 2013) and <strong>NYC 311</strong> (saves $300M annually). We are not waiting for permission to innovate.
              </p>

              <div className="mt-12 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6 backdrop-blur-sm">
                <div className="flex gap-4">
                  <ShieldCheck className="size-8 shrink-0 text-teal-500" />
                  <div>
                    <h4 className="font-bold text-teal-100">Student Project Disclaimer</h4>
                    <p className="mt-2 text-sm text-teal-400/60 leading-relaxed">
                      This is an independent prototype developed during a 24-hour hackathon. We are not officially affiliated with GCC, but we believe in the data we collect.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <span className="text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">Roadmap v1.0</span>
              <div className="flex flex-col gap-4">
                {nextSteps.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4 rounded-xl border border-zinc-900 bg-zinc-900/50 p-6 transition-all hover:bg-zinc-900 group"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-teal-500/10 text-teal-500 group-hover:bg-teal-500 group-hover:text-zinc-950 transition-colors">
                      <Check className="size-4" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{step}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-zinc-900 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 lg:flex-row lg:px-12">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-500 text-zinc-950">
              <ShieldCheck className="size-4" />
            </div>
            CivicLens
          </div>

          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <Link to="/" data-cursor="hover" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-teal-400 transition-colors">Live Map</Link>
            <Link to="/ward" data-cursor="hover" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-teal-400 transition-colors">Ward View</Link>
            <Link to="/privacy" data-cursor="hover" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-teal-400 transition-colors">Privacy Policy</Link>
          </nav>

          <Link to="/" data-cursor="hover" className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Back to City Pulse
          </Link>
        </div>
      </footer>
    </div>
  );
}
