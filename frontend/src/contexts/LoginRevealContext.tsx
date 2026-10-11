"use client";

import "@/app/login/jarvis.css";

import { LOGIN_EXIT_TIMELINE } from "@/lib/login-exit-timeline";
import {
  estimateBrandMarkRect,
  handoffFlyDurationMs,
  handoffStartRect,
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
  type ReactNode,
} from "react";


export type LoginRevealOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HandoffPhase = "idle" | "flying" | "reveal";

type LoginRevealContextValue = {
  homeRevealActive: boolean;
  revealWipeActive: boolean;
  handoffFlyComplete: boolean;
  revealOrigin: LoginRevealOrigin | null;
  startPostLoginReveal: () => void;
};

const LoginRevealContext = createContext<LoginRevealContextValue | null>(null);

const HUD_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function motionMs(base: number) {
  if (typeof window === "undefined") return base;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return Math.min(base, 280);
  }
  return base;
}

function placeMark(el: HTMLElement, rect: DOMRect) {
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.margin = "0";
  el.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
}

function rectToOrigin(rect: DOMRect): LoginRevealOrigin {
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function BrandHandoffOverlay({
  startRect,
  phase,
  dashboardRevealing,
  onStartDashboardReveal,
  onFlyComplete,
  onDone,
}: {
  startRect: DOMRect;
  phase: HandoffPhase;
  dashboardRevealing: boolean;
  onStartDashboardReveal: (target: DOMRect) => void;
  onFlyComplete: (target: DOMRect) => void;
  onDone: () => void;
}) {
  const markRef = useRef<HTMLSpanElement>(null);
  const flyStartedRef = useRef(false);
  const revealStartedRef = useRef(false);
  const animationRef = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const el = markRef.current;
    if (!el) return;
    placeMark(el, startRect);
  }, [startRect]);

  useLayoutEffect(() => {
    if (phase !== "flying" || flyStartedRef.current) return;

    let cancelled = false;
    let revealTimer = 0;
    let fallbackId = 0;
    let revealAttempts = 0;

    const beginFly = (toRect: DOMRect) => {
      const el = markRef.current;
      if (!el || cancelled || flyStartedRef.current) return;
      flyStartedRef.current = true;

      placeMark(el, startRect);
      void el.offsetWidth;

      const durationMs = motionMs(handoffFlyDurationMs(startRect, toRect));
      animationRef.current?.cancel();

      const animation = el.animate(
        [
          {
            transform: `translate3d(${startRect.left}px, ${startRect.top}px, 0)`,
            width: `${startRect.width}px`,
            height: `${startRect.height}px`,
          },
          {
            transform: `translate3d(${toRect.left}px, ${toRect.top}px, 0)`,
            width: `${toRect.width}px`,
            height: `${toRect.height}px`,
          },
        ],
        {
          duration: durationMs,
          easing: HUD_EASE,
          fill: "forwards",
        },
      );

      animationRef.current = animation;

      const startDashboardReveal = (rect: DOMRect) => {
        if (cancelled || revealStartedRef.current) return;
        revealStartedRef.current = true;
        onStartDashboardReveal(rect);
      };

      const tryStartDashboardReveal = () => {
        if (cancelled || revealStartedRef.current) return;
        revealAttempts += 1;
        const target = document.querySelector("[data-brand-handoff-target]");
        const measured = target?.getBoundingClientRect();
        if (measured && measured.width > 1 && measured.height > 1) {
          startDashboardReveal(measured);
          return;
        }
        if (revealAttempts < 300) {
          requestAnimationFrame(tryStartDashboardReveal);
          return;
        }
        startDashboardReveal(toRect);
      };

      const finishFly = () => {
        if (cancelled) return;
        placeMark(el, toRect);
        if (!revealStartedRef.current) {
          startDashboardReveal(toRect);
        }
        onFlyComplete(toRect);
      };

      revealTimer = window.setTimeout(
        tryStartDashboardReveal,
        motionMs(LOGIN_EXIT_TIMELINE.flyRevealLeadMs),
      );
      fallbackId = window.setTimeout(finishFly, durationMs + 120);

      animation.onfinish = () => {
        window.clearTimeout(fallbackId);
        window.clearTimeout(revealTimer);
        finishFly();
      };
    };

    const resolveFlyTarget = (): DOMRect => {
      const target = document.querySelector("[data-brand-handoff-target]");
      const rect = target?.getBoundingClientRect();
      if (rect && rect.width > 1 && rect.height > 1) {
        return rect;
      }
      return estimateBrandMarkRect();
    };

    requestAnimationFrame(() => {
      if (!cancelled) beginFly(resolveFlyTarget());
    });

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      window.clearTimeout(fallbackId);
      animationRef.current?.cancel();
    };
  }, [phase, startRect, onStartDashboardReveal, onFlyComplete]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = window.setTimeout(onDone, motionMs(LOGIN_EXIT_TIMELINE.revealWipe) + 40);
    return () => window.clearTimeout(t);
  }, [phase, onDone]);

  const flying = phase === "flying";
  const markArrived = phase === "reveal";

  return (
    <div className={`jarvis-handoff-overlay${flying ? " is-flying" : ""}`} aria-hidden="true">
      <div
        className={`jarvis-handoff-overlay__scrim${flying ? " is-during-fly" : ""}${dashboardRevealing ? " is-revealing" : ""}`}
      />
      <span
        ref={markRef}
        className={`jarvis-handoff-overlay__mark brand__mark${flying ? " is-flying" : ""}${markArrived ? " is-arrived" : ""}`}
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
  const [handoffFlyComplete, setHandoffFlyComplete] = useState(false);
  const [revealOrigin, setRevealOrigin] = useState<LoginRevealOrigin | null>(null);
  const [startRect, setStartRect] = useState<DOMRect | null>(null);
  const [phase, setPhase] = useState<HandoffPhase>("idle");

  const startPostLoginReveal = useCallback(() => {
    const estimated = estimateBrandMarkRect();
    setHomeRevealActive(true);
    setRevealWipeActive(false);
    setHandoffFlyComplete(false);
    setRevealOrigin(rectToOrigin(estimated));
    setStartRect(handoffStartRect());
    setPhase("flying");
    router.replace("/");
  }, [router]);

  const handleStartDashboardReveal = useCallback((target: DOMRect) => {
    setRevealOrigin(rectToOrigin(target));
    setRevealWipeActive(true);
  }, []);

  const handleFlyComplete = useCallback((target: DOMRect) => {
    setRevealOrigin(rectToOrigin(target));
    setHandoffFlyComplete(true);
    setPhase("reveal");
  }, []);

  const finishReveal = useCallback(() => {
    setStartRect(null);
    setRevealWipeActive(false);
    setRevealOrigin(null);
    setHandoffFlyComplete(false);
    setHomeRevealActive(false);
    setPhase("idle");
  }, []);

  const value = useMemo(
    () => ({
      homeRevealActive,
      revealWipeActive,
      handoffFlyComplete,
      revealOrigin,
      startPostLoginReveal,
    }),
    [homeRevealActive, revealWipeActive, handoffFlyComplete, revealOrigin, startPostLoginReveal],
  );

  return (
    <LoginRevealContext.Provider value={value}>
      {children}
      {startRect && phase !== "idle" ? (
        <BrandHandoffOverlay
          startRect={startRect}
          phase={phase}
          dashboardRevealing={revealWipeActive}
          onStartDashboardReveal={handleStartDashboardReveal}
          onFlyComplete={handleFlyComplete}
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
