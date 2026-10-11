/** Mesmo tamanho do `brand__mark` na sidebar (2.5rem). */
export function brandMarkSizePx(): number {
  if (typeof window === "undefined") return 40;
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return 2.5 * root;
}

/** Posição inicial do ícone no centro da viewport (tamanho final do GC, não o anel). */
export function handoffStartRect(): DOMRect {
  const size = brandMarkSizePx();
  return new DOMRect(
    window.innerWidth / 2 - size / 2,
    window.innerHeight / 2 - size / 2,
    size,
    size,
  );
}

/** Estimativa da posição do brand__mark na sidebar (desktop). */
export function estimateBrandMarkRect(): DOMRect {
  if (typeof window === "undefined") {
    return new DOMRect(20, 20, 40, 40);
  }

  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const size = brandMarkSizePx();
  const left = 0.75 * root + 0.5 * root;
  const top = 0.75 * root + 0.35 * root;

  if (window.innerWidth <= 900) {
    return new DOMRect(20, 20, size, size);
  }

  return new DOMRect(left, top, size, size);
}

export function resolveBrandMarkTarget(): DOMRect {
  const target = document.querySelector("[data-brand-handoff-target]");
  if (target) {
    const rect = target.getBoundingClientRect();
    if (rect.width > 1 && rect.height > 1) {
      return rect;
    }
  }
  return estimateBrandMarkRect();
}

/** Duração do voo alinhada ao deslocamento do anel HUD. */
export function handoffFlyDurationMs(from: DOMRect, to: DOMRect): number {
  const distance = Math.hypot(to.left - from.left, to.top - from.top);
  const ringTravel = Math.max(window.innerWidth * 0.22, 220);
  const baseMs = 480;
  const scaled = Math.round((distance / ringTravel) * baseMs);
  return Math.min(980, Math.max(560, scaled));
}
