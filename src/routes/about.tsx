import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import Lenis from "lenis";
import * as THREE from "three";
import { motion, useScroll, useTransform, useInView, useSpring, useMotionValue } from "framer-motion";
import {
  Compass,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  RotateCw,
  Lock,
  Server,
  Cpu,
  MessageSquare,
  Globe2,
  Terminal,
  Code2,
  Shield,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

// --- SUBCOMPONENT 1: Custom Magnetic Follower Cursor (Orange/Green Theme) ---
function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [cursorText, setCursorText] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const springX = useSpring(mouseX, { damping: 28, stiffness: 350 });
  const springY = useSpring(mouseY, { damping: 28, stiffness: 350 });

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return undefined;
    document.body.classList.add("has-custom-cursor");

    const onMove = (e: globalThis.MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const onOver = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest("a, button, [data-cursor-hover], [role='button']");
      if (interactive) {
        setIsHovered(true);
        setCursorText(interactive.getAttribute("data-cursor-text") || "");
      } else {
        setIsHovered(false);
        setCursorText("");
      }
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);

    return () => {
      document.body.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <motion.div
        style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: isHovered ? (cursorText ? 72 : 44) : 28,
          height: isHovered ? (cursorText ? 72 : 44) : 28,
          backgroundColor: isHovered ? "rgba(249, 115, 22, 0.12)" : "rgba(15, 118, 110, 0.04)",
          borderColor: isHovered ? "rgba(249, 115, 22, 0.75)" : "rgba(15, 118, 110, 0.35)",
        }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="flex items-center justify-center rounded-full border backdrop-blur-[1px]"
      >
        {cursorText && (
          <span className="font-mono text-[9px] font-bold tracking-widest text-orange-600 uppercase">
            {cursorText}
          </span>
        )}
      </motion.div>
      <motion.div
        style={{ x: mouseX, y: mouseY, translateX: "-50%", translateY: "-50%" }}
        animate={{ scale: isHovered ? 0 : 1, opacity: isHovered ? 0 : 1 }}
        transition={{ duration: 0.15 }}
        className="size-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"
      />
    </div>
  );
}

// --- SUBCOMPONENT 2: 3D WebGL Chennai 200-Ward Network (Orange/Green Theme) ---
function CivicGlobe3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMode, setActiveMode] = useState<"network" | "sla" | "density">("network");
  const [hoveredNode, setHoveredNode] = useState<string>("Ripon Building (GCC HQ)");
  const [isDragging, setIsDragging] = useState(false);
  const modeRef = useRef(activeMode);

  useEffect(() => {
    modeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Geodesic Icosahedron
    const icoGeometry = new THREE.IcosahedronGeometry(5.2, 2);
    const icoMaterial = new THREE.MeshBasicMaterial({
      color: 0x0f766e, // Dark Green
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    globeGroup.add(new THREE.Mesh(icoGeometry, icoMaterial));

    // Latitude Rings
    const ringGroup = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const radius = Math.cos((i * Math.PI) / 6) * 5.2;
      const y = Math.sin((i * Math.PI) / 6) * 5.2;
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = y;
      ringGroup.add(ringMesh);
    }
    globeGroup.add(ringGroup);

    // 200 Ward Nodes Point Cloud
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseC1 = new THREE.Color(0xf97316); // Orange
    const baseC2 = new THREE.Color(0x0f766e); // Dark Green
    const alertC = new THREE.Color(0x8B0000); // Dark Red (from civic.ts)

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const r = 5.25;
      positions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
      positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const col = i % 7 === 0 ? alertC : i % 2 === 0 ? baseC1 : baseC2;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Glow dot canvas texture
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.3, "rgba(249, 115, 22, 0.8)"); // Orange glow
      grad.addColorStop(0.7, "rgba(15, 118, 110, 0.3)"); // Green rim
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const pointTexture = new THREE.CanvasTexture(canvas);
    const particlesMat = new THREE.PointsMaterial({
      size: 0.35,
      map: pointTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    globeGroup.add(new THREE.Points(particlesGeo, particlesMat));

    // Bezier Arcs
    const arcGroup = new THREE.Group();
    const hubs = [
      new THREE.Vector3(0, 3.2, 4.1),
      new THREE.Vector3(1.2, 1.0, 5.0),
      new THREE.Vector3(-1.8, -0.8, 4.8),
      new THREE.Vector3(2.2, -2.5, 4.0),
      new THREE.Vector3(0.5, -3.8, 3.5),
    ];
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        const start = hubs[i]!;
        const end = hubs[j]!;
        const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(6.5);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        arcGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)),
            new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.15 })
          )
        );
      }
    }
    globeGroup.add(arcGroup);

    // Pulsing SLA Hologram Ring
    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(5.4, 5.5, 64),
      new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    pulseRing.rotation.x = Math.PI / 2.2;
    globeGroup.add(pulseRing);

    // Interaction vars
    let mouseX = 0, mouseY = 0, targetRotX = 0.2, targetRotY = 0.4, prevX = 0, prevY = 0, dragging = false;

    const onPointerMove = (e: globalThis.MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (dragging) {
        targetRotY += (e.clientX - prevX) * 0.008;
        targetRotX += (e.clientY - prevY) * 0.008;
        prevX = e.clientX;
        prevY = e.clientY;
      } else {
        mouseX = nx * 0.4;
        mouseY = ny * 0.4;
      }
    };

    const onPointerDown = (e: globalThis.MouseEvent) => {
      dragging = true;
      setIsDragging(true);
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerUp = () => {
      dragging = false;
      setIsDragging(false);
    };

    container.addEventListener("mousemove", onPointerMove);
    container.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mouseup", onPointerUp);

    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      if (!dragging) targetRotY += 0.0025;

      globeGroup.rotation.y += (targetRotY - globeGroup.rotation.y) * 0.05;
      globeGroup.rotation.x += (targetRotX + mouseY - globeGroup.rotation.x) * 0.05;

      const m = modeRef.current;
      if (m === "sla") {
        const s = 1 + Math.sin(elapsed * 3) * 0.08;
        pulseRing.scale.set(s, s, s);
        (pulseRing.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(elapsed * 4) * 0.2;
      }

      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.03;
      camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener("mousemove", onPointerMove);
      container.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("resize", onResize);
      icoGeometry.dispose();
      icoMaterial.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      pointTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative h-[480px] w-full max-w-4xl overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-background to-secondary/30 shadow-2xl backdrop-blur-xl sm:h-[580px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-orange-500"></span>
          </span>
          <span className="font-mono text-xs font-semibold tracking-wider text-orange-600 uppercase">
            Chennai 200-Ward WebGL Network
          </span>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground sm:flex">
          <span>LAT: 13.0827° N</span>
          <span>LNG: 80.2707° E</span>
          <span className="text-orange-600">STATUS: LIVE</span>
        </div>
      </div>

      <div ref={containerRef} className={`h-full w-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`} />

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-1.5 backdrop-blur-md">
          <Activity className="size-3.5 text-primary" />
          <span className="font-mono text-[11px] text-muted-foreground">
            Selected Hub: <strong className="text-foreground">{hoveredNode}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background/90 p-1 backdrop-blur-md">
          <button
            type="button"
            data-cursor-hover
            data-cursor-text="MODES"
            onClick={() => { setActiveMode("network"); setHoveredNode("Ripon Building (GCC Central)"); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${activeMode === "network" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            Network
          </button>
          <button
            type="button"
            data-cursor-hover
            data-cursor-text="SLA"
            onClick={() => { setActiveMode("sla"); setHoveredNode("Zone 4 & 8 Breach Radar"); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${activeMode === "sla" ? "bg-orange-500/10 text-orange-600" : "text-muted-foreground"}`}
          >
            SLA Pulses
          </button>
          <button
            type="button"
            data-cursor-hover
            data-cursor-text="GRID"
            onClick={() => { setActiveMode("density"); setHoveredNode("200 Geodesic Ward Vertices"); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${activeMode === "density" ? "bg-secondary/50 text-foreground" : "text-muted-foreground"}`}
          >
            Density
          </button>
        </div>

        <div className="hidden items-center gap-1.5 font-mono text-[10px] text-muted-foreground lg:flex">
          <RotateCw className="size-3" />
          <span>Click + Drag to rotate</span>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENT 3: Animated Counter ---
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

// --- SUBCOMPONENT 4: 3D Tilt Card ---
function TeamCard({ name, regNo, role, focus, badge, icon }: { name: string; regNo: string; role: string; focus: string; badge: string; icon: "maps" | "db" | "research" | "design" }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rX, setRX] = useState(0);
  const [rY, setRY] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRX(((y - rect.height / 2) / (rect.height / 2)) * -10);
    setRY(((x - rect.width / 2) / (rect.width / 2)) * 10);
    setGlow({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setRX(0); setRY(0); }}
      data-cursor-hover
      data-cursor-text="ENGINEER"
      style={{
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) scale3d(${hovered ? 1.02 : 1}, ${hovered ? 1.02 : 1}, 1)`,
        transition: hovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
      }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-orange-500/40 hover:shadow-md transition-shadow"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(400px circle at ${glow.x}% ${glow.y}%, rgba(249, 115, 22, 0.08), transparent 80%)` }}
      />
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background">
              {icon === "maps" && <Terminal className="size-5 text-primary" />}
              {icon === "db" && <Code2 className="size-5 text-orange-500" />}
              {icon === "research" && <Shield className="size-5 text-teal-600" />}
              {icon === "design" && <Sparkles className="size-5 text-orange-600" />}
            </div>
            <span className="font-mono text-[10px] font-semibold text-orange-600 uppercase rounded-full bg-orange-500/10 px-2.5 py-1 border border-orange-500/20">
              {badge}
            </span>
          </div>
          <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground group-hover:text-orange-600">{name}</h3>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">{regNo}</p>
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground">{role}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{focus}</p>
        </div>
      </div>
    </motion.div>
  );
}

// --- MAIN ABOUT PAGE COMPONENT ---
export default function AboutPage() {
  // Smooth scroll with Lenis (Scoped lifecycle)
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

  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-orange-500/30 selection:text-orange-900">
      <CustomCursor />

      {/* Ambient background */}
      <motion.div style={{ y: backgroundY }} className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-orange-200 blur-[140px]" />
        <div className="absolute top-[35%] -left-40 size-[550px] rounded-full bg-teal-100 blur-[140px]" />
        <div className="absolute top-[70%] -right-40 size-[600px] rounded-full bg-orange-100 blur-[160px]" />
      </motion.div>

      {/* Floating Header */}
      <header className="sticky top-4 z-50 mx-auto max-w-5xl px-4 sm:px-6">
        <nav className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-800 text-white shadow-[0_4px_12px_rgba(15,118,110,0.3)]">
              <Compass className="size-5 font-bold" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold tracking-wide text-primary">CivicLens</span>
                <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-primary border border-primary/20 sm:inline-block">
                  CHENNAI v1.2
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/privacy" className="rounded-xl px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link
              to="/"
              className="group flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-foreground shadow-[0_4px_15px_rgba(217,119,6,0.2)] hover:scale-[1.02] transition-transform"
            >
              <MapPin className="size-3.5" />
              <span>Live Map</span>
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Narrative */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-12 pb-24 sm:px-6 sm:pt-20">
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-4 py-1.5 font-mono text-xs font-semibold text-orange-600">
            <Sparkles className="size-3.5 animate-pulse" />
            <span>CHENNAI CIVIC TRANSPARENCY MANIFESTO</span>
          </div>

          <h1 className="mt-8 font-display text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl leading-none">
            Every citizen <br />
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-600 to-primary">
              deserves a mirror.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-xl">
            Complaints without public visibility become complaints without consequences.
            Four second-year engineering students from <strong className="text-primary">VIT Chennai</strong> building the open transparency ledger India’s cities never had.
          </p>
        </section>

        {/* 3D WebGL Centerpiece */}
        <section className="mt-14 flex flex-col items-center">
          <CivicGlobe3D />
        </section>

        {/* Ground Reality Counters */}
        <section className="mt-28">
          <div className="border-b border-border pb-6">
            <span className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">// THE CRISIS</span>
            <h2 className="mt-1 font-display text-3xl font-bold text-foreground sm:text-4xl">The scale we are up against</h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-4xl font-extrabold text-foreground sm:text-5xl">
                <AnimatedCounter value={1} suffix=" Crore+" />
              </div>
              <p className="mt-3 font-mono text-xs font-semibold text-primary uppercase">Chennai Residents</p>
              <p className="mt-1 text-xs text-muted-foreground">Across 200 wards and 15 zones with zero unified public grievance ledger.</p>
            </div>

            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
              <div className="font-display text-4xl font-extrabold text-destructive sm:text-5xl">
                <AnimatedCounter value={1.9} decimals={1} suffix=" ★" />
              </div>
              <p className="mt-3 font-mono text-xs font-semibold text-destructive uppercase">Namma Chennai App</p>
              <p className="mt-1 text-xs text-muted-foreground">Current iOS rating due to unilateral ticket closures without photo evidence.</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-4xl font-extrabold text-orange-600 sm:text-5xl">
                <AnimatedCounter value={96} suffix="%" />
              </div>
              <p className="mt-3 font-mono text-xs font-semibold text-orange-600 uppercase">Citizen Non-Adoption</p>
              <p className="mt-1 text-xs text-muted-foreground">Estimated drop-off caused by mandatory OTP and login verification walls.</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="font-display text-4xl font-extrabold text-primary sm:text-5xl">
                <AnimatedCounter value={2} prefix="₹" suffix=" Lakh Cr" />
              </div>
              <p className="mt-3 font-mono text-xs font-semibold text-primary uppercase">Smart Cities Outlay</p>
              <p className="mt-1 text-xs text-muted-foreground">National funding spent with almost no street-level verification for citizens.</p>
            </div>
          </div>
        </section>

        {/* Five Pillars */}
        <section className="mt-32">
          <span className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">// ARCHITECTURAL DISCIPLINE</span>
          <h2 className="mt-1 font-display text-3xl font-bold text-foreground sm:text-5xl">Five non-negotiable commitments</h2>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-2xl font-bold text-primary">01</span>
              <h3 className="mt-3 text-lg font-bold text-foreground">Radical Transparency</h3>
              <p className="mt-2 text-sm text-muted-foreground">Every complaint is a public pin. Every ward is scored by resolution velocity.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-2xl font-bold text-orange-600">02</span>
              <h3 className="mt-3 text-lg font-bold text-foreground">Zero Barriers (No OTP)</h3>
              <p className="mt-2 text-sm text-muted-foreground">No phone numbers, passwords, or app downloads. Instant 2-click submission.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-2xl font-bold text-primary">03</span>
              <h3 className="mt-3 text-lg font-bold text-foreground">Citizen Privacy by Default</h3>
              <p className="mt-2 text-sm text-muted-foreground">Zero-PII compliant with DPDP Act 2023. Only the hazard coordinates are stored.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-2xl font-bold text-orange-600">04</span>
              <h3 className="mt-3 text-lg font-bold text-foreground">Community Truth</h3>
              <p className="mt-2 text-sm text-muted-foreground">Neighbours verify issues with browser tokens, creating unignorable collective pressure.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-2xl font-bold text-primary">05</span>
              <h3 className="mt-3 text-lg font-bold text-foreground">Free & Open Infrastructure</h3>
              <p className="mt-2 text-sm text-muted-foreground">Serverless PostgreSQL and edge GIS mapping costing under $5/month to operate.</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-primary uppercase tracking-widest">// THE PRECEDENTS</span>
                <h3 className="mt-3 text-lg font-bold text-foreground">FixMyStreet UK & NYC 311</h3>
                <p className="mt-2 text-xs text-muted-foreground">Inspired by FixMyStreet (citizen-built in 2008) and NYC 311 ($300M saved annually).</p>
              </div>
              <div className="mt-6 flex items-center gap-2 font-mono text-xs font-bold text-primary">
                <span>India&apos;s turn now</span>
                <ArrowRight className="size-3.5" />
              </div>
            </div>
          </div>
        </section>

        {/* The Builders */}
        <section className="mt-32">
          <div className="border-b border-border pb-6">
            <span className="font-mono text-xs font-semibold tracking-widest text-primary uppercase">// THE BUILDERS</span>
            <h2 className="mt-1 font-display text-3xl font-bold text-foreground sm:text-5xl">VIT Chennai Engineering Team</h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <TeamCard name="Karwin S.C" regNo="25BCE1682" role="Frontend & GIS Maps" focus="Leaflet, GeoJSON boundary clustering, and UI architecture." badge="LEAD ARCHITECT" icon="maps" />
            <TeamCard name="Adhavan" regNo="25BCE1144" role="Backend & Database" focus="Supabase PostgreSQL, Realtime sync, and Row Level Security." badge="DATA PLATFORM" icon="db" />
            <TeamCard name="Aryan Nama" regNo="25MID1157" role="Research & Strategy" focus="SLA metrics, GCC ward demarcations, and civic policy." badge="STRATEGY" icon="research" />
            <TeamCard name="Arjith" regNo="25BEC1209" role="Design & UX" focus="Design tokens, accessibility, and high-speed mobile flows." badge="PRODUCT DESIGN" icon="design" />
          </div>
        </section>

        {/* Disclaimer */}
        <div className="mt-20 rounded-2xl border border-orange-500/20 bg-orange-500/[0.03] p-5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-orange-600 font-semibold font-mono text-[11px] uppercase tracking-wider">
            <ShieldAlert className="size-4" />
            Independent Student Prototype & GCC Non-Affiliation
          </div>
          <p className="mt-2 leading-relaxed">
            CivicLens is an independent public-interest project engineered by undergraduate students at VIT Chennai.
            It is not officially operated by, endorsed by, or affiliated with the Greater Chennai Corporation (GCC) or the Government of Tamil Nadu.
          </p>
        </div>
      </main>
    </div>
  );
}
