"use client";

import "@/app/login/jarvis.css";

import { handoffFlyDurationMs, handoffStartRect } from "@/lib/login-handoff-rect";
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

export type LoginRevealOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
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
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : base;
}

function BrandHandoffOverlay({
  fromRect,
  onArrived,
  onDone,
}: {
  fromRect: DOMRect;
  onArrived: (target: DOMRect) => void;
  onDone: () => void;
}) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [flyReady, setFlyReady] = useState(false);
  const [moveToTarget, setMoveToTarget] = useState(false);
  const [reveal, setReveal] = useState(false);
  const flyDurationMsRef = useRef(550);

  useLayoutEffect(() => {
    let attempts = 0;
    const resolveTarget = () => {
      const target = document.querySelector("[data-brand-handoff-target]");
      if (target) {
        const rect = target.getBoundingClientRect();
        const resolved =
          rect.width > 1 && rect.height > 1 ? rect : new DOMRect(20, 20, 40, 40);
        setTargetRect(resolved);
        flyDurationMsRef.current = handoffFlyDurationMs(fromRect, resolved);
        setFlyReady(true);
        return;
      }
      attempts += 1;
      if (attempts < 24) {
        requestAnimationFrame(resolveTarget);
      } else {
        onDone();
      }
    };
    resolveTarget();
  }, [fromRect, onDone]);

  useLayoutEffect(() => {
    if (!flyReady || !targetRect) return;
    setMoveToTarget(false);
    let moveId = 0;
    const startId = requestAnimationFrame(() => {
      moveId = requestAnimationFrame(() => setMoveToTarget(true));
    });
    return () => {
      cancelAnimationFrame(startId);
      if (moveId) cancelAnimationFrame(moveId);
    };
  }, [flyReady, targetRect]);

  useEffect(() => {
    if (!moveToTarget || !targetRect) return;
    const flyMs = motionMs(flyDurationMsRef.current);
    const t = window.setTimeout(() => {
      onArrived(targetRect);
      setReveal(true);
    }, flyMs);
    return () => window.clearTimeout(t);
  }, [moveToTarget, targetRect, onArrived]);

  useEffect(() => {
    if (!reveal) return;
    const t = window.setTimeout(onDone, motionMs(REVEAL_WIPE_MS) + 60);
    return () => window.clearTimeout(t);
  }, [reveal, onDone]);

  const atTarget = moveToTarget && targetRect;

  const markStyle: CSSProperties = {
    top: atTarget ? targetRect.top : fromRect.top,
    left: atTarget ? targetRect.left : fromRect.left,
    width: atTarget ? targetRect.width : fromRect.width,
    height: atTarget ? targetRect.height : fromRect.height,
    ["--jarvis-handoff-fly" as string]: `${flyDurationMsRef.current}ms`,
  };

  return (
    <div className="jarvis-handoff-overlay" aria-hidden="true">
      <div className={`jarvis-handoff-overlay__scrim${reveal ? " is-revealing" : ""}`} />
      <span
        className={`jarvis-handoff-overlay__mark brand__mark${flyReady ? " is-flying" : ""}${reveal ? " is-arrived" : ""}`}
        style={markStyle}
      >
        GC
      </span>
    </div>
  );
}

export function LoginRevealProvider({ children }: { children: ReactNode }) {
  const [homeRevealActive, setHomeRevealActive] = useState(false);
  const [revealWipeActive, setRevealWipeActive] = useState(false);
  const [revealOrigin, setRevealOrigin] = useState<LoginRevealOrigin | null>(null);
  const [fromRect, setFromRect] = useState<DOMRect | null>(null);

  const startPostLoginReveal = useCallback((rect: DOMRect) => {
    setHomeRevealActive(true);
    setRevealWipeActive(false);
    setRevealOrigin(null);
    setFromRect(handoffStartRect(rect));
  }, []);

  const handleArrived = useCallback((target: DOMRect) => {
    setRevealOrigin({
      x: target.left,
      y: target.top,
      width: target.width,
      height: target.height,
    });
    setRevealWipeActive(true);
  }, []);

  const finishReveal = useCallback(() => {
    setFromRect(null);
    setRevealWipeActive(false);
    setRevealOrigin(null);
    setHomeRevealActive(false);
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
      {fromRect ? (
        <BrandHandoffOverlay fromRect={fromRect} onArrived={handleArrived} onDone={finishReveal} />
      ) : null}
    </LoginRevealContext.Provider>
  );
}

export function useLoginReveal() {
  const ctx = useContext(LoginRevealContext);
  if (!ctx) throw new Error("useLoginReveal deve ser usado dentro de LoginRevealProvider");
  return ctx;
}
