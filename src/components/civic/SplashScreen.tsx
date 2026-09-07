import { useEffect, useRef, useState } from "react";
import { MapPin, Check } from "lucide-react";
import { preloadAppData } from "@/lib/appData";

const SESSION_KEY = "civiclens_splash_seen";

type Stage = "connecting" | "complaints" | "wards" | "ready";

const STAGE_LABEL: Record<Stage, string> = {
  connecting: "Connecting to Chennai…",
  complaints: "Placing complaints on the map…",
  wards: "Loading ward scorecards…",
  ready: "Ready",
};

export type SplashState = {
  /** Overlay is in the DOM (fading or fully visible). */
  mounted: boolean;
  /** Fade-out has begun. */
  exiting: boolean;
  progress: number;
  stage: Stage;
  complaintsDone: boolean;
  wardsDone: boolean;
};

/**
 * Drives the splash from the real preload promises.
 * Resolves when BOTH datasets are loaded AND minDurationMs has elapsed (or timeoutMs hits).
 */
export function useSplash(
  opts: { minDurationMs?: number; timeoutMs?: number; fadeMs?: number } = {},
): SplashState {
  const { minDurationMs = 1600, timeoutMs = 8000, fadeMs = 550 } = opts;
  const [mounted, setMounted] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(6);
  const [complaintsDone, setComplaintsDone] = useState(false);
  const [wardsDone, setWardsDone] = useState(false);
  const targetRef = useRef(22);

  // Skip on repeat mounts within a session (still preload so views are instant)
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      preloadAppData();
      setMounted(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const start = Date.now();
    let cancelled = false;
    let finishing = false;

    const { complaints, wards } = preloadAppData();

    complaints.then(() => {
      if (!cancelled) {
        setComplaintsDone(true);
        targetRef.current += 36;
      }
    });
    wards.then(() => {
      if (!cancelled) {
        setWardsDone(true);
        targetRef.current += 36;
      }
    });

    // Bar always creeps toward the current target so it never looks frozen
    const creep = setInterval(() => {
      setProgress((p) =>
        p < targetRef.current
          ? Math.min(targetRef.current, p + Math.max(0.4, (targetRef.current - p) * 0.08))
          : p,
      );
    }, 80);

    const finish = () => {
      if (finishing || cancelled) return;
      finishing = true;
      clearInterval(creep);
      setProgress(100);
      setTimeout(() => {
        if (cancelled) return;
        setExiting(true);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* private mode */
        }
        setTimeout(() => {
          if (!cancelled) setMounted(false);
        }, fadeMs);
      }, 350);
    };

    const both = Promise.all([complaints, wards]);
    const minWait = new Promise<void>((r) => setTimeout(r, minDurationMs));
    Promise.all([both, minWait]).then(finish);
    const timeout = setTimeout(finish, timeoutMs);

    return () => {
      cancelled = true;
      clearInterval(creep);
      clearTimeout(timeout);
      void start;
    };
  }, [mounted, minDurationMs, timeoutMs, fadeMs]);

  // Lock scroll while visible
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const stage: Stage =
    progress >= 100 ? "ready" : !complaintsDone ? "complaints" : !wardsDone ? "wards" : "ready";
  return {
    mounted,
    exiting,
    progress,
    stage: progress < 12 ? "connecting" : stage,
    complaintsDone,
    wardsDone,
  };
}

export function SplashScreen({ state }: { state: SplashState }) {
  if (!state.mounted) return null;
  const { exiting, progress, stage, complaintsDone, wardsDone } = state;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-background transition-opacity duration-500 ease-out motion-reduce:transition-none ${exiting ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      {/* soft radial wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in oklab, var(--primary) 8%, transparent), transparent 60%)",
        }}
      />

      <div className="relative flex w-full max-w-sm flex-col items-center px-6 text-center">
        {/* Pin with sonar rings */}
        <div className="relative flex size-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-primary/40 motion-safe:animate-sonar" />
          <span
            className="absolute inset-0 rounded-full border-2 border-primary/30 motion-safe:animate-sonar"
            style={{ animationDelay: "0.65s" }}
          />
          <span
            className="absolute inset-0 rounded-full border-2 border-primary/20 motion-safe:animate-sonar"
            style={{ animationDelay: "1.3s" }}
          />
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 motion-safe:animate-pin-drop">
            <MapPin className="size-8" />
          </span>
        </div>

        <h1
          className="mt-7 font-display text-5xl font-bold tracking-tight text-primary motion-safe:animate-rise"
          style={{ animationDelay: "0.25s" }}
        >
          CivicLens
        </h1>
        <p
          className="mt-2 text-sm text-muted-foreground motion-safe:animate-rise"
          style={{ animationDelay: "0.4s" }}
        >
          Every complaint is a public pin.
        </p>

        {/* Progress */}
        <div className="mt-9 w-full motion-safe:animate-rise" style={{ animationDelay: "0.55s" }}>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
              style={{
                width: `${progress}%`,
                backgroundImage:
                  progress < 100
                    ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.45) 50%, transparent 100%)"
                    : undefined,
                backgroundSize: "200% 100%",
                animation: progress < 100 ? "shimmer 1.6s linear infinite" : undefined,
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{STAGE_LABEL[stage]}</span>
            <span className="font-mono text-muted-foreground">{Math.round(progress)}%</span>
          </div>

          <ul className="mt-4 space-y-1.5 text-left text-[11px]">
            <Step done={complaintsDone} label="Live complaint map" />
            <Step done={wardsDone} label="200 ward scorecards" />
          </ul>
        </div>

        <p
          className="mt-10 text-[10px] tracking-[0.18em] text-muted-foreground/70 uppercase motion-safe:animate-rise"
          style={{ animationDelay: "0.8s" }}
        >
          Chennai · Zero-PII · Community verified
        </p>
      </div>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 transition-colors ${done ? "text-foreground" : "text-muted-foreground"}`}
    >
      <span
        className={`flex size-4 items-center justify-center rounded-full border transition-colors ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}
      >
        {done ? (
          <Check className="size-2.5" />
        ) : (
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
        )}
      </span>
      {label}
    </li>
  );
}
