import { certainValue, subjects } from "./world.mjs";

export const CANONICAL_EXTERNAL_IDENTITY = "canonical-identity";

/**
 * One subject that may originate autonomous world actions.
 *
 * NPCs are read from the current carrier. A dynamically joined body is
 * also an inhabitant when it is one of the engine's actors and carries a
 * canonical external-identity binding. The latter is how an external actor can
 * inhabit a world without masquerading as an authored NPC.
 */
export function isInhabitant(world, actors, subject) {
  const kind=certainValue(world,subject,"kind");
  const authoredNpc = kind === "npc";
  const externalActor = actors.includes(subject)
    && kind === "actor"
    && typeof certainValue(world, subject, CANONICAL_EXTERNAL_IDENTITY) === "string";
  return authoredNpc || externalActor;
}

export function inhabitants(world, actors) {
  return Object.freeze(
    subjects(world).filter((subject) => isInhabitant(world, actors, subject)),
  );
}
