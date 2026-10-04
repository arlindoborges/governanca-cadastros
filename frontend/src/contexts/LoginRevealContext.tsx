"use client";

import "@/app/login/jarvis.css";

import { handoffFlyDurationMs, handoffStartRect } from "@/lib/login-handoff-rect";
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
  type ReactNode,
} from "react";

const REVEAL_WIPE_MS = 1050;

export type LoginRevealOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HandoffPhase = "idle" | "preflight" | "flying" | "reveal";

type LoginRevealContextValue = {
  homeRevealActive: boolean;
  revealWipeActive: boolean;
  revealOrigin: LoginRevealOrigin | null;
  startPostLoginReveal: (fromRect: DOMRect) => void;
};

const LoginRevealContext = createContext<LoginRevealContextValue | null>(null);

function motionMs(base: number) {
  if (typeof window === "undefined") return base;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : base;
}

function applyRect(el: HTMLElement, rect: DOMRect) {
  el.style.top = `${rect.top}px`;
  el.style.left = `${rect.left}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
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

  useLayoutEffect(() => {
    const el = markRef.current;
    if (!el) return;
    applyRect(el, startRect);
  }, [startRect]);

  useLayoutEffect(() => {
    if (phase !== "flying" || flyStartedRef.current) return;
    const el = markRef.current;
    if (!el) return;

    let attempts = 0;
    let cancelled = false;

    const runFly = () => {
      if (cancelled) return;
      const targetEl = document.querySelector("[data-brand-handoff-target]");
      if (!targetEl) {
        attempts += 1;
        if (attempts < 40) {
          requestAnimationFrame(runFly);
          return;
        }
        onDone();
        return;
      }

      const toRect =
        targetEl.getBoundingClientRect().width > 1
          ? targetEl.getBoundingClientRect()
          : new DOMRect(20, 20, 40, 40);

      flyStartedRef.current = true;
      applyRect(el, startRect);

      const flyMs = motionMs(handoffFlyDurationMs(startRect, toRect));
      const animation = el.animate(
        [
          {
            top: `${startRect.top}px`,
            left: `${startRect.left}px`,
            width: `${startRect.width}px`,
            height: `${startRect.height}px`,
          },
          {
            top: `${toRect.top}px`,
            left: `${toRect.left}px`,
            width: `${toRect.width}px`,
            height: `${toRect.height}px`,
          },
        ],
        {
          duration: flyMs,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      animation.onfinish = () => {
        if (cancelled) return;
        applyRect(el, toRect);
        onArrived(toRect);
      };
    };

    requestAnimationFrame(runFly);

    return () => {
      cancelled = true;
    };
  }, [phase, startRect, onArrived, onDone]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = window.setTimeout(onDone, motionMs(REVEAL_WIPE_MS) + 60);
    return () => window.clearTimeout(t);
  }, [phase, onDone]);

  const revealing = phase === "reveal";

  return (
    <div className="jarvis-handoff-overlay" aria-hidden="true">
      <div className={`jarvis-handoff-overlay__scrim${revealing ? " is-revealing" : ""}`} />
      <span
        ref={markRef}
        className={`jarvis-handoff-overlay__mark brand__mark${phase === "flying" ? " is-flying" : ""}${revealing ? " is-arrived" : ""}`}
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
