"use client";

import "@/app/login/jarvis.css";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { JarvisRingGraphic } from "@/components/login/JarvisRingGraphic";

const REVEAL_MS = 1150;

type LoginRevealContextValue = {
  homeRevealActive: boolean;
  startPostLoginReveal: () => void;
};

const LoginRevealContext = createContext<LoginRevealContextValue | null>(null);

function motionMs(base: number) {
  if (typeof window === "undefined") return base;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : base;
}

function LoginRevealOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, motionMs(REVEAL_MS));
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="jarvis-reveal-overlay" aria-hidden="true">
      <div className="jarvis-reveal-overlay__scrim" />
      <div className="jarvis-reveal-overlay__ring">
        <JarvisRingGraphic />
        <div className="jarvis-hud__ring-center">
          <p className="jarvis-hud__ring-brand">G·C</p>
          <p className="jarvis-hud__ring-active">Canal ativo</p>
        </div>
      </div>
    </div>
  );
}

export function LoginRevealProvider({ children }: { children: ReactNode }) {
  const [homeRevealActive, setHomeRevealActive] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const startPostLoginReveal = useCallback(() => {
    setHomeRevealActive(true);
    setOverlayVisible(true);
  }, []);

  const finishReveal = useCallback(() => {
    setOverlayVisible(false);
    window.setTimeout(() => setHomeRevealActive(false), 50);
  }, []);

  const value = useMemo(
    () => ({ homeRevealActive, startPostLoginReveal }),
    [homeRevealActive, startPostLoginReveal],
  );

  return (
    <LoginRevealContext.Provider value={value}>
      {children}
      {overlayVisible ? <LoginRevealOverlay onDone={finishReveal} /> : null}
    </LoginRevealContext.Provider>
  );
}

export function useLoginReveal() {
  const ctx = useContext(LoginRevealContext);
  if (!ctx) throw new Error("useLoginReveal deve ser usado dentro de LoginRevealProvider");
  return ctx;
}
