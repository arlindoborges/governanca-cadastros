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

type HandoffPhase = "idle" | "flying" | "reveal";

type LoginRevealContextValue = {
  homeRevealActive: boolean;
  revealWipeActive: boolean;
  revealOrigin: LoginRevealOrigin | null;
  startPostLoginReveal: () => void;
};

const LoginRevealContext = createContext<LoginRevealContextValue | null>(null);

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
  const arrivedRef = useRef(false);
  const animationRef = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const el = markRef.current;
    if (!el) return;
    placeMark(el, startRect);
  }, [startRect]);

  useLayoutEffect(() => {
    if (phase !== "flying" || flyStartedRef.current) return;

    const startedAt = performance.now();
    let cancelled = false;

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
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );

      animationRef.current = animation;

      const finish = () => {
        if (cancelled || arrivedRef.current) return;
        arrivedRef.current = true;
        placeMark(el, toRect);
        onArrived(toRect);
      };

      const fallbackId = window.setTimeout(finish, durationMs + 200);
      animation.onfinish = () => {
        window.clearTimeout(fallbackId);
        finish();
      };
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
      animationRef.current?.cancel();
    };
  }, [phase, startRect, onArrived]);

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
        className={`jarvis-handoff-overlay__mark brand__mark${revealing ? " is-arrived" : ""}`}
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

  const startPostLoginReveal = useCallback(() => {
    setHomeRevealActive(true);
    setRevealWipeActive(false);
    setRevealOrigin(null);
    setStartRect(handoffStartRect());
    setPhase("flying");
    router.replace("/");
  }, [router]);

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
