/** Timeline única da saída do login (ms, antes de prefers-reduced-motion). */
export const LOGIN_EXIT_TIMELINE = {
  ringOut: 550,
  /** Morph visual anel → ícone GC no HUD. */
  brandMorph: 360,
  /** Inicia o voo antes do morph terminar (continuidade). */
  morphFlyOverlap: 300,
  /** Inicia o wipe do dashboard no começo do voo (0 = imediato). */
  flyRevealLeadMs: 40,
  revealWipe: 720,
} as const;

export function morphHandoffDelayMs(): number {
  return Math.max(50, LOGIN_EXIT_TIMELINE.brandMorph - LOGIN_EXIT_TIMELINE.morphFlyOverlap);
}
