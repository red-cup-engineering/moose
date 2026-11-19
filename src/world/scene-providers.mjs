// scene-providers — what MOOSE hands QwzSpace's renderer when it mounts a view. QwzSpace draws no
// terrain and no inhabited-world forms of its own; a caller supplies them. Here the terrain is
// FeltOS's heightfield, and the forms are the habitat drawables this package received.
import { decodeHeightfield, heightAt } from "../geometry.mjs";
import { HABITAT_DRAWABLES, HABITAT_BOUNDS } from "../game-content/habitat-drawables.mjs";

/** The terrain provider: `{ decodeHeightfield(bytes, spec) -> samples, heightAt(samples, layout, x, y) -> metres }`. */
export const feltosHeightfield = Object.freeze({ decodeHeightfield, heightAt });

/** The extra drawable kinds: `{ kinds, bounds }`, as `createSceneGraph({ drawables })` takes them. */
export const habitatDrawables = Object.freeze({ kinds: HABITAT_DRAWABLES, bounds: HABITAT_BOUNDS });

/** Spread into `createSceneView`, `createBackend` (render-3d), `createSceneViewport` or `mountBrowserRenderer`. */
export const sceneProviders = Object.freeze({ heightfield: feltosHeightfield, drawables: habitatDrawables });
