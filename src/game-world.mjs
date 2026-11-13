import { parseNiUri } from "@red-cup-engineering/uri-engineering-services-section/ni-uri";
import { certainValue, LOCATED_IN } from "./world.mjs";

/** Source references are admitted by their original URI owner. They are not
 * character handles and do not confer control of the referenced Thing. */
export function sourceReference(value, label) {
  try { parseNiUri({ uri: value }); }
  catch { throw new TypeError(`${label} must be an original content-addressed Thing reference`); }
  return value;
}

/** The same current native place premise serves admission, discovery and
 * execution. A source selection never turns an opposed ancestry into a grant. */
export function gamePlaceIsCurrent(game, world, place) {
  const kind = certainValue(world, place, "kind");
  if (game.worldSource !== "history") return ["room", "area"].includes(kind);
  // The original Thing supplier admits Area located-in World, and World
  // located-in Dimension. Parthood never supplies either spatial premise.
  const owner = certainValue(world, place, LOCATED_IN);
  const typed = (subject, type) => certainValue(world, subject, "kind") === type
    && typeof certainValue(world, subject, "thing-type") === "string"
    && certainValue(world, subject, "thing-type").length > 0;
  if (kind !== "area" || !typed(place, "area") || !typed(owner, "world")
      || !typed(game.dimension, "dimension") || certainValue(world, owner, LOCATED_IN) !== game.dimension)
    return false;
  try {
    sourceReference(place, "game place");
    sourceReference(owner, "game place World");
    sourceReference(game.dimension, "game Dimension");
  } catch { return false; }
  return true;
}
