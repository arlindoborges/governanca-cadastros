/** Timeline única da saída do login (ms, antes de prefers-reduced-motion). */
export const LOGIN_EXIT_TIMELINE = {
  ringOut: 550,
  /** Morph visual anel → ícone GC no HUD. */
  brandMorph: 360,
  /** Inicia o voo antes do morph terminar (continuidade). */
  morphFlyOverlap: 140,
  /** Revela o dashboard antes do ícone encostar no canto. */
  flyRevealOverlap: 0.12,
  revealWipe: 880,
} as const;

export function morphHandoffDelayMs(): number {
  return Math.max(80, LOGIN_EXIT_TIMELINE.brandMorph - LOGIN_EXIT_TIMELINE.morphFlyOverlap);
}
