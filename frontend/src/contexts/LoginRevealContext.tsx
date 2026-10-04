"use client";

import "@/app/login/jarvis.css";

import {
  handoffFlyDurationMs,
  handoffStartRect,
  resolveBrandMarkTarget,
} from "@/lib/login-handoff-rect";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const REVEAL_WIPE_MS = 1050;
const TARGET_WAIT_MS = 4000;

export type LoginRevealOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HandoffPhase = "idle" | "preflight" | "flying" | "reveal";

type FlyVars = {
  fromX: number;
  fromY: number;
  fromW: number;
  fromH: number;
  toX: number;
  toY: number;
  toW: number;
  toH: number;
  durationMs: number;
};

type LoginRevealContextValue = {
  homeRevealActive: boolean;
  revealWipeActive: boolean;
  revealOrigin: LoginRevealOrigin | null;
  startPostLoginReveal: (fromRect: DOMRect) => void;
};

const LoginRevealContext = createContext<LoginRevealContextValue | null>(null);

function motionMs(base: number) {
  if (typeof window === "undefined") return base;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return Math.min(base, 280);
  }
  return base;
}

function BrandHandoffOverlay({
  startRect,
  phase,
  onArrived,
  onDone,
}: {
  startRect: DOMRect;
  phase: HandoffPhase;
  onArrived: (target: DOMRect) => void;
  onDone: () => void;
}) {
  const markRef = useRef<HTMLSpanElement>(null);
  const flyStartedRef = useRef(false);
  const [flyVars, setFlyVars] = useState<FlyVars | null>(null);
  const [animating, setAnimating] = useState(false);

  useLayoutEffect(() => {
    if (phase !== "flying" || flyStartedRef.current) return;

    const startedAt = performance.now();
    let cancelled = false;

    const beginFly = (toRect: DOMRect) => {
      if (cancelled || flyStartedRef.current) return;
      flyStartedRef.current = true;
      const durationMs = motionMs(handoffFlyDurationMs(startRect, toRect));
      setFlyVars({
        fromX: startRect.left,
        fromY: startRect.top,
        fromW: startRect.width,
        fromH: startRect.height,
        toX: toRect.left,
        toY: toRect.top,
        toW: toRect.width,
        toH: toRect.height,
        durationMs,
      });
      requestAnimationFrame(() => setAnimating(true));
    };

    const waitForTarget = () => {
      if (cancelled || flyStartedRef.current) return;
      const target = document.querySelector("[data-brand-handoff-target]");
      const rect = target?.getBoundingClientRect();
      if (rect && rect.width > 1 && rect.height > 1) {
        beginFly(rect);
        return;
      }
      if (performance.now() - startedAt < TARGET_WAIT_MS) {
        requestAnimationFrame(waitForTarget);
        return;
      }
      beginFly(resolveBrandMarkTarget());
    };

    requestAnimationFrame(waitForTarget);

    return () => {
      cancelled = true;
    };
  }, [phase, startRect]);

  const arrivedRef = useRef(false);

  const handleAnimationEnd = useCallback(() => {
    if (!flyVars || arrivedRef.current || phase === "reveal") return;
    arrivedRef.current = true;
    const target = new DOMRect(flyVars.toX, flyVars.toY, flyVars.toW, flyVars.toH);
    onArrived(target);
  }, [flyVars, onArrived, phase]);

  useEffect(() => {
    if (!animating || !flyVars) return;
    const t = window.setTimeout(() => handleAnimationEnd(), flyVars.durationMs + 120);
    return () => window.clearTimeout(t);
  }, [animating, flyVars, handleAnimationEnd]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = window.setTimeout(onDone, motionMs(REVEAL_WIPE_MS) + 60);
    return () => window.clearTimeout(t);
  }, [phase, onDone]);

  const markStyle: CSSProperties | undefined = flyVars
    ? ({
        "--handoff-from-x": `${flyVars.fromX}px`,
        "--handoff-from-y": `${flyVars.fromY}px`,
        "--handoff-from-w": `${flyVars.fromW}px`,
        "--handoff-from-h": `${flyVars.fromH}px`,
        "--handoff-to-x": `${flyVars.toX}px`,
        "--handoff-to-y": `${flyVars.toY}px`,
        "--handoff-to-w": `${flyVars.toW}px`,
        "--handoff-to-h": `${flyVars.toH}px`,
        "--handoff-fly-ms": `${flyVars.durationMs}ms`,
      } as CSSProperties)
    : ({
        top: `${startRect.top}px`,
        left: `${startRect.left}px`,
        width: `${startRect.width}px`,
        height: `${startRect.height}px`,
      } as CSSProperties);

  const revealing = phase === "reveal";

  return (
    <div className="jarvis-handoff-overlay" aria-hidden="true">
      <div className={`jarvis-handoff-overlay__scrim${revealing ? " is-revealing" : ""}`} />
      <span
        ref={markRef}
        className={`jarvis-handoff-overlay__mark brand__mark${animating ? " is-animating" : ""}${revealing ? " is-arrived" : ""}`}
        style={markStyle}
        onAnimationEnd={animating ? handleAnimationEnd : undefined}
      >
        GC
      </span>
    </div>
  );
}

export function LoginRevealProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [homeRevealActive, setHomeRevealActive] = useState(false);
  const [revealWipeActive, setRevealWipeActive] = useState(false);
  const [revealOrigin, setRevealOrigin] = useState<LoginRevealOrigin | null>(null);
  const [startRect, setStartRect] = useState<DOMRect | null>(null);
  const [phase, setPhase] = useState<HandoffPhase>("idle");

  const startPostLoginReveal = useCallback((rect: DOMRect) => {
    setHomeRevealActive(true);
    setRevealWipeActive(false);
    setRevealOrigin(null);
    setStartRect(handoffStartRect(rect));
    setPhase("preflight");
  }, []);

  useEffect(() => {
    if (phase !== "preflight") return;
    let navId = 0;
    const startId = requestAnimationFrame(() => {
      navId = requestAnimationFrame(() => {
        router.replace("/");
        setPhase("flying");
      });
    });
    return () => {
      cancelAnimationFrame(startId);
      if (navId) cancelAnimationFrame(navId);
    };
  }, [phase, router]);

  const handleArrived = useCallback((target: DOMRect) => {
    setRevealOrigin({
      x: target.left,
      y: target.top,
      width: target.width,
      height: target.height,
    });
    setRevealWipeActive(true);
    setPhase("reveal");
  }, []);

  const finishReveal = useCallback(() => {
    setStartRect(null);
    setRevealWipeActive(false);
    setRevealOrigin(null);
    setHomeRevealActive(false);
    setPhase("idle");
  }, []);

  const value = useMemo(
    () => ({
      homeRevealActive,
      revealWipeActive,
      revealOrigin,
      startPostLoginReveal,
    }),
    [homeRevealActive, revealWipeActive, revealOrigin, startPostLoginReveal],
  );

  return (
    <LoginRevealContext.Provider value={value}>
      {children}
      {startRect && phase !== "idle" ? (
        <BrandHandoffOverlay
          startRect={startRect}
          phase={phase}
          onArrived={handleArrived}
          onDone={finishReveal}
        />
      ) : null}
    </LoginRevealContext.Provider>
  );
}

export function useLoginReveal() {
  const ctx = useContext(LoginRevealContext);
  if (!ctx) throw new Error("useLoginReveal deve ser usado dentro de LoginRevealProvider");
  return ctx;
}
