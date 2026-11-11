import { LOCATED_IN, cells, certainValue, contentsOf, declareFunctional, isAffirmed, isShopWare, move, perceivedOf, placeOf, settledWorld, tell, value } from "./world.mjs";
import { historyHeads } from "./world-history.mjs";
import { address } from "@red-cup-engineering/knowledge-system-server/signcell";
import { settleHistory } from "./world-settlement.mjs";

/**
 * One actor-relative native eligibility reading shared by discovery and the
 * existing take actuator. This is not a new permission or object registry.
 * Unsettled location/fixed/kind claims do not authorize moving an object.
 */
/** Current original Thing custody, not the UI, authorizes container effects.
 * Missing, contested, foreign and invisible properties never grant access. */
export function ownedContainerRefusal(world,actor,target,{requireOpen=false}={}) {
  const room=placeOf(world,actor);
  if(typeof room!=="string"||typeof target!=="string"
    ||certainValue(world,target,"kind")!=="container"
    ||certainValue(world,target,"owner")!==actor
    ||![actor,room].includes(placeOf(world,target)))
    return "You cannot use that container.";
  if(requireOpen && certainValue(world,target,"open")!==true)
    return "That container is closed.";
  return null;
}
export function takeRefusal(world, actor, target) {
  const room = certainValue(world, actor, LOCATED_IN);
  if (typeof target !== "string" || typeof room !== "string"
      // A definite same-room Thing is already in the actor's original
      // perceivedOf() room set; recomputing sight and all contents on EACH
      // take would be redundant and costly on the one-core MUD host.
      || certainValue(world, target, LOCATED_IN) !== room
      || !["thing","object","container"].includes(certainValue(world,target,"kind")))
    return "not-takeable";
  if(["container","object"].includes(certainValue(world,target,"kind"))
    && cells(world,target,"owner").length>0
    && certainValue(world,target,"owner")!==actor)
    return "not-takeable";
  if(cells(world,target,"owner").length>0 && certainValue(world,target,"owner")===null)
    return "not-takeable";
  const fixed = cells(world, target, "fixed");
  if (fixed.length !== 0 && certainValue(world, target, "fixed") !== false)
    return "not-takeable";
  return isShopWare(world, target) ? "shop-ware" : null;
}

/** Current affordances for an actually perceived actor-target pair. */
export function affordances(world, actor, target) {
  if (!perceivedOf(world, actor).subjects.includes(target)) return Object.freeze([]);
  const actions = ["examine"];
  if (takeRefusal(world, actor, target) === null) actions.push("take");
  if (["thing","object","container"].includes(certainValue(world,target,"kind"))
      && placeOf(world,target)===actor) actions.push("drop");
  if(ownedContainerRefusal(world,actor,target)===null) {
    const opened=certainValue(world,target,"open")===true;
    actions.push(opened?"close":"open");
    if(opened)actions.push("put","get");
  }
  // 'say' is room-scoped speech, never an interaction directed at this target.
  return Object.freeze(actions.sort());
}

export function inhabit(world, actor, body) {
  if (!perceivedOf(world, actor).subjects.includes(body)) throw new Error("body is outside the actor's perception");
  return tell(declareFunctional(world, ["playing-as"]), { subject: actor, predicate: "playing-as", object: body }, { source: "feltos.predication.inhabit" });
}

export function bodyOf(world, actor) { return value(world, actor, "playing-as") ?? actor; }

export function release(world, actor) {
  return tell(declareFunctional(world, ["playing-as"]), { subject: actor, predicate: "playing-as", object: actor }, { source: "feltos.predication.release" });
}

export function entangle(world, left, right, relation = "encountered") {
  return tell(world, [
    { subject: left, predicate: `entangled:${relation}`, object: right },
    { subject: right, predicate: `entangled:${relation}`, object: left },
  ], { source: "feltos.predication.entangle" });
}

export function entanglements(world, subject, relation = "encountered") {
  return Object.freeze(settledWorld(world).filter((cell) => cell.subject === subject && cell.predicate === `entangled:${relation}` && isAffirmed(cell.evidence)).map(({ object }) => object));
}

/**
 * Derive a World observation through SignCraft's finite cellular closure.
 * Rules are native SignChain rules; SignCraft retains their premise and rule
 * witnesses in one atomic history revision. Functional conclusions refuse:
 * replacement of a world value remains an explicit host transition.
 */
export function closeWorld(world, rules) {
  if (arguments.length > 2) throw new TypeError("closeWorld: closure options are not supported");
  const result = settleHistory(world, rules);
  return Object.freeze({ world: result.history, settlement: result.settlement, added: result.added });
}

export function isSettledDead(world, subject) {
  return value(world, subject, "condition") === "dead" || Number(value(world, subject, "health") ?? 1) <= 0;
}

export function foldWord(world, left, right, witnesses) {
  if (!Array.isArray(witnesses) || witnesses.length === 0) return Object.freeze({ world, word: null });
  const word = `word:${address({ subject: left, predicate: "fold", object: { right, witnesses, heads: historyHeads(world) } }).split(";").at(-1)}`;
  world = tell(world, [
    { subject: word, predicate: "kind", object: "word" },
    { subject: word, predicate: "from", object: left },
    { subject: word, predicate: "from", object: right },
    ...witnesses.map((witness) => ({ subject: word, predicate: "witness", object: witness })),
  ], { source: "feltos.predication.fold" });
  world = move(world, word, left, { source: "feltos.predication.fold" });
  return Object.freeze({ world: entangle(world, left, right, "folded"), word });
}

export function unfoldWord(world, word, actor) {
  if (value(world, word, "kind") !== "word") throw new Error("only a word can unfold");
  const being = `unfolded:${word}:${address({ subject: actor, predicate: "unfold", object: { word, heads: historyHeads(world) } }).split(";").at(-1)}`;
  world = tell(world, [
    { subject: being, predicate: "kind", object: "thing" },
    { subject: being, predicate: "name", object: `an echo of ${word}` },
    { subject: being, predicate: "from-word", object: word },
  ], { source: "feltos.predication.unfold" });
  return Object.freeze({ world: move(world, being, placeOf(world, actor) ?? actor), being });
}
