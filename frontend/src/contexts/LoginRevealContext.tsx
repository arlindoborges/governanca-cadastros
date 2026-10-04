"use client";

import "@/app/login/jarvis.css";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const BRAND_FLY_MS = 880;

type LoginRevealContextValue = {
  homeRevealActive: boolean;
  startPostLoginReveal: (fromRect: DOMRect) => void;
};

const LoginRevealContext = createContext<LoginRevealContextValue | null>(null);

function motionMs(base: number) {
  if (typeof window === "undefined") return base;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : base;
}

function BrandHandoffOverlay({ fromRect, onDone }: { fromRect: DOMRect; onDone: () => void }) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [fly, setFly] = useState(false);

  useLayoutEffect(() => {
    let attempts = 0;
    const resolveTarget = () => {
      const target = document.querySelector("[data-brand-handoff-target]");
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect.width > 1 && rect.height > 1) {
          setTargetRect(rect);
        } else {
          setTargetRect(new DOMRect(20, 20, 40, 40));
        }
        requestAnimationFrame(() => setFly(true));
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
  }, [onDone]);

  useEffect(() => {
    if (!fly) return;
    const t = window.setTimeout(onDone, motionMs(BRAND_FLY_MS) + 80);
    return () => window.clearTimeout(t);
  }, [fly, onDone]);

  const markStyle: CSSProperties = {
    top: fly && targetRect ? targetRect.top : fromRect.top,
    left: fly && targetRect ? targetRect.left : fromRect.left,
    width: fly && targetRect ? targetRect.width : fromRect.width,
    height: fly && targetRect ? targetRect.height : fromRect.height,
  };

  return (
    <div className="jarvis-handoff-overlay" aria-hidden="true">
      <div className={`jarvis-handoff-overlay__scrim${fly ? " is-fading" : ""}`} />
      <span
        className={`jarvis-handoff-overlay__mark brand__mark${fly ? " is-flying" : ""}${fly && targetRect ? " is-arrived" : ""}`}
        style={markStyle}
      >
        GC
      </span>
    </div>
  );
}

export function LoginRevealProvider({ children }: { children: ReactNode }) {
  const [homeRevealActive, setHomeRevealActive] = useState(false);
  const [fromRect, setFromRect] = useState<DOMRect | null>(null);

  const startPostLoginReveal = useCallback((rect: DOMRect) => {
    setHomeRevealActive(true);
    setFromRect(rect);
  }, []);

  const finishReveal = useCallback(() => {
    setFromRect(null);
    setHomeRevealActive(false);
  }, []);

  const value = useMemo(
    () => ({ homeRevealActive, startPostLoginReveal }),
    [homeRevealActive, startPostLoginReveal],
  );

  return (
    <LoginRevealContext.Provider value={value}>
      {children}
      {fromRect ? <BrandHandoffOverlay fromRect={fromRect} onDone={finishReveal} /> : null}
    </LoginRevealContext.Provider>
  );
}

export function useLoginReveal() {
  const ctx = useContext(LoginRevealContext);
  if (!ctx) throw new Error("useLoginReveal deve ser usado dentro de LoginRevealProvider");
  return ctx;
}
