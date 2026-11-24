// FeltOS's ordered assertion edition predates SignCraft history. Its sequence
// assigns one ordinal to each observation, including repeated and opposed claims.
import { readingOfWire } from "@red-cup-engineering/metrologic/four";
import { defineGame, instantiateGame } from "./game.mjs";
import { createWorld, replayWorld, settledWorld } from "./world.mjs";

function receivedClaim(assertion) {
  return { subject: assertion.subject, predicate: assertion.predicate, object: assertion.object,
    ...(assertion.evidence === undefined ? {} : { evidence: readingOfWire(assertion.evidence) }) };
}

export function gameFromOrderedSnapshot(source) {
  return defineGame({ ...source, assertions: source.assertions?.map(receivedClaim) });
}

export function worldFromOrderedSnapshot(saved, game) {
  if (saved.kind !== "feltos.world-snapshot.v1" || !Array.isArray(saved.assertions) ||
      saved.sequence !== saved.assertions.length || !Array.isArray(saved.functionalPredicates)) {
    throw new TypeError("Invalid ordered world snapshot");
  }
  const observations = saved.assertions.map((assertion, index) => {
    if (assertion?.sequence !== index + 1 || typeof assertion.source !== "string" || !assertion.source) {
      throw new TypeError("Invalid ordered world assertion at " + (index + 1));
    }
    return { claims: receivedClaim(assertion), source: assertion.source };
  });
  const initial = createWorld({ functionalPredicates: [...saved.functionalPredicates, ...(game?.functionalPredicates ?? [])] });
  if (game) {
    // The old edition had rooms but no enclosing Dimension, World or Area.
    // Add only the newly required topology. Never replay the authored initial
    // inventory, stock, doors or actor locations over a played save.
    const enclosing = new Set([game.dimension, ...Object.keys(game.worlds), ...Object.keys(game.areas)]);
    if (saved.assertions.some(assertion => enclosing.has(assertion.subject))) {
      throw new TypeError("Saved subject collides with the enclosing game topology");
    }
    const recordedParents = new Set(saved.assertions.filter(a => a.predicate === "part-of").map(a => a.subject));
    const claims = settledWorld(instantiateGame(game)).filter(claim =>
      enclosing.has(claim.subject) || claim.predicate === "part-of" && !recordedParents.has(claim.subject));
    observations.unshift({ claims, source: game.id + ":snapshot-topology" });
  }
  return replayWorld(initial, observations);
}
