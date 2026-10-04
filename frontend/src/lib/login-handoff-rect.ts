/** Posição inicial do ícone no centro da viewport (após morph). */
export function handoffStartRect(iconRect: DOMRect): DOMRect {
  const width = iconRect.width;
  const height = iconRect.height;
  return new DOMRect(
    window.innerWidth / 2 - width / 2,
    window.innerHeight / 2 - height / 2,
    width,
    height,
  );
}

/** Duração do voo alinhada ao deslocamento do anel HUD (~--hud-t-ring-move para --ring-travel). */
export function handoffFlyDurationMs(from: DOMRect, to: DOMRect): number {
  const distance = Math.hypot(to.left - from.left, to.top - from.top);
  const ringTravel = Math.max(window.innerWidth * 0.22, 220);
  const baseMs = 550;
  const scaled = Math.round((distance / ringTravel) * baseMs);
  return Math.min(1100, Math.max(baseMs, scaled));
}
