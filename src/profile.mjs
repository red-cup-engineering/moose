import { contentsOf, value } from "./world.mjs";
import { actorSkills } from "./skills.mjs";
import { actorStandings } from "./reputation.mjs";

/**
 * profile.mjs — actor self/other-inspection (2026-09-01 web-transport verb-parity lot, filed from
 * farstone-services-section/data/records/2026-09-01-first-founder-playtest.json). Backs `look me`/
 * `look self` (engine.mjs) and `finger <name>` (mud-server.mjs). Adapted (not ported) from TAB's
 * finger.fnl/whoami.fnl shape: reports only what identity.mjs/skills.mjs/reputation.mjs actually
 * track, never an invented field (no account-creation time, no "system relationships").
 */

function displayName(world, subject) {
  const name = value(world, subject, "name");
  return typeof name === "string" ? name : subject;
}

/**
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject.
 * @returns {string} the actor's current `role` fact, or "unset" when it has none (an actor from a
 *   game that never wires identity.mjs's welcome/register/login flow).
 */
export function actorRole(world, actor) {
  const role = value(world, actor, "role");
  return typeof role === "string" ? role : "unset";
}

/**
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject.
 * @returns {string} one line summarizing every skill {@link import("./skills.mjs").actorSkills}
 *   reports, or an honest "no skills practiced yet" when there are none.
 */
export function skillsSummaryLine(world, actor) {
  const skills = actorSkills(world, actor);
  if (skills.length === 0) return "no skills practiced yet";
  return skills.map(({ skill, level, tier }) => `${skill} (${tier}, ${Math.round(level)})`).join(", ");
}

/**
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject.
 * @returns {string} one line summarizing every faction {@link import("./reputation.mjs").actorStandings}
 *   reports, or an honest "no standing on record" when there are none.
 */
export function standingSummaryLine(world, actor) {
  const standings = actorStandings(world, actor);
  if (standings.length === 0) return "no standing on record";
  return standings.map(({ faction, score }) => `${faction}: ${score}`).join(", ");
}

/**
 * The `look me`/`look self` rendering: what an actor honestly knows about ITSELF, including its
 * own carried things (a self-inspection reads its own inventory; {@link describeActorProfile},
 * the OTHER-facing `finger` view below, deliberately does not).
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject.
 * @returns {string} a multi-line self-description.
 */
export function describeActorSelf(world, actor) {
  const carried = contentsOf(world, actor);
  return [
    displayName(world, actor),
    `Role: ${actorRole(world, actor)}`,
    carried.length === 0 ? "Carrying: nothing" : `Carrying: ${carried.map((id) => displayName(world, id)).join(", ")}`,
    `Skills: ${skillsSummaryLine(world, actor)}`,
  ].join("\n");
}

/**
 * The `finger <name>` rendering: what any connected player may honestly see of ANOTHER actor —
 * name, role, skills, standing. No inventory (a look-me/self-inspection concern, not a public
 * profile one) and no account-creation timestamp (feltos never records one; TAB's finger.fnl
 * does, this module does not invent it).
 * @param {object} world a FeltOS world.
 * @param {string} actor the actor subject being fingered.
 * @returns {string} a multi-line profile.
 */
export function describeActorProfile(world, actor) {
  return [
    displayName(world, actor),
    `Role: ${actorRole(world, actor)}`,
    `Skills: ${skillsSummaryLine(world, actor)}`,
    `Standing: ${standingSummaryLine(world, actor)}`,
  ].join("\n");
}
