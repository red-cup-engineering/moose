import {admitIntentOrigin,intentIsCurrent} from './intent-origin.mjs';
import { requireJsonValue, copyJson, freezeJson } from "@red-cup-engineering/json-services-section";
import { readWorld, rebindWorldReading, isWorldReading, worldReadingOccurrenceFrameIsCurrent } from "./world-reading.mjs";
import { isInhabitant } from "./inhabitants.mjs";
import { captureHistoryReads, historyHeads, historySize, historySection, mergeHistories } from "./world-history.mjs";
import Cell from "./world-cell.mjs";
import { admitProposals } from "@red-cup-engineering/gaming/running/proposals";
import { worldMethods, requirementFailures } from './actions.mjs';
import { cells, certainValue, territoryOf, subjects, exitsOf, exitDestinationOf, regionOf, REGION, POSE, queryWorld } from './world.mjs';
import { admitGameWorld, defineGame, instantiateGame } from "./game.mjs";
import { gamePlaceIsCurrent } from "./game-world.mjs";
import { contentsOf, declareFunctional, earshotOf, isAffirmed, move, perceive, placeOf, tell, transferItem, value, values, witnessesOf } from "./world.mjs";
import { ownedContainerRefusal, takeRefusal } from "./predication.mjs";
import { EMPTY_RUNTIME } from "./capabilities.mjs";
import { ROLE_REGISTERED, hasVoice } from "./identity-roles.mjs";
import { describeActorSelf, skillsSummaryLine, standingSummaryLine } from "./profile.mjs";
import { actorSkills } from "./skills.mjs";
import { CHARACTER_ALIASES, readAliasBook, changeAlias, observeCommandHistory } from "./character-aliases.mjs";

const { address } = Cell;

// A read context is transient operation input, never engine/snapshot state.
// Synchronous operation-local read frames. Nested admissions contribute their consulted
// contexts to the enclosing operation too; nothing is persisted or reused as authority.
let activeReadingFrames;
const readingAt = (reading, world) => {
  if (reading===undefined) return world;
  const bound=reading.carrier===world && isWorldReading(reading) ? reading : rebindWorldReading(reading,world);
  for(let scope=activeReadingFrames;scope;scope=scope.parent) scope.readings.add(bound);
  return bound;
};
function withReadingFrames(engine,reading,run) {
  if (!isWorldReading(reading)) return run();
  if (!worldReadingOccurrenceFrameIsCurrent(reading)) return staleReading(engine,reading);
  for(let parent=activeReadingFrames;parent;parent=parent.parent)parent.readings.add(reading);
  const scope={parent:activeReadingFrames,readings:new Set([reading])};activeReadingFrames=scope;
  try {
    const current=()=>{
      const seen=new WeakMap();
      for(const held of scope.readings) {
        if(held.occurrenceVersion===undefined) continue;
        let versions=seen.get(held.carrier);if(!versions)seen.set(held.carrier,versions=new Set());
        if(versions.has(held.occurrenceVersion))continue;versions.add(held.occurrenceVersion);
        if(!worldReadingOccurrenceFrameIsCurrent(held))return false;
      }
      return true;
    };
    let result;
    try { result=run(); }
    catch(error) {
      // A changed archive may make native merge/materialization refuse before final
      // admission. Report that observed staleness; preserve unrelated source errors.
      if(!current())return staleReading(engine,reading);
      throw error;
    }
    return current()?result:staleReading(engine,reading);
  } finally { activeReadingFrames=scope.parent; }
}

// An operation only rechecks intents whose handlers ran. Initially stale work is
// retained as deferred; nested beats contribute to the outer rollback boundary.
let activeIntentAdmission;
const staleOrigin=(engine,intents)=>Object.freeze({engine,receipt:Object.freeze({
  kind:'feltos.stale-origin-receipt.v1',status:'stale-origin',tick:engine.tick,
  intents:Object.freeze([...engine.queue]),deferred:Object.freeze(intents.map(intent=>Object.freeze({intent,reason:'origin-not-current'}))),
  admission:null,events:Object.freeze([]),worldSequence:historySize(engine.world),
})});
function withIntentAdmission(engine,validate,budget,run) {
  if(validate!==undefined && typeof validate!=='function')fail('intent validator must be a function');
  const scope={parent:activeIntentAdmission,executed:new Map(),budget,used:new Map()};activeIntentAdmission=scope;
  const invalid=()=>[...scope.executed].filter(([intent,validators])=>[...validators].some(validator=>!intentIsCurrent(intent,validator))).map(([intent])=>intent);
  try {
    let result;
    try{result=run();}catch(error){const stale=invalid();if(stale.length)return staleOrigin(engine,stale);throw error;}
    const stale=invalid();return stale.length?staleOrigin(engine,stale):result;
  }finally{activeIntentAdmission=scope.parent;}
}
function intentBudgetAvailable(intent) {
  for(let scope=activeIntentAdmission;scope;scope=scope.parent)
    if(scope.budget!==undefined && (scope.used.get(intent.actor)??0)>=scope.budget)return false;
  return true;
}
function enrollIntent(intent,validate) {
  for(let scope=activeIntentAdmission;scope;scope=scope.parent){
    if(!scope.executed.has(intent))scope.executed.set(intent,new Set());
    scope.executed.get(intent).add(validate);
    scope.used.set(intent.actor,(scope.used.get(intent.actor)??0)+1);
  }
}

// Source freshness is supplied by the source owner; a content hash is not admission.
function requireReadingAdmission(reading, isReadingCurrent) {
  if (reading === undefined) {
    if (isReadingCurrent !== undefined) fail("reading validation requires a reading");
    return;
  }
  if (!isWorldReading(reading) || typeof isReadingCurrent !== "function")
    fail("a projected operation requires its reading and current-edition validator");
}
const isCurrent = (reading, isReadingCurrent) => reading === undefined || isReadingCurrent(reading) === true;
const staleReading = (engine, reading) => Object.freeze({
  engine,
  receipt: Object.freeze({kind:"feltos.stale-reading-receipt.v1", status:"stale-reading",
    tick:engine.tick, readingVersion:reading.readingVersion, intents:Object.freeze([...engine.queue]),
    admission:null, events:Object.freeze([]), worldSequence:historySize(engine.world)}),
});

const ACTOR_IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const SELF_LOOK_TOKENS = Object.freeze(["me", "self"]);
const CORE_COMMANDS = Object.freeze(["alias", "unalias", "history", "where", "worlds", "commands", "close", "drop", "emote", "examine", "exits", "get", "give", "go", "help", "if-place", "inventory", "look", "move", "open", "put", "say", "score", "skills", "stats", "take"]);
const DIRECTION_ALIASES = Object.freeze({ n: "north", s: "south", e: "east", w: "west", ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest", u: "up", d: "down" });
// A guarded turn is only a synchronous native, local MUD action. Capability
// extension names and control-plane/federated verbs must never inherit local
// admission's guarantees merely because they were not on a denylist.
const GUARDED_LOCAL_VERBS = new Set([...CORE_COMMANDS, "l", "x", "i", "pose", "'"]);
const CORE_HELP = Object.freeze({
  alias: "alias [name [template]] — list, inspect, or edit a character-owned alias; separate commands with semicolons",
  unalias: "unalias <name> — remove one character-owned alias",
  history: "history [1..20] — read the original actor-scoped command-admission history, without exposing message arguments",
  where: "where — show your dimension, world, area and place",
  worlds: "worlds — discover the worlds in this dimension; go follows their exits",
  commands: "commands — list your currently eligible commands",
  close: "close <container> — close an owned container",
  drop: "drop <thing> — leave something you carry in the room",
  emote: "emote <action> — act visibly to everyone who can see you",
  examine: "examine <thing> — inspect a visible thing (short form: x)",
  exits: "exits — list the visible ways out of this room",
  get: "get <thing> — take a visible thing",
  give: "give <thing> to <person> — hand a carried thing to someone here",
  go: "go <exit> — travel through a visible exit",
  help: "help [command] — show available commands or help for one command",
  "if-place": "if-place <exact-room-id> -- <native-command> — admit one original MUD action only if you are still in that room; does not fence external messages or Sessions",
  inventory: "inventory — list what you carry (short form: i)",
  look: "look [thing] — examine the room, something visible, or yourself (look me / look self)",
  move: "move <exit> — travel through a visible exit",
  open: "open <container> — open an owned container",
  put: "put <thing> in <container> — place one carried Thing in an owned open container",
  say: "say <message> — speak aloud to everyone within earshot",
  score: "score — show your character's place, possessions, coin, and standing (alias: stats)",
  skills: "skills — show your practiced skills and their tiers",
  stats: "stats — alias for score",
  take: "take <thing> — pick up a visible thing",
});
// CONTROL_PLANE_HELP — identity/talker verbs handled OUTSIDE this deterministic queue (see
// control-plane.mjs), listed here only so `help`/`commands` teach the real current verb set;
// dispatching them is the transport's job (telnet.mjs/http.mjs/farstone's WS room), never this
// module's execute().
const CONTROL_PLANE_HELP = Object.freeze({
  chat: "chat <message> — speak on the shared channel, crossing rooms (requires voice)",
  finger: "finger <name> — show a connected player's profile",
  login: "login <name> <password> — authenticate an existing account and gain voice",
  message: "message <someone@instance> <words or {verb,input}> — address another actor (registered account required)",
  invoke: "invoke <world-method> <JSON input> — request the offered actor operation (registered account required)",
  messages: "messages [cursor] — read your retained actor inbox (registered account required)",
  quit: "quit — end your session",
  register: "register <name> — claim an account and gain voice",
  tell: "tell <name> <message> — send a private message (requires voice)",
  who: "who — list connected players",
  whoami: "whoami — show your current name",
});

function controlPlaneVerbsFor(world, actor) {
  const voiced = hasVoice(world, actor);
  return Object.keys(CONTROL_PLANE_HELP)
    .filter((verb) => (verb === "register" || verb === "login" ? !voiced : verb === "message" || verb === "messages" || verb === "invoke" ? certainValue(world,actor,"role")===ROLE_REGISTERED : true))
    .sort(compareText);
}

// LEVENSHTEIN_MAX_DISTANCE — how close an unrecognized verb must be to a real command before
// teachUnknownCommand offers it as "Did you mean"; beyond this, two words no longer look like the
// same typo (see teachUnknownCommand below).
const LEVENSHTEIN_MAX_DISTANCE = 2;

function levenshteinDistance(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const distances = Array.from({ length: rows }, (_unused, row) => [row, ...Array(cols - 1).fill(0)]);
  for (let col = 1; col < cols; col += 1) distances[0][col] = col;
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      distances[row][col] = Math.min(
        distances[row - 1][col] + 1,
        distances[row][col - 1] + 1,
        distances[row - 1][col - 1] + cost,
      );
    }
  }
  return distances[rows - 1][cols - 1];
}

// teachUnknownCommand — the founder's own playtest finding: "unknown-command response teaches
// nothing; should surface available verbs or route to help" (2026-09-01-first-founder-playtest).
// Offers the nearest real verb (engine + control-plane) within LEVENSHTEIN_MAX_DISTANCE, and
// always points at `help` regardless.
function teachUnknownCommand(verb, availableCommands, controlPlaneVerbs) {
  const candidates = [...availableCommands, ...controlPlaneVerbs];
  let nearest = null;
  let nearestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = levenshteinDistance(verb, candidate);
    if (distance < nearestDistance) { nearestDistance = distance; nearest = candidate; }
  }
  const suggestion = nearestDistance <= LEVENSHTEIN_MAX_DISTANCE && nearest !== null ? ` Did you mean "${nearest}"?` : "";
  return `Unknown command: ${verb}.${suggestion} Type help for the full list.`;
}

function fail(message) {
  throw new TypeError(message);
}

function freezeEngine(engine) {
  return Object.freeze({
    ...engine,
    actors: Object.freeze([...engine.actors].sort(compareText)),
    queue: Object.freeze([...engine.queue]),
  });
}

export function createEngine(game, { world } = {}) {
  if (game?.kind !== "feltos.game.v1") fail("createEngine requires a defined game");
  if (game.worldSource === "history") {
    game = defineGame(game);
    if (world === undefined) fail("a history-backed game requires its admitted original World");
  }
  const carrier = world === undefined ? instantiateGame(game) : admitGameWorld(game, world);
  return freezeEngine({
    kind: "feltos.engine.v1",
    game,
    world: carrier,
    actors: [],
    tick: 0,
    nextIntent: 1,
    queue: [],
  });
}

/** Join is a control-plane admission, not a simulation tick. */
export function join(engine, actor, { at = engine.game.start, name = actor, reading } = {}) {
  if (engine?.kind !== "feltos.engine.v1") fail("join requires a FeltOS engine");
  if (typeof actor !== "string" || !ACTOR_IDENTIFIER.test(actor)) fail("actor must be a stable lowercase identifier");
  if (cells(engine.world,actor,'kind').length&&certainValue(engine.world,actor,'kind')!=='actor') fail(`actor id collides with game content: ${actor}`);
  if (!gamePlaceIsCurrent(engine.game,readingAt(reading,engine.world),at)) fail(`unknown or contested join place: ${String(at)}`);
  if (typeof name !== "string" || name.trim().length === 0) fail("actor name must be non-empty text");
  if (engine.actors.includes(actor)) return engine;
  let world = move(engine.world, actor, at, { source: "feltos.join", reading: readingAt(reading,engine.world) });
  world = tell(world, [
    { subject: actor, predicate: "kind", object: "actor" },
    { subject: actor, predicate: "name", object: name.trim() },
    ...(engine.game.actorAssertions ?? []).map((claim) => ({ ...claim, subject: actor })),
  ], { source: "feltos.join" });
  return freezeEngine({ ...engine, world, actors: [...engine.actors, actor] });
}

export function submit(engine, intent) {
  if (engine?.kind !== "feltos.engine.v1") fail("submit requires a FeltOS engine");
  if (intent === null || typeof intent !== "object" || Array.isArray(intent)) fail("intent must be a record");
  if (!engine.actors.includes(intent.actor)) fail(`actor has not joined: ${String(intent.actor)}`);
  if (typeof intent.command !== "string" || intent.command.trim().length === 0) fail("intent command must be non-empty text");
  const admitted = Object.freeze({
    kind: "feltos.command.v1",
    ordinal: engine.nextIntent,
    actor: intent.actor,
    command: intent.command.trim(),
    ...(Object.hasOwn(intent,"origin") ? {origin:admitIntentOrigin(intent.origin)} : {}),
  });
  return freezeEngine({
    ...engine,
    nextIntent: engine.nextIntent + 1,
    queue: [...engine.queue, admitted],
  });
}

// A command that throws still rejects the whole operation, so the caller keeps its engine and may
// retry. The error names the queued intent that threw, so a host can settle that one intent instead of
// running it again in every later round, ahead of every other actor. Nested admissions rename the
// failure as it rises; the outermost round's intent is the one in the caller's queue.
const FAILED_INTENT = Symbol("feltos.failed-intent");
function markFailedIntent(error, intent) {
  if (error !== null && typeof error === "object" && Object.isExtensible(error))
    Object.defineProperty(error, FAILED_INTENT, { value: intent, configurable: true });
  return error;
}

/** The queued intent whose command threw `error` in an admission round, or undefined. */
export function failedIntentOf(error) {
  return error !== null && typeof error === "object" ? error[FAILED_INTENT] : undefined;
}

export function message(to, text, channel = "system") {
  return Object.freeze({ kind: "feltos.message.v1", to, channel, text });
}

function displayName(world, subject) {
  const name = value(world, subject, "name");
  return typeof name === "string" ? name : /^actor:/u.test(subject) ? subject.split(":").pop().slice(0, 8) : subject;
}

/** World-qualified object resolution for the common MUD noun parser.
 * Ambiguous display names are NOT authority to choose the first item. Exact
 * original IDs retain priority. Candidates are only from already visible or
 * actually carried sources, so a refusal discloses no other room's Things.
 */
function chooseNamed(world, token, candidates) {
  const needle = token.toLowerCase();
  const identified = candidates.find(subject => subject === token);
  if (identified !== undefined) return Object.freeze({ subject: identified, alternatives: [] });
  const named = candidates.filter(subject => displayName(world, subject).toLowerCase() === needle);
  return Object.freeze({ subject: named.length === 1 ? named[0] : null,
    alternatives: named.length > 1 ? Object.freeze(named) : Object.freeze([]) });
}
function resolveVisible(world, actor, token) {
  return chooseNamed(world, token, perceive(world, actor).subjects);
}
function chooseCarried(world, actor, token) {
  return chooseNamed(world, token, contentsOf(world, actor));
}
function ambiguousNoun(verb, token, alternatives) {
  // Preserve identifiers for visible/carryable objects only, with bounded
  // output; never expose the existence of a non-perceived remote Thing.
  const ids = alternatives.slice(0, 8).map(id => String(id).slice(0, 96));
  return `Several things answer to "${token.slice(0, 96)}". Use ${verb} <exact id>: ${ids.join(", ")}${alternatives.length > 8 ? " (and more)" : ""}.`;
}

function currentAliasBook(world, reading, actor) {
  const current = certainValue(reading, actor, CHARACTER_ALIASES);
  if (current === null && (cells(reading, actor, CHARACTER_ALIASES).length > 0
      || cells(world, actor, CHARACTER_ALIASES).length > 0))
    fail("character alias evidence is unknown or contested");
  return readAliasBook(current);
}

function withAliasSchema(world) {
  if (world.functionalPredicates.includes(CHARACTER_ALIASES)) return world;
  // The first core alias operation may introduce its schema through the
  // original owner. Existing source observations must never be reinterpreted.
  if (queryWorld(world, { predicate: CHARACTER_ALIASES }).length > 0)
    fail("existing character alias observations lack an admitted functional schema");
  return declareFunctional(world, [CHARACTER_ALIASES]);
}

function renderRoomView(world, actor) {
  const place = placeOf(world, actor);
  if (place === null) return "You are nowhere.";
  const name = displayName(world, place);
  const description = value(world, place, "description") ?? "";
  const occupants = contentsOf(world, place).filter((subject) => subject !== actor);
  const exits = exitsOf(world,place).map(exit=>exit.direction);
  const lines = [name, String(description)];
  if (occupants.length > 0) lines.push(`Here: ${occupants.map((subject) => displayName(world, subject)).join(", ")}`);
  lines.push(`Exits: ${exits.length > 0 ? exits.join(", ") : "none"}`);
  return lines.join("\n");
}

// Room narration observes nearby inhabitants and contents, but those facts do
// not decide whether travel is legal. Keep presentation reads out of the
// proposal's admission footprint so another character moving cannot block it.
function renderRoom(world, actor) {
  return captureHistoryReads(() => renderRoomView(world, actor)).result;
}

function resolvedExit(world, room, direction) {
  const normalized = DIRECTION_ALIASES[direction.toLowerCase()] ?? direction.toLowerCase();
  const destination = exitDestinationOf(world, room, normalized);
  return typeof destination === "string" ? Object.freeze({ direction: normalized, destination }) : null;
}

function walkingFailure(world, actor, destination, direction, from = placeOf(world, actor), game) {
  if(!['room','area'].includes(certainValue(world,destination,'kind')))return 'That destination is unknown or contested.';
  if(game?.worldSource==='history' && (!gamePlaceIsCurrent(game,world,from)||!gamePlaceIsCurrent(game,world,destination)))
    return 'The original place or World ancestry is unknown or contested.';
  const places = new Set([from, destination,
    ...territoryOf(world, from).path, ...territoryOf(world, destination).path]);
  if ([...places].some(place => cells(world, place, REGION).length > 0 && regionOf(world, place) === null)
      || cells(world, actor, POSE).length > 0 && certainValue(world, actor, POSE) === null)
    return 'The authored region or position is unknown or contested.';
  const requirementCells=cells(world,from,`exit-requires:${direction}`);
  if(requirementCells.length&&certainValue(world,from,`exit-requires:${direction}`)===null)return 'The conditions for this exit are contested.';
  const requirements=certainValue(world,from,`exit-requires:${direction}`)??{};
  const failures=requirementFailures(world,actor,requirements,{place:from});
  if(failures.length)return failures.join('; ');
  if (from === null) return "You are nowhere.";
  const fromParent = certainValue(world, from, "part-of");
  const toParent = certainValue(world, destination, "part-of");
  if ([from, destination].some(place => cells(world, place, "part-of").length > 0
      && certainValue(world, place, "part-of") === null))
    return "The place's containment is unknown or contested.";
  if ([fromParent, toParent].some(parent => parent !== null
      && cells(world, parent, "kind").length > 0 && certainValue(world, parent, "kind") === null))
    return "The containing place's kind is unknown or contested.";
  const fromShip = certainValue(world, fromParent, "kind") === "ship" ? fromParent : null;
  const toShip = certainValue(world, toParent, "kind") === "ship" ? toParent : null;
  if (fromShip !== null || toShip !== null) {
    return fromShip !== null && fromShip === toShip
      ? null
      : "You must board or disembark at a dock; a ship carries its crew between places.";
  }
  if (values(world, destination, "tag").includes("ocean")) {
    return "The open water is no place to walk. Board a vessel to travel there.";
  }
  return null;
}

function validateCapabilityResult(result, fallbackWorld, capabilityId, recipients) {
  if (result === undefined) return { world: fallbackWorld, events: [], handled: true };
  if (result === null || typeof result !== "object" || Array.isArray(result)) fail(`capability ${capabilityId} returned an invalid result`);
  const world = result.world ?? fallbackWorld;
  if (world?.kind !== "signcraft.history") fail(`capability ${capabilityId} returned an invalid world`);
  const events = result.events ?? [];
  if (!Array.isArray(events) || events.some((entry) => entry?.kind !== "feltos.message.v1")) {
    fail(`capability ${capabilityId} returned invalid events`);
  }
  if (result.handled !== undefined && typeof result.handled !== "boolean") fail(`capability ${capabilityId} returned invalid handled state`);
  const suppliedPackages=result.packages;
  const packages=suppliedPackages === undefined ? [] : suppliedPackages;
  if (!Array.isArray(packages)) fail(`capability ${capabilityId} returned invalid packages`);
  const admittedPackages=packages.map(source=>{
    // Admission and delivery must inspect the exact immutable snapshot retained below.
    const entry=freezeJson(copyJson(source));
    requireJsonValue(entry,`capability ${capabilityId} package`);
    if (entry===null || Array.isArray(entry) || typeof entry!=="object"
      || Object.keys(entry).some(key=>!["to","name","data"].includes(key))
      || !recipients.includes(entry.to) || typeof entry.name!=="string" || !entry.name
      || !Object.hasOwn(entry,"data")) fail(`capability ${capabilityId} returned an invalid package recipient or envelope`);
    return entry;
  });
  return { world, events, handled: result.handled !== false,
    ...(admittedPackages.length ? {packages:Object.freeze(admittedPackages)} : {}) };

}

/** Admit a pure direct reading through the same capability output contract.
 * The caller owns source/origin freshness and returns these outputs directly. */
export function validateReadOnlyCapabilityResult(result,world,capabilityId,actor) {
  const admitted=validateCapabilityResult(result,world,capabilityId,[actor]);
  if(admitted.world!==world)fail('direct capability reading cannot carry world effects');
  const events=admitted.events.map(source=>{
    const event=freezeJson(copyJson(source));requireJsonValue(event,'direct reading event');
    if(event.kind!=='feltos.message.v1'||event.to!==actor||typeof event.text!=='string')fail('direct capability reading has an unexpected recipient or event');
    return event;
  });
  return Object.freeze({...admitted,events:Object.freeze(events)});
}

function capabilityContext(engine, intent, verb, argument, runtime, reading) {
  return Object.freeze({
    actor: intent.actor,
    ...(Object.hasOwn(intent,"origin") ? {origin:intent.origin} : {}),
    verb,
    argument,
    command: intent.command,
    automated: typeof intent.internalCapability === "string",
    internalCapability: intent.internalCapability ?? null,
    tick: engine.tick,
    game: engine.game,
    actors: engine.actors,
    world: engine.world,
    reading: reading === undefined ? readWorld(engine.world) : readingAt(reading,engine.world),
    walkTo:destination=>walkTo(engine,intent,destination,runtime,reading),
    contentsOf,
    message,
    move,
    perceive,
    placeOf,
    tell,
    value,
  });
}

/**
 * Source-qualified available actions, shared by the public discovery API and
 * the native command's already-read method frontier. This private projector
 * may NOT be offered on any RPC wire as a caller-supplied list of grants:
 * only current original worldMethods may produce its methods argument.
 */
function projectCurrentActions(engine,actor,view,place,methods) {
  if(!gamePlaceIsCurrent(engine.game,view,place))return Object.freeze([]);
  const eligible=methods.filter(action=>!action.failures.length);
  const moves=place===null?[]:exitsOf(view,place).flatMap(exit=>{
    return walkingFailure(view,actor,exit.destination,exit.direction,place,engine.game)===null?[{command:`go ${exit.direction}`,description:`Go ${exit.direction}`,world:territoryOf(view,exit.destination).world}]:[];
  });
  const characterAliases = readAliasBook(certainValue(view, actor, CHARACTER_ALIASES)).aliases;
  return Object.freeze([
    ...CORE_COMMANDS.map(command=>Object.freeze({command,description:CORE_HELP[command]})),
    ...characterAliases.map(entry=>Object.freeze({command:entry.name,description:"Character alias: "+entry.name})),
    ...eligible.map(({verb,description,world,ref,remote})=>Object.freeze({command:remote?`invoke ${verb}`:verb,description,world,...(ref?{ref}:{}),...(remote?{provider:remote}:{})})),
    ...moves.map(Object.freeze),
  ]);
}
/** One current actor-relative action projection for terminals, agents, frames and host APIs. */
export function availableActions(engine,actor,{runtime=EMPTY_RUNTIME,reading,place=placeOf(readingAt(reading,engine.world),actor),includeMethods=true}={}) {
  if(typeof includeMethods!=="boolean")throw new TypeError("MUD action detail must be a boolean");
  const view=readingAt(reading,engine.world);
  if(!gamePlaceIsCurrent(engine.game,view,place))return Object.freeze([]);
  // Default true preserves the existing full discovery API. A host's routine
  // room/turn presenter can explicitly choose current CORE commands and
  // walkable exits without costing one WORLD METHOD AND CLAIM EVALUATION per
  // every authorized skill on every look, inventory, pulse and message.
  // "commands" and "help" continue to discover the complete CURRENT methods,
  // and actual invocation always rechecks the source owner before execution.
  return projectCurrentActions(engine,actor,view,place,includeMethods
    ? worldMethods(engine,actor,runtime,{place,reading:view}) : []);
}

/** A route is a conditional reading of one current world, never an invented
 * observation that the actor already stands at a future place. Every leg reads
 * that place's rules and the actor's current skills and evidence. */
export function routeFor(engine,actor,target,{runtime=EMPTY_RUNTIME,reading}={}) {
  const view=readingAt(reading,engine.world);
  const from=placeOf(view,actor);
  if(!gamePlaceIsCurrent(engine.game,view,from))return null;
  const reached=typeof target==="function"?target:room=>room===target;
  const queue=[{room:from,steps:[]}],seen=new Set([from]);
  for(let cursor=0;cursor<queue.length;cursor++){
    const current=queue[cursor];
    if(reached(current.room))return Object.freeze({from,destination:current.room,steps:Object.freeze(current.steps)});
    // A leg is walkable exactly when availableActions would offer its `go`: the same exit rules and
    // the actor's skills, read here directly instead of projecting every method of every room passed.
    if(!gamePlaceIsCurrent(engine.game,view,current.room))continue;
    for(const {direction,destination} of exitsOf(view,current.room)){
      if(seen.has(destination)||walkingFailure(view,actor,destination,direction,current.room,engine.game)!==null)continue;
      seen.add(destination);queue.push({room:destination,steps:[...current.steps,Object.freeze({from:current.room,to:destination,command:`go ${direction}`})]});
    }
  }
  return null;
}

// A convenient journey composes the ordinary admitted movement program. It
// rechecks each leg in the state produced by the preceding leg. A refusal or a
// world's alternate movement rule retains its actual consequence and stops.
function walkTo(engine,intent,destination,runtime,reading){
  const route=routeFor(engine,intent.actor,destination,{runtime,reading});
  if(route===null)return {world:engine.world,arrived:false,events:[message(intent.actor,"There is no eligible route to that place.")]};
  let current=engine;const events=[],packages=[];
  for(const leg of route.steps){
    const result=execute(current,{...intent,command:leg.command},runtime,reading);
    current={...current,world:result.world};events.push(...result.events);packages.push(...(result.packages??[]));
    if(placeOf(readingAt(reading,current.world),intent.actor)!==leg.to)return {world:current.world,arrived:false,events,...(packages.length?{packages}:{})};
  }
  return {world:current.world,arrived:true,events,...(packages.length?{packages}:{})};
}

function execute(engine, intent, runtime, reading) {
  const separator = intent.command.search(/\s/u);
  const rawVerb = separator < 0 ? intent.command : intent.command.slice(0, separator);
  const verb = rawVerb.toLowerCase();
  const argument = separator < 0 ? "" : intent.command.slice(separator).trimStart();
  const actor = intent.actor;
  let world = engine.world;
  const view = () => readingAt(reading, world);
  const events = [], packages = [];
  const room = placeOf(view(), actor);
  if (engine.game.worldSource === "history" && !gamePlaceIsCurrent(engine.game, view(), room))
    return { world, events: [message(actor, "Your original place or World ancestry is unknown or contested.")] };
  // This conditional executes WITHIN the original actor's event-sourced
  // admission proposal, after earlier commands of the same round have
  // changed its candidate world. A gateway-side look cannot provide this
  // guarantee. It is not a distributed Session lease or external-send fence.
  if (verb === "if-place") {
    const match = /^([^\s]{1,4096}) -- ([\s\S]+)$/u.exec(argument);
    const expectedPlace = match?.[1] ?? null;
    const inner = match?.[2]?.trim() ?? "";
    const refusal = (status, line) => ({
      world,
      events: [message(actor, line)],
      packages: [Object.freeze({to: actor, name: "FeltOS.IntentPrecondition",
        data: Object.freeze({kind: "feltos.intent-place-precondition/v1",
          expectedPlace, actualPlace: room ?? null, status,
          operation: "not-performed"})})],
    });
    // Only the known original local commands are admissible. An unknown
    // command, a future remote method, a Shop/billing operation or a
    // control-plane message cannot silently acquire an atomicity guarantee.
    const localVerb = inner.split(/\s/u, 1)[0].toLowerCase();
    if (expectedPlace === null || !inner || !GUARDED_LOCAL_VERBS.has(localVerb))
      return refusal("invalid-guarded-command",
        "Use if-place <exact-room-id> -- <local native MUD command>; remote, nested and extension operations are not guarded.");
    if (room !== expectedPlace)
      return refusal("stale-place",
        "Your guarded action was not performed because you are no longer in the observed room. Look again.");
    // Extension methods are intentionally dispatched ahead of native core
    // handlers by this engine. An authored capability named 'emote' (etc.)
    // can carry different effects; do not mislabel that override a local
    // guaranteed core action. Inspect the same original current method
    // eligibility that the normal interpreter will use, and refuse an
    // overriding method rather than changing its regular semantics.
    if (worldMethods(engine, actor, runtime, {reading: view(), verb: localVerb})
      .some(method => method.verb === localVerb && method.failures.length === 0))
      return refusal("shadowed-native-command",
        "The selected world supplies an overriding method for this verb; this local core-command guard cannot admit it.");
    return execute(engine, {...intent, command: inner}, runtime, reading);
  }
  // Original authored methods may override core MUD verbs, so preserve one
  // current method query before dispatch. But projecting EVERY offered command,
  // every route/exit gate and the control-plane verb list on each inventory,
  // look, emote or movement was eager work with no consumer. Discovery is
  // needed for help/commands and unknown-verb suggestions, not routine effects.
  // Evaluate the offered prerequisites ONLY for the requested action.
  // In a world with thousands of skills/spells, unrelated methods and their
  // claims must not be evaluated before 'inventory' or any ordinary move.
  // Full method discovery is qualified afresh only for help, commands, or a
  // genuinely unrecognized verb; never cache an authority menu across Turns.
  // The core engine also accepts conventional MUD punctuation aliases (')
  // and can teach malformed/unknown verbs. Neither is a canonical authored
  // operation name; do not turn them into exceptions or a full catalog scan.
  const methodVerbOk=/^[a-z][a-z0-9-]*$/u.test(verb);
  const methods=methodVerbOk?worldMethods(engine,actor,runtime,{reading:view(),verb}):[];
  const method=methods.find(action=>action.verb===verb&&!action.failures.length);
  let availableMenu, controlMenu;
  const availableCommands=()=>availableMenu ??= [...new Set(
    projectCurrentActions(engine,actor,view(),room,
      worldMethods(engine,actor,runtime,{reading:view()})).map(action=>action.command),
  )].sort(compareText);
  const controlPlaneVerbs=()=>controlMenu ??= controlPlaneVerbsFor(view(),actor);

  const bareExit = argument.length === 0 && room !== null ? resolvedExit(view(), room, verb) : null;
  const extension = method&&!method.remote?runtime.command(verb,method.capability):null;
  const extensionResult = extension !== null && engine.game.capabilities.includes(extension.capability)
    ? validateCapabilityResult(
      extension.handler(capabilityContext({ ...engine, world }, intent, verb, argument, runtime, reading)),
      world,
      extension.capability,
      [intent.actor],
    )
    : null;
  if(verb==='invoke'||method?.remote){events.push(message(actor,'Actor operation requests require a live session: invoke <world-method> <JSON input>.'));}
  else if (extensionResult !== null && extensionResult.handled) {
    world = extensionResult.world;
    events.push(...extensionResult.events);
    packages.push(...(extensionResult.packages ?? []));
  } else if (bareExit !== null) {
    const failure = walkingFailure(view(), actor, bareExit.destination, bareExit.direction,room,engine.game);
    if (failure !== null) events.push(message(actor, failure));
    else {
      world = move(world, actor, bareExit.destination, { source: "feltos.command.go", reading: view() });
      events.push(message(actor, renderRoom(view(), actor)));
    }
  } else if (verb === "alias") {
    const raw = argument.trim();
    let book;
    try { book = currentAliasBook(world, view(), actor); }
    catch (error) { events.push(message(actor, "Alias book unreadable: " + error.message)); }
    if (book !== undefined) {
      if (raw.length === 0) {
        events.push(message(actor, book.aliases.length
          ? "Aliases (revision " + book.revision + "): " + book.aliases.map(a => a.name).join(", ")
          : "No character aliases. Type alias <name> <template> to define one."));
      } else {
        const gap = raw.search(/\s/u);
        const name = gap < 0 ? raw : raw.slice(0, gap);
        const template = gap < 0 ? null : raw.slice(gap).trim();
        if (template === null) {
          const match = book.aliases.find(a => a.name === name);
          events.push(message(actor, match ? name + " = " + match.template : "No such alias: " + name));
        } else {
          try {
            // Existing alias names are NOT reserved: an owner can revise
            // their definition. Real engine and installed capability verbs are.
            const reserved = [...CORE_COMMANDS, ...Object.keys(DIRECTION_ALIASES),
              ...controlPlaneVerbs(), ...worldMethods(engine, actor, runtime, {reading: view()}).map(item => item.verb)];
            const next = changeAlias(book, name, template, {reserved});
            world = tell(withAliasSchema(world), {subject:actor,predicate:CHARACTER_ALIASES,object:next}, {source:"feltos.character.alias.edit"});
            events.push(message(actor, "Saved character alias " + name + " at revision " + next.revision + "."));
          } catch (error) { events.push(message(actor, "Alias refused: " + error.message)); }
        }
      }
    }
  } else if (verb === "unalias") {
    try {
      const book = currentAliasBook(world, view(), actor);
      const next = changeAlias(book, argument.trim(), null);
      world = tell(withAliasSchema(world), {subject:actor,predicate:CHARACTER_ALIASES,object:next}, {source:"feltos.character.alias.delete"});
      events.push(message(actor, "Removed character alias " + argument.trim() + "."));
    } catch (error) { events.push(message(actor, "Unalias refused: " + error.message)); }
  } else if (verb === "history") {
    try {
      const n = argument.trim() === "" ? 3 : Number(argument.trim());
      const reading = observeCommandHistory(world, actor, n);
      const history = reading.entries;
      const prose = history.length === 0 ? "No commands were found in the inspected history."
        : history.map((entry, i) => (i + 1) + ". " + entry.command + (entry.admitted ? "" : " (not admitted)")).join("\n");
      events.push(message(actor, prose + (reading.coverage === "bounded-partial"
        ? "\nEarlier revisions were not inspected; this list may be incomplete." : "")));
      packages.push({to:actor,name:"Char.CommandHistory",data:reading});
    } catch (error) { events.push(message(actor, "History refused: " + error.message)); }
  } else if(verb==='where') {
    const where=territoryOf(view(),actor);
    events.push(message(actor,where.path.slice().reverse().map(id=>displayName(view(),id)).join(' / ')||'You are nowhere.'));
  } else if(verb==='worlds') {
    events.push(message(actor,subjects(view()).filter(id=>certainValue(view(),id,'kind')==='world').map(id=>`${displayName(view(),id)} (${id})${id===territoryOf(view(),actor).world?' — you are here':''}`).join('\n')));
  } else if (verb === "help") {
    const topic = argument.toLowerCase();
    if (topic.length === 0) {
      events.push(message(actor, [
        `Commands: ${availableCommands().join(", ")}`,
        `Also available: ${controlPlaneVerbs().join(", ")}`,
        "Type help <command> for syntax.",
      ].join("\n")));
    } else if (CORE_HELP[topic] !== undefined) events.push(message(actor, CORE_HELP[topic]));
    else if (CONTROL_PLANE_HELP[topic] !== undefined) events.push(message(actor, CONTROL_PLANE_HELP[topic]));
    else {
      // Help for one named method need not inspect every unrelated authored
      // requirement, and still reports all conflicting same-verb candidates.
      const topicMethods=/^[a-z][a-z0-9-]*$/u.test(topic)
        ? worldMethods(engine,actor,runtime,{reading:view(),verb:topic}) : [];
      events.push(message(actor,topicMethods.length
        ? topicMethods.map(action=>`${action.description}${action.failures.length?' — '+action.failures.join('; '):''}`).join('\n')
        : `No help is available for ${argument}.`));
    }
  } else if(!CORE_COMMANDS.includes(verb)&&methods.some(action=>action.verb===verb)) {
    events.push(message(actor,methods.filter(action=>action.verb===verb).flatMap(action=>action.failures).join("; ")));
  } else if (verb === "commands") {
    events.push(message(actor, [
      `Commands: ${availableCommands().join(", ")}`,
      `Also available: ${controlPlaneVerbs().join(", ")}`,
    ].join("\n")));
  } else if (verb === "score" || verb === "stats") {
    events.push(message(actor, [
      displayName(view(), actor),
      `Location: ${room === null ? "nowhere" : displayName(view(), room)}`,
      `Carrying: ${contentsOf(view(), actor).length}`,
      `World tick: ${engine.tick}`,
      `Coin: ${Number(value(view(), actor, "coin") ?? 0)}`,
      `Standing: ${standingSummaryLine(view(), actor)}`,
    ].join("\n")));
  } else if (verb === "skills") {
    events.push(message(actor, actorSkills(view(), actor).length === 0
      ? "You have not practiced any skills yet."
      : `Skills: ${skillsSummaryLine(view(), actor)}`));
  } else if (verb === "look" || verb === "l" || verb === "examine" || verb === "x") {
    events.push(message(actor, argument.length === 0
      ? renderRoom(view(), actor)
      : (() => {
        const token = argument.toLowerCase();
        if (SELF_LOOK_TOKENS.includes(token) || token === displayName(view(), actor).toLowerCase()) {
          return describeActorSelf(view(), actor);
        }
        const choice = resolveVisible(view(), actor, argument);
        return choice.alternatives.length > 0 ? ambiguousNoun(verb, argument, choice.alternatives)
          : choice.subject === null ? `You do not see ${argument}.`
          : (() => {
            const desc=String(value(view(),choice.subject,"description")
              ?? displayName(view(),choice.subject));
            if(ownedContainerRefusal(view(),actor,choice.subject,{requireOpen:true})!==null)
              return desc;
            const contents=contentsOf(view(),choice.subject);
            return desc+"\nInside: "+(contents.length
              ? contents.map(x=>displayName(view(),x)).join(", ") : "nothing");
          })();
      })()));
  } else if (verb === "inventory" || verb === "i") {
    const inventory = contentsOf(view(), actor);
    events.push(message(actor, inventory.length === 0 ? "You carry nothing." : `You carry: ${inventory.map((id) => displayName(view(), id)).join(", ")}`));
  } else if (verb === "exits") {
    if (room === null) events.push(message(actor, "You are nowhere."));
    else {
      const exits = exitsOf(view(),room).map(exit=>exit.direction);
      events.push(message(actor, exits.length === 0 ? "There are no visible exits." : `Exits: ${exits.join(", ")}`));
    }
  } else if (verb === "go" || verb === "move") {
    if (argument.length === 0 || room === null) {
      events.push(message(actor, "Go where?"));
    } else {
      const exit = resolvedExit(view(), room, argument);
      if (exit === null) events.push(message(actor, `There is no exit ${argument}.`));
      else {
        // Validate once: the original source gate can consult costly skills
        // and contested claims; checking twice is redundant work per move.
        const refusal = walkingFailure(view(), actor, exit.destination, exit.direction,room,engine.game);
        if (refusal !== null) events.push(message(actor, refusal));
        else {
          world = move(world, actor, exit.destination, { source: "feltos.command.go", reading: view() });
          events.push(message(actor, renderRoom(view(), actor)));
        }
      }
    }
  } else if (verb === "take" || verb === "get") {
    // Inventory inside another original container is never in the visible
    // item namespace until owner, locality and openness are checked.
    const from=argument.match(/^(.+?)\s+from\s+(.+)$/iu);
    if(from!==null) {
      const thingName=from[1].trim(),containerName=from[2].trim();
      const bag=resolveVisible(view(),actor,containerName);
      if(bag.alternatives.length)
        events.push(message(actor,ambiguousNoun("get",containerName,bag.alternatives)));
      else {
        const denied=ownedContainerRefusal(view(),actor,bag.subject,{requireOpen:true});
        if(denied!==null)events.push(message(actor,denied));
        else {
          const item=chooseNamed(view(),thingName,contentsOf(view(),bag.subject));
          if(item.alternatives.length)
            events.push(message(actor,ambiguousNoun("get",thingName,item.alternatives)));
          else if(item.subject===null || !["thing","object"].includes(certainValue(view(),item.subject,"kind"))
             || (cells(view(),item.subject,"owner").length>0
               &&certainValue(view(),item.subject,"owner")!==actor))
            events.push(message(actor,"That Thing is not yours to retrieve."));
          else {
            world=move(world,item.subject,actor,{source:"feltos.command.retrieve",reading:view()});
            events.push(message(actor,`You get ${displayName(view(),item.subject)} from ${displayName(view(),bag.subject)}.`));
          }
        }
      }
    } else {
    const choice = resolveVisible(view(), actor, argument);
    if (choice.alternatives.length) {
      events.push(message(actor, ambiguousNoun(verb, argument, choice.alternatives)));
    } else {
      const subject = choice.subject;
      const refusal = takeRefusal(view(), actor, subject);
      if (refusal === "not-takeable") {
        events.push(message(actor, `You cannot take ${argument || "that"}.`));
      } else if (refusal === "shop-ware") {
        events.push(message(actor, "That item belongs to the shop. Use buy to purchase it."));
      } else {
        world = certainValue(view(),subject,"kind")==="container"
          && certainValue(view(),subject,"owner")!==actor
          ? transferItem(world,subject,actor,{source:"feltos.command.take-container"})
          : move(world,subject,actor,{source:"feltos.command.take",reading:view()});
        events.push(message(actor, `You take ${displayName(view(), subject)}.`));
      }
    }
    }
  } else if (verb === "drop") {
    const choice = chooseCarried(view(), actor, argument);
    if (choice.alternatives.length > 0)
      events.push(message(actor, ambiguousNoun("drop", argument, choice.alternatives)));
    else if (choice.subject === null || room === null)
      events.push(message(actor, `You are not carrying ${argument || "that"}.`));
    else {
      world = move(world, choice.subject, room, { source: "feltos.command.drop", reading: view() });
      events.push(message(actor, `You drop ${displayName(view(), choice.subject)}.`));
    }
  } else if (verb === "give") {
    const match = argument.match(/^(.+?)\s+to\s+(.+)$/iu);
    const itemName = match?.[1]?.trim().toLowerCase();
    const recipientName = match?.[2]?.trim();
    const itemChoice = itemName === undefined ? null : chooseCarried(view(), actor, itemName);
    const recipientChoice = recipientName === undefined ? null : resolveVisible(view(), actor, recipientName);
    const item = itemChoice?.subject ?? null, recipient = recipientChoice?.subject ?? null;
    const recipientIsHere = recipient !== null && recipient !== actor && placeOf(view(), recipient) === room
      && (engine.actors.includes(recipient) || certainValue(view(), recipient, "kind") === "npc"
        || certainValue(view(), recipient, "npc") === true);
    if (itemChoice?.alternatives.length)
      events.push(message(actor, ambiguousNoun("give", itemName, itemChoice.alternatives)));
    else if (recipientChoice?.alternatives.length)
      events.push(message(actor, ambiguousNoun(`give ${itemName.slice(0, 96)} to`, recipientName, recipientChoice.alternatives)));
    else if (item === null || !recipientIsHere) events.push(message(actor, "Give <thing> to <person> who is here."));
    else if (cells(view(), item, "owner").length > 0 && certainValue(view(), item, "owner") !== actor)
      events.push(message(actor, certainValue(view(), item, "owner") === null
        ? "That item's ownership is unknown or contested." : "That belongs to someone else."));
    else if(certainValue(view(),item,"kind")==="container"&&contentsOf(view(),item).length)
      events.push(message(actor,"Empty the container before giving it to another player."));
    else {
      world = transferItem(world, item, recipient, { source: "feltos.command.give" });
      events.push(message(actor, `You give ${displayName(view(), item)} to ${displayName(view(), recipient)}.`));
    }

  } else if(verb==="open"||verb==="close") {
    const bag=resolveVisible(view(),actor,argument);
    if(bag.alternatives.length)events.push(message(actor,ambiguousNoun(verb,argument,bag.alternatives)));
    else {
      const refused=ownedContainerRefusal(view(),actor,bag.subject);
      if(refused!==null)events.push(message(actor,refused));
      else {
        const desired=verb==="open";
        if(certainValue(view(),bag.subject,"open")===desired)
          events.push(message(actor,`That container is already ${desired?"open":"closed"}.`));
        else {
          world=tell(declareFunctional(world,["open"]),
            {subject:bag.subject,predicate:"open",object:desired},
            {source:"feltos.command."+verb});
          events.push(message(actor,`You ${verb} ${displayName(view(),bag.subject)}.`));
        }
      }
    }
  } else if(verb==="put") {
    const placement=argument.match(/^(.+?)\s+(?:in|into)\s+(.+)$/iu);
    if(!placement)events.push(message(actor,"Put what in which container?"));
    else {
      const thingName=placement[1].trim(),containerName=placement[2].trim();
      const bag=resolveVisible(view(),actor,containerName);
      const item=chooseCarried(view(),actor,thingName);
      if(bag.alternatives.length)
        events.push(message(actor,ambiguousNoun("put",containerName,bag.alternatives)));
      else if(item.alternatives.length)
        events.push(message(actor,ambiguousNoun("put",thingName,item.alternatives)));
      else {
        const refused=ownedContainerRefusal(view(),actor,bag.subject,{requireOpen:true});
        if(refused!==null)events.push(message(actor,refused));
        else if(item.subject===null||!["thing","object"].includes(certainValue(view(),item.subject,"kind"))
          ||placeOf(view(),item.subject)!==actor
          ||(cells(view(),item.subject,"owner").length>0
            &&certainValue(view(),item.subject,"owner")!==actor))
          events.push(message(actor,"You cannot place that Thing."));
        else {
          const limit=certainValue(view(),bag.subject,"capacity-items");
          if(!Number.isSafeInteger(limit)||limit<1||limit>64)
            events.push(message(actor,"That container has no qualified finite capacity."));
          else if(contentsOf(view(),bag.subject).length>=limit)
            events.push(message(actor,"That container is full."));
          else {
            world=move(world,item.subject,bag.subject,{source:"feltos.command.put",reading:view()});
            events.push(message(actor,`You put ${displayName(view(),item.subject)} in ${displayName(view(),bag.subject)}.`));
          }
        }
      }
    }
  } else if (verb === "say" || verb === "'") {
    if (!hasVoice(view(), actor)) events.push(message(actor, "You have no voice yet. Register or log in to speak."));
    else if (argument.length === 0 || room === null) events.push(message(actor, "Say what?"));
    else {
      for (const recipient of earshotOf(view(), actor, engine.actors)) {
        events.push(message(recipient, recipient === actor ? `You say, “${argument}”` : `${displayName(view(), actor)} says, “${argument}”`, "speech"));
      }
    }
  } else if (verb === "emote" || verb === "pose") {
    if (!hasVoice(view(), actor)) events.push(message(actor, "You have no voice yet. Register or log in to emote."));
    else if (argument.length === 0 || room === null) events.push(message(actor, "Emote what?"));
    else {
      // A MUD emote is typed in the third person ("emote waves") and read the same by everyone who
      // sees it, the one who acts included: "Ada waves", never "You waves".
      const line = `${displayName(view(), actor)} ${argument}`;
      for (const recipient of witnessesOf(view(), actor, engine.actors)) events.push(message(recipient, line, "emote"));
    }
  } else {
    events.push(message(actor, teachUnknownCommand(verb, availableCommands(), controlPlaneVerbs())));
  }

  return { world, events, ...(packages.length ? {packages} : {}) };
}

function requireRuntime(engine, runtime, verb) {
  if (engine?.kind !== "feltos.engine.v1") fail(`${verb} requires a FeltOS engine`);
  if (runtime?.kind !== "feltos.runtime.v1") fail(`${verb} runtime is invalid`);
  for (const capabilityId of engine.game.capabilities) {
    if (!runtime.ids.includes(capabilityId)) fail(`game requires unavailable capability: ${capabilityId}`);
  }
}

/**
 * One admission round. Commands read a common world boundary. Each actor's commands retain their
 * causal order; independent actors do not acquire priority through arrival. Gaming admits a
 * conflict-free configuration before any effects are committed, and the round is recorded under
 * the moment it happened in.
 */
function admitRound(engine, current, pending, runtime, reading, isReadingCurrent, isIntentCurrent, maxCommandsPerActor) {
  const events = [], packages = [];
  const proposals = [], deferred = [];
  const actorBranches = new Map();
  pending.sort((a, b) => compareText(a.actor, b.actor) || a.ordinal - b.ordinal);
  for (const intent of pending) {
    if (!intent.internalCapability && !intentIsCurrent(intent,isIntentCurrent)) {
      deferred.push(Object.freeze({intent,reason:'origin-not-current'}));continue;
    }
    if (!intent.internalCapability){
      if(!intentBudgetAvailable(intent)){deferred.push(Object.freeze({intent,reason:'execution-budget'}));continue;}
      enrollIntent(intent,isIntentCurrent);
    }
    if (!isCurrent(reading,isReadingCurrent)) return { stale: true };
    const prior = actorBranches.get(intent.actor);
    const base = prior?.world ?? engine.world;
    const position = (prior?.position ?? 0) + 1;
    const id = address({ subject: intent.actor, predicate: "proposes", object: { tick: current.tick, position, command: intent.command, source: intent.internalCapability ?? "player", parents: historyHeads(base) } });
    let executed;
    try { executed = captureHistoryReads(() => execute({ ...current, world: base }, intent, runtime, reading)); }
    catch (error) { throw markFailedIntent(error, intent); }
    const { result, reads } = executed;
    const oldRevisions = new Set(base.revisions.map((revision) => revision.id));
    const writes = result.world.revisions.filter((revision) => !oldRevisions.has(revision.id)).flatMap((revision) => revision.cells);
    const invalidated = writes.filter((at) => result.world.functionalPredicates.includes(at.predicate)).flatMap((at) => historySection(base, at.subject, at.predicate));
    proposals.push({ id, reads, writes: [...writes, ...invalidated], effects: writes, after: prior ? [prior.id] : [], intent, result });
    actorBranches.set(intent.actor, { id, world: result.world, position });
  }
  if (!isCurrent(reading, isReadingCurrent)) return { stale: true };
  const admission = admitProposals(proposals);
  const admitted = new Set(admission.admitted);
  const accepted = proposals.filter((proposal) => admitted.has(proposal.id));
  let world = mergeHistories(engine.world, ...accepted.map((proposal) => proposal.result.world));
  for (const proposal of proposals) {
    if (admitted.has(proposal.id)) {
      events.push(...proposal.result.events); packages.push(...(proposal.result.packages ?? []));
    }
    else events.push(message(proposal.intent.actor, "Your action conflicts with another action at this moment. Nothing from it was spent or moved; try again."));
  }
  if (proposals.length) {
    world = tell(world, proposals.map((proposal) => ({
      subject: `tick:${current.tick}`,
      predicate: "action-admission",
      object: { id: proposal.id, actor: proposal.intent.actor, command: proposal.intent.command, source: proposal.intent.internalCapability ?? "player", parents: historyHeads(engine.world), effects: proposal.effects, admitted: admitted.has(proposal.id), after: proposal.after },
      evidence: admitted.has(proposal.id) ? "potential" : "stable",
    })).concat(admission.contested.map((conflict) => ({ subject: `tick:${current.tick}`, predicate: "action-conflict", object: conflict, evidence: "stable" }))), { source: "feltos.admission" });
  }
  return { world, events, admission, deferred, ...(packages.length ? {packages} : {}) };
}

/**
 * A player's action is admitted when it arrives: the queued commands run one admission round at
 * the current moment. Simulated time does not advance and inhabitants do not act; that is the
 * world's heartbeat, `step`.
 */
function admitOperation(engine, { runtime = EMPTY_RUNTIME, reading, isReadingCurrent, isIntentCurrent, maxCommandsPerActor } = {}) {
  requireRuntime(engine, runtime, "admit");
  requireReadingAdmission(reading,isReadingCurrent);
  if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
  const current = { ...engine, queue: [] };
  const round = admitRound(engine, current, [...engine.queue], runtime, reading, isReadingCurrent, isIntentCurrent, maxCommandsPerActor);
  if (round.stale) return staleReading(engine,reading);
  const { world, events, admission, packages=[], deferred=[] } = round;
  return Object.freeze({
    engine: freezeEngine({ ...current, world, queue:deferred.map(entry=>entry.intent) }),
    receipt: Object.freeze({
      kind: "feltos.admission-receipt.v1",
      tick: current.tick,
      intents: Object.freeze([...engine.queue]),
      admission,
      ...(deferred.length ? {deferred:Object.freeze(deferred)} : {}),
      events: Object.freeze(events),
      ...(packages.length ? {packages:Object.freeze(packages)} : {}),
      worldSequence: historySize(world),
    }),
  });
}

/** The world's heartbeat: simulated time advances, inhabitants propose, and capabilities run. */
function stepOperation(engine, { runtime = EMPTY_RUNTIME, cause, reading, isReadingCurrent, isIntentCurrent, maxCommandsPerActor } = {}) {
  requireRuntime(engine, runtime, "step");
  requireReadingAdmission(reading,isReadingCurrent);
  if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
  if (cause !== undefined && (typeof cause !== "string" || cause.length === 0 || cause.length > 512)) fail("tick cause must be non-empty bounded text");
  const clockSubject = engine.game.dimension ?? "feltos:clock";
  if (cause !== undefined && values(engine.world, clockSubject, "tick-cause").includes(cause)) {
    return Object.freeze({ engine, receipt: Object.freeze({ kind: "feltos.tick-receipt.v1", tick: engine.tick,
      cause, replayed: true, intents: Object.freeze([]), events: Object.freeze([]),
      worldSequence: historySize(engine.world), capabilities: Object.freeze(engine.game.capabilities) }) });
  }
  let current = { ...engine, tick: engine.tick + 1, queue: [] };
  const pending = [...engine.queue];
  for (const capability of runtime.capabilities) {
    if (!engine.game.capabilities.includes(capability.id) || capability.proposeActions === undefined) continue;
    if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
    const proposed = capability.proposeActions(Object.freeze({
      tick: current.tick, game: current.game, actors: current.actors, world: engine.world,
      reading: reading === undefined ? readWorld(engine.world) : readingAt(reading,engine.world),
      contentsOf, message, move, perceive, placeOf, tell, value,
      actionsFor:(actor,options={})=>availableActions(current,actor,{...options,runtime,reading}),
      routeTo:(actor,destination)=>routeFor(current,actor,destination,{runtime,reading}),
    }));
    if (!Array.isArray(proposed)) fail(`capability ${capability.id} returned invalid action proposals`);
    for (const action of proposed) {
      if (action === null || typeof action !== "object" || typeof action.actor !== "string"
        || typeof action.command !== "string" || action.command.trim().length === 0) fail(`capability ${capability.id} returned an invalid action`);
      if (!isInhabitant(readingAt(reading,engine.world), current.actors, action.actor)) {
        fail(`capability ${capability.id} proposed an action for a non-inhabitant`);
      }
      pending.push(Object.freeze({ kind: "feltos.command.v1", ordinal: engine.nextIntent + pending.length,
        actor: action.actor, command: action.command.trim(), internalCapability: capability.id }));
    }
  }
  if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
  const round = admitRound(engine, current, pending, runtime, reading, isReadingCurrent, isIntentCurrent, maxCommandsPerActor);
  if (round.stale) return staleReading(engine,reading);
  const { world, events, admission, packages=[], deferred=[] } = round;
  current.world = world;
  current.queue = deferred.map(entry=>entry.intent);
  for (const capability of runtime.capabilities) {
    if (!engine.game.capabilities.includes(capability.id) || capability.onTick === undefined) continue;
    if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
    const result = validateCapabilityResult(capability.onTick(Object.freeze({
      tick: current.tick,
      game: current.game,
      actors: current.actors,
      world: current.world,
      reading: reading === undefined ? readWorld(current.world) : readingAt(reading,current.world),
      contentsOf,
      message,
      move,
      perceive,
      placeOf,
      actionsFor:(actor,options={})=>availableActions(current,actor,{...options,runtime,reading}),
      routeTo:(actor,destination)=>routeFor(current,actor,destination,{runtime,reading}),
      tell,
      value,
    })), current.world, capability.id, current.actors);
    current = { ...current, world: result.world };
    events.push(...result.events);
    packages.push(...(result.packages ?? []));
  }
  if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
  if (cause !== undefined) current.world = tell(current.world,
    { subject: clockSubject, predicate: "tick-cause", object: cause }, { source: "feltos.engine.clock" });
  return Object.freeze({
    engine: freezeEngine(current),
    receipt: Object.freeze({
      kind: "feltos.tick-receipt.v1",
      tick: current.tick,
      ...(cause === undefined ? {} : { cause, replayed: false }),
      intents: Object.freeze([...engine.queue]),
      admission,
      ...(deferred.length ? {deferred:Object.freeze(deferred)} : {}),
      events: Object.freeze(events),
      ...(packages.length ? {packages:Object.freeze(packages)} : {}),
      worldSequence: historySize(current.world),
      capabilities: Object.freeze(engine.game.capabilities),
    }),
  });
}

/**
 * Let `hours` of simulated time pass in one visit. A capability that declares `onElapse` (a rate law:
 * a closed form over an interval) is advanced by the whole interval in O(its subjects), however long.
 * Every other law keeps a bounded replay: the last `maxReplayTicks` hours are run as real heartbeats,
 * inhabitants proposing and every `onTick` running, and the hours before them are forgiven to those
 * laws alone. The tick count advances by the full interval.
 */
function elapseOperation(engine, hours, { runtime = EMPTY_RUNTIME, maxReplayTicks = 1, reading, isReadingCurrent, isIntentCurrent, maxCommandsPerActor } = {}) {
  requireRuntime(engine, runtime, "elapse");
  requireReadingAdmission(reading,isReadingCurrent);
  if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
  if (!Number.isSafeInteger(hours) || hours < 0) fail("elapsed hours must be a non-negative integer");
  if (!Number.isSafeInteger(maxReplayTicks) || maxReplayTicks < 0) fail("maxReplayTicks must be a non-negative integer");
  const replayed = Math.min(hours, maxReplayTicks);
  const closed = hours - replayed;
  let current = engine;
  if (closed > 0) {
    let world = engine.world;
    for (const capability of runtime.capabilities) {
      if (!engine.game.capabilities.includes(capability.id) || capability.onElapse === undefined) continue;
      if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
      const next = capability.onElapse(world, closed, Object.freeze({ tick: engine.tick + closed, game: engine.game, actors: engine.actors, reading: reading === undefined ? readWorld(world) : readingAt(reading,world) }));
      if (next === null || typeof next !== "object" || Array.isArray(next)) fail(`capability ${capability.id} returned an invalid elapsed world`);
      world = next;
    }
    current = freezeEngine({ ...engine, tick: engine.tick + closed, world });
  }
  const events = [], packages = [], deferredByIntent = new Map();
  const intents = [...engine.queue];
  let admission = null;
  for (let beat = 0; beat < replayed; beat++) {
    const result = step(current, { runtime, reading, isReadingCurrent, isIntentCurrent:intent=>deferredByIntent.get(intent)?.reason!=='origin-not-current' && intentIsCurrent(intent,isIntentCurrent), maxCommandsPerActor });
    if (result.receipt.status === "stale-reading") return staleReading(engine,reading);
    if (result.receipt.status === "stale-origin") return staleOrigin(engine,result.receipt.deferred.map(entry=>entry.intent));
    current = result.engine;
    events.push(...result.receipt.events);
    packages.push(...(result.receipt.packages ?? []));
    admission = result.receipt.admission;
    for(const entry of result.receipt.deferred??[])deferredByIntent.set(entry.intent,entry);
  }
  if (!isCurrent(reading,isReadingCurrent)) return staleReading(engine,reading);
  return Object.freeze({
    engine: current,
    receipt: Object.freeze({
      kind: "feltos.elapse-receipt.v1",
      tick: current.tick,
      hours,
      replayed,
      forgiven: closed,
      intents: Object.freeze(intents),
      admission,
      ...([...deferredByIntent.values()].some(entry=>current.queue.includes(entry.intent)) ? {deferred:Object.freeze([...deferredByIntent.values()].filter(entry=>current.queue.includes(entry.intent)))} : {}),
      events: Object.freeze(events),
      ...(packages.length ? {packages:Object.freeze(packages)} : {}),
      worldSequence: historySize(current.world),
    }),
  });
}

function requireIntentBudget(options) {
  if(options.maxCommandsPerActor!==undefined && (!Number.isSafeInteger(options.maxCommandsPerActor)||options.maxCommandsPerActor<1))fail('maxCommandsPerActor must be a positive integer');
}
export function admit(engine, options = {}) {
  requireIntentBudget(options);
  return withIntentAdmission(engine,options.isIntentCurrent,options.maxCommandsPerActor,()=>withReadingFrames(engine,options.reading,()=>admitOperation(engine,options)));
}

export function step(engine, options = {}) {
  requireIntentBudget(options);
  return withIntentAdmission(engine,options.isIntentCurrent,options.maxCommandsPerActor,()=>withReadingFrames(engine,options.reading,()=>stepOperation(engine,options)));
}

export function elapse(engine, hours, options = {}) {
  requireIntentBudget(options);
  return withIntentAdmission(engine,options.isIntentCurrent,options.maxCommandsPerActor,()=>withReadingFrames(engine,options.reading,()=>elapseOperation(engine,hours,options)));
}
