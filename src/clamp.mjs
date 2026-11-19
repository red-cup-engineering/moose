// clamp01 — one definition for the game content and the world client, which each used to carry a copy.

/** Clamp a value to [0, 1]. */
export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
