import { declareFunctional, isAffirmed, settleSubject, tell, value } from "./world.mjs";

const standingPredicate = (faction) => `standing:${faction}`;
const STANDING_PREFIX = "standing:";

export function standing(world, actor, faction) {
  return Number(value(world, actor, standingPredicate(faction)) ?? 0);
}

export function shiftStanding(world, actor, faction, delta, { rivals = {} } = {}) {
  if (!Number.isFinite(delta)) throw new TypeError("standing delta must be finite");
  const claims = [];
  const changes = [[faction, delta], ...((rivals[faction] ?? []).map((rival) => [rival, -delta]))];
  for (const [name, shift] of changes) {
    claims.push({ subject: actor, predicate: standingPredicate(name), object: Math.max(-100, Math.min(100, standing(world, actor, name) + shift)) });
  }
  return tell(declareFunctional(world, changes.map(([name]) => standingPredicate(name))), claims, { source: "feltos.reputation" });
}

export function reputationReading(world, actor, faction) {
  const score = standing(world, actor, faction);
  return score >= 25 ? "true" : score <= -25 ? "false" : "neither";
}

export function priceMultiplier(world, actor, faction) {
  const score = standing(world, actor, faction);
  if (score <= -75) return null;
  return Math.max(0.6, Math.min(1.5, 1 - score / 250));
}

export function flagCrime(world, actor, severity, { faction = "watch" } = {}) {
  if (!Number.isFinite(severity) || severity <= 0) throw new TypeError("crime severity must be positive");
  const bounty = Number(value(world, actor, "bounty") ?? 0) + severity;
  world = tell(declareFunctional(world, ["bounty"]), { subject: actor, predicate: "bounty", object: bounty }, { source: "feltos.crime" });
  return shiftStanding(world, actor, faction, -severity);
}

/**
 * Every faction `actor` has standing on record with, read straight off its `standing:<faction>`
 * cells (the same predicate family {@link shiftStanding} writes).
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject.
 * @returns {Array<{faction: string, score: number}>} sorted by faction name.
 */
export function actorStandings(world, actor) {
  const standings = [];
  for (const cell of settleSubject(world, actor)) {
    if (!cell.predicate.startsWith(STANDING_PREFIX) || !isAffirmed(cell.evidence)) continue;
    standings.push({ faction: cell.predicate.slice(STANDING_PREFIX.length), score: Number(cell.object) || 0 });
  }
  return standings.sort((left, right) => (left.faction < right.faction ? -1 : left.faction > right.faction ? 1 : 0));
}

export function payBounty(world, actor) {
  const bounty = Number(value(world, actor, "bounty") ?? 0);
  const coin = Number(value(world, actor, "coin") ?? 0);
  if (coin < bounty) throw new Error("insufficient coin to pay bounty");
  return tell(declareFunctional(world, ["bounty", "coin"]), [
    { subject: actor, predicate: "coin", object: coin - bounty },
    { subject: actor, predicate: "bounty", object: 0 },
  ], { source: "feltos.crime.payment" });
}
