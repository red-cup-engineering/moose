import { declareFunctional, isAffirmed, settleSubject, tell, value } from "./world.mjs";

export const SKILL_CAP = 100;
/** The functional predicate holding an actor's level in `skill`. */
export const skillPredicate = (skill) => `skill:${skill}`;
const predicate = skillPredicate;
const SKILL_PREFIX = "skill:";

export function skillLevel(world, actor, skill) {
  return Number(value(world, actor, predicate(skill)) ?? 0);
}

export function skillTier(level) {
  if (level >= 90) return "master";
  if (level >= 70) return "expert";
  if (level >= 45) return "journeyman";
  if (level >= 20) return "apprentice";
  return "novice";
}

export function practice(world, actor, skill, effort = 1) {
  if (typeof effort !== "number" || !Number.isFinite(effort) || effort <= 0) throw new TypeError("practice effort must be positive and finite");
  const prior = skillLevel(world, actor, skill);
  const gained = effort * Math.max(0, 1 - prior / SKILL_CAP);
  const level = Math.min(SKILL_CAP, prior + gained);
  return Object.freeze({
    prior,
    gained,
    level,
    tier: skillTier(level),
    world: tell(declareFunctional(world, [predicate(skill)]), { subject: actor, predicate: predicate(skill), object: level }, { source: "feltos.skills" }),
  });
}

export function effectiveSkill(world, actor, skill, synergies = {}) {
  const related = synergies[skill] ?? [];
  const bonus = related.reduce((sum, relatedSkill) => sum + skillLevel(world, actor, relatedSkill) * 0.2, 0);
  return Math.min(SKILL_CAP, skillLevel(world, actor, skill) + bonus);
}

/**
 * Every skill `actor` has practiced, read straight off its `skill:<name>` cells (the same
 * predicate family {@link practice} writes) — never a separate registry, so an actor's `skills`
 * command can never disagree with what {@link practice} actually recorded.
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject.
 * @returns {Array<{skill: string, level: number, tier: string}>} sorted by skill name.
 */
export function actorSkills(world, actor) {
  const skills = [];
  for (const cell of settleSubject(world, actor)) {
    if (!cell.predicate.startsWith(SKILL_PREFIX) || !isAffirmed(cell.evidence)) continue;
    const level = Number(cell.object) || 0;
    skills.push({ skill: cell.predicate.slice(SKILL_PREFIX.length), level, tier: skillTier(level) });
  }
  return skills.sort((left, right) => (left.skill < right.skill ? -1 : left.skill > right.skill ? 1 : 0));
}
