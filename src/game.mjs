import { retainedCarrier } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { canonical, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { cells, certainValue, createWorld, declareFunctional, settledWorld, tell, territoryOf, validateWorld } from "./world.mjs";
import { restoreHistory } from "./world-history.mjs";
import { gamePlaceIsCurrent, sourceReference } from "./game-world.mjs";

import { defineAction, defineRequirements, actionPredicate } from './actions.mjs';

const IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) {
  throw new TypeError(message);
}

function identifier(value, label) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) fail(`${label} must be a stable lowercase identifier`);
  return value;
}

function text(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be non-empty text`);
  return value;
}

function entries(record, label) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) fail(`${label} must be a record`);
  return Object.entries(record).sort(([left], [right]) => compareText(left, right));
}

function jsonValue(value, label) {
  try {
    const representation = JSON.stringify(value, (_key, member) => {
      if (typeof member === "bigint" || typeof member === "function" || typeof member === "symbol" || member === undefined) throw new TypeError();
      if (typeof member === "number" && !Number.isFinite(member)) throw new TypeError();
      return member;
    });
    if (representation === undefined) throw new TypeError();
    return JSON.parse(representation);
  } catch { fail(`${label} must be a finite JSON value`); }
}

const isPoint = (point, size) => Array.isArray(point) && point.length === size && point.every(Number.isFinite);
const isInterval = (z) => isPoint(z, 2) && z[0] < z[1];
const isPrism = (prism) => prism !== null && typeof prism === "object" && Array.isArray(prism.footprint)
  && prism.footprint.length >= 3 && prism.footprint.every((point) => isPoint(point, 2)) && isInterval(prism.z);

/** A place's extent: a body prism and optional reach prisms, each a convex footprint over a z interval. */
function region(value, label) {
  const shape = jsonValue(value, label);
  if (!isPrism(shape.body) || !(shape.reaches === undefined || (Array.isArray(shape.reaches) && shape.reaches.every(isPrism)))
    || !(shape.enclosed === undefined || typeof shape.enclosed === "boolean")) fail(`${label} must be {body, reaches?, enclosed?} of convex prisms`);
  return shape;
}

function pose(value, label) {
  const shape = jsonValue(value, label);
  if (!isPoint(shape?.position, 3) || !Number.isFinite(shape.heading)) fail(`${label} must be {position: [x, y, z], heading}`);
  return shape;
}

function actorAssertionsOf(source) {
  if (source.actorAssertions !== undefined && !Array.isArray(source.actorAssertions)) fail("game actorAssertions must be a sequence");
  return Object.freeze((source.actorAssertions ?? []).map((claim, index) => {
    if (claim === null || typeof claim !== "object" || Array.isArray(claim)) fail(`actor assertion ${index} must be a record`);
    const predicate = text(claim.predicate, `actor assertion ${index} predicate`);
    if (["kind", "name", "located-in"].includes(predicate)) fail(`actor assertion cannot override admission field ${predicate}`);
    return Object.freeze({ predicate, object: jsonValue(claim.object, `actor assertion ${index} object`) });
  }));
}

/** Select policy and an entrance for an already-admitted World. The selection
 * contains no replacement room blueprint and makes no World observations. */
function defineHistoryGame(source, id, capabilities, functionalPredicates) {
  if (["rooms", "worlds", "areas", "things", "assertions"].some(key => Object.hasOwn(source, key)))
    fail("a history-backed game cannot also define authored World content");
  return Object.freeze({
    kind: "feltos.game.v1", worldSource: "history", id,
    name: text(source.name, "game name"),
    start: sourceReference(source.start, "game start"),
    dimension: sourceReference(source.dimension, "game Dimension"),
    capabilities: Object.freeze(capabilities),
    functionalPredicates: Object.freeze([...functionalPredicates].sort(compareText)),
    actorAssertions: actorAssertionsOf(source),
    ...(Object.hasOwn(source,"readingEdition") ? {readingEdition:retainedCarrier(requireJsonValue(source.readingEdition,"game readingEdition"))} : {}),
  });
}

/** Admit the initial source binding without copying, seeding or widening its
 * history. Current opposition remains a refusal, never an entrance grant. */
export function admitGameWorld(game, world, { recovering = false } = {}) {
  validateWorld(world);
  if (restoreHistory(world) !== world)
    fail("game World must be admitted by its original history owner; restore decoded history before selecting it");
  if (game?.kind !== "feltos.game.v1") fail("World admission requires a defined game");
  if (game.worldSource !== "history") return world;
  sourceReference(game.start, "game start");
  sourceReference(game.dimension, "game Dimension");
  if (recovering) {
    // Recovery retains recorded opposition and pending commands. It cannot
    // grant entrance or execution: those paths recheck the current ancestry.
    for (const reference of [game.start, game.dimension])
      if (!cells(world, reference, "thing-type").some(cell => typeof cell.object === "string" && cell.object.length > 0))
        fail("the saved game selection names an unrecorded original Thing");
    for (const [reference, expected] of [[game.start, "area"], [game.dimension, "dimension"]]) {
      const currentKind = certainValue(world, reference, "kind");
      if (currentKind !== null && currentKind !== expected)
        fail("the saved game selection names the wrong original Thing kind");
    }
    const current = territoryOf(world, game.start).dimension;
    if (current !== null && current !== game.dimension)
      fail("the saved game entrance belongs to another Dimension");
  } else if (!gamePlaceIsCurrent(game, world, game.start))
    fail("game entrance requires a certain original Area in its World and Dimension");
  for (const predicate of game.functionalPredicates)
    if (!world.functionalPredicates.includes(predicate))
      fail(`the original World has not admitted functional predicate ${predicate}`);
  return world;
}

/** Validate authored content or an explicit original-history selection.
 * Functions and mutable World state are deliberately excluded. */
export function defineGame(source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) fail("game must be a record");
  const id = identifier(source.id, "game id");
  if (source.capabilities !== undefined && !Array.isArray(source.capabilities)) fail("game capabilities must be a sequence");
  const capabilities = [...new Set((source.capabilities ?? []).map((entry) => identifier(entry, "capability id")))].sort(compareText);
  if (source.functionalPredicates !== undefined && !Array.isArray(source.functionalPredicates)) {
    fail("game functionalPredicates must be a sequence");
  }
  const functionalPredicates = new Set();
  for (const predicate of source.functionalPredicates ?? []) {
    functionalPredicates.add(identifier(predicate, "functional predicate"));
  }
  if (source.worldSource === "history") return defineHistoryGame(source, id, capabilities, functionalPredicates);
  if (source.worldSource !== undefined) fail("unknown game World source");
  const roomEntries = entries(source.rooms, "game rooms");
  if (roomEntries.length === 0) fail("game must define at least one room");
  const roomIds = new Set(roomEntries.map(([roomId]) => identifier(roomId, "room id")));
  const dimension=`dimension:${id}`,defaultWorld=`world:${id}`;
  const worlds={};
  const authored=source.worlds!==undefined;
  for(const [worldId,world] of entries(source.worlds??{[defaultWorld]:{name:source.name,description:source.name}},'game worlds')){
    identifier(worldId,'world id');
    if(roomIds.has(worldId)||worldId===dimension)fail('world id collides with game content');
    if(!Array.isArray(world.actions??[]))fail('world actions must be a sequence');
    const actions=(world.actions??[]).map(defineAction);
    if(actions.some(a=>!a.remote&&!capabilities.includes(a.capability)))fail('world action names a capability not installed by the game');
    for(const action of actions)functionalPredicates.add(actionPredicate(action));
    worlds[worldId]=Object.freeze({name:text(world.name,'world name'),description:text(world.description,'world description'),actions:Object.freeze(actions),policy:source.kind==='feltos.game.v1'&&world.policy==='runtime'?'runtime':authored?'authored':'runtime'});
  }
  if(!Object.keys(worlds).length)fail('game must define a world');
  const areas={};
  for(const [areaId,area] of entries(source.areas??{},'game areas')){
    identifier(areaId,'area id');
    if(roomIds.has(areaId)||areaId in worlds||areaId===dimension)fail('area id collides with game content');
    areas[areaId]=Object.freeze({name:text(area.name,'area name'),description:text(area.description,'area description'),within:identifier(area.within,'area parent')});
  }
  for(const areaId of Object.keys(areas)){
    const seen=new Set([areaId]);let parent=areas[areaId].within;
    while(parent in areas){if(seen.has(parent))fail('area containment cycle');seen.add(parent);parent=areas[parent].within;}
    if(!(parent in worlds))fail('area must descend from a world');
  }
  functionalPredicates.add('part-of');functionalPredicates.add('action-policy');
  // A character's alias book supersedes rather than accumulates (see character-aliases.mjs).
  functionalPredicates.add('character-alias-book');
  const rooms = {};
  for (const [roomId, room] of roomEntries) {
    const exits = {};
    for (const [direction, destination] of entries(room.exits ?? {}, `room ${roomId} exits`)) {
      identifier(direction, `room ${roomId} exit`);
      if (!roomIds.has(destination)) fail(`room ${roomId} exit ${direction} targets unknown room ${String(destination)}`);
      exits[direction] = destination;
      functionalPredicates.add(`exit:${direction}`);
    }
    if (room.region !== undefined) functionalPredicates.add("region");
    const within=room.within??(authored?null:defaultWorld);
    if(within===null||!(within in worlds||within in areas))fail(`room ${roomId} requires a known world or area`);
    const exitRequirements={};
    for(const [direction,requirements] of entries(room.exitRequirements??{},'exit requirements')){
      if(!(direction in exits))fail('exit requirements name an absent exit');
      exitRequirements[direction]=defineRequirements(requirements);functionalPredicates.add(`exit-requires:${direction}`);
    }
    rooms[roomId] = Object.freeze({
      name: text(room.name, `room ${roomId} name`),
      description: text(room.description, `room ${roomId} description`),
      exits: Object.freeze(exits),
      within,exitRequirements:Object.freeze(exitRequirements),
      ...(room.region === undefined ? {} : { region: region(room.region, `room ${roomId} region`) }),
    });
  }
  const things = {};
  const thingEntries = entries(source.things ?? {}, "game things");
  const thingIds = new Set(thingEntries.map(([thingId]) => identifier(thingId, "thing id")));
  for (const [thingId, thing] of thingEntries) {
    identifier(thingId, "thing id");
    if (roomIds.has(thingId)||thingId in areas||thingId in worlds||thingId===dimension) fail(`thing id duplicates game content: ${thingId}`);
    if (!roomIds.has(thing.location) && !thingIds.has(thing.location)) fail(`thing ${thingId} has unknown location ${String(thing.location)}`);
    if (thing.pose !== undefined) functionalPredicates.add("pose");
    things[thingId] = Object.freeze({
      name: text(thing.name, `thing ${thingId} name`),
      description: text(thing.description, `thing ${thingId} description`),
      location: thing.location,
      ...(thing.pose === undefined ? {} : { pose: pose(thing.pose, `thing ${thingId} pose`) }),
    });
  }
  const start = identifier(source.start, "game start room");
  if (!roomIds.has(start)) fail(`game start room does not exist: ${start}`);
  if (source.assertions !== undefined && !Array.isArray(source.assertions)) fail("game assertions must be a sequence");
  const assertions = (source.assertions ?? []).map((claim, index) => {
    if (claim === null || typeof claim !== "object" || Array.isArray(claim)) fail(`game assertion ${index} must be a record`);
    return Object.freeze({
      subject: text(claim.subject, `game assertion ${index} subject`),
      predicate: text(claim.predicate, `game assertion ${index} predicate`),
      object: jsonValue(claim.object, `game assertion ${index} object`),
      ...(claim.evidence === undefined ? {} : { evidence: (claim.evidence) }),
    });
  });
  const actorAssertions = actorAssertionsOf(source);
  return Object.freeze({
    kind: "feltos.game.v1",
    id,
    name: text(source.name, "game name"),
    start,
    capabilities: Object.freeze(capabilities),
    functionalPredicates: Object.freeze([...functionalPredicates].sort(compareText)),
    dimension,worlds:Object.freeze(worlds),areas:Object.freeze(areas),
    rooms: Object.freeze(rooms),
    things: Object.freeze(things),
    assertions: Object.freeze(assertions),
    actorAssertions: Object.freeze(actorAssertions),
    // Opaque owner-authored read-edition metadata; it never becomes world observations.
    ...(Object.hasOwn(source,"readingEdition") ? {readingEdition:retainedCarrier(requireJsonValue(source.readingEdition,"game readingEdition"))} : {}),
  });
}

export function instantiateGame(game) {
  if (game?.kind !== "feltos.game.v1") fail("instantiateGame requires a defined game");
  if (game.worldSource === "history") fail("a history-backed game requires its admitted original World");
  if(!game.worlds)game=defineGame(game);
  const claims = [
    {subject:game.dimension,predicate:'kind',object:'dimension'},
    {subject:game.dimension,predicate:'name',object:game.name},
  ];
  for(const [id,world] of Object.entries(game.worlds??{}))claims.push(
    {subject:id,predicate:'kind',object:'world'},{subject:id,predicate:'name',object:world.name},
    {subject:id,predicate:'description',object:world.description},{subject:id,predicate:'part-of',object:game.dimension},
    {subject:id,predicate:'action-policy',object:world.policy},
    ...world.actions.map(action=>({subject:id,predicate:actionPredicate(action),object:action})),
  );
  for(const [id,area] of Object.entries(game.areas??{}))claims.push(
    {subject:id,predicate:'kind',object:'area'},{subject:id,predicate:'name',object:area.name},
    {subject:id,predicate:'description',object:area.description},{subject:id,predicate:'part-of',object:area.within},
  );
  for (const [roomId, room] of Object.entries(game.rooms)) {
    claims.push(
      { subject: roomId, predicate: "kind", object: "room" },
      { subject: roomId, predicate: "part-of", object: room.within },
      { subject: roomId, predicate: "name", object: room.name },
      { subject: roomId, predicate: "description", object: room.description },
    );
    for (const [direction, destination] of Object.entries(room.exits)) {
      claims.push({ subject: roomId, predicate: `exit:${direction}`, object: destination });
    }
    for(const [direction,requirements] of Object.entries(room.exitRequirements??{}))claims.push({subject:roomId,predicate:`exit-requires:${direction}`,object:requirements});
    if (room.region !== undefined) claims.push({ subject: roomId, predicate: "region", object: room.region });
  }
  for (const [thingId, thing] of Object.entries(game.things)) {
    claims.push(
      { subject: thingId, predicate: "kind", object: "thing" },
      { subject: thingId, predicate: "name", object: thing.name },
      { subject: thingId, predicate: "description", object: thing.description },
      { subject: thingId, predicate: "located-in", object: thing.location },
    );
    if (thing.pose !== undefined) claims.push({ subject: thingId, predicate: "pose", object: thing.pose });
  }
  const placed = tell(createWorld({ functionalPredicates: game.functionalPredicates }), claims, { source: `${game.id}:places` });
  return tell(placed, game.assertions, { source: `${game.id}:content` });
}

/** Add new authored content to a running world without resetting its lived state.
 * Existing state, contradictions, and withdrawals remain authoritative; unchanged
 * authored names and descriptions follow the new edition.
 * Game logic/capability selection is updated by the engine owner, independently.
 */
export function evolveGameWorld(world, previous, next) {
  if (previous.id !== next.id) fail("cannot evolve a world into another game");
  if (previous === next || canonical(previous) === canonical(next)) return world;
  if (previous.worldSource === "history" || next.worldSource === "history") {
    if (previous.worldSource !== next.worldSource || previous.dimension !== next.dimension)
      fail("cannot replace an original World source through game evolution");
    // A policy/read-edition update does not replay authored content over lived
    // history. A newly selected entrance must be currently admissible.
    if (previous.start !== next.start) admitGameWorld(next, world);
    else {
      validateWorld(world);
      for (const predicate of next.functionalPredicates)
        if (!world.functionalPredicates.includes(predicate))
          fail(`the original World has not admitted functional predicate ${predicate}`);
    }
    return world;
  }
  const claimKey = ({ subject, predicate, object }) => canonical([subject, predicate, object]);
  const preceding = settledWorld(instantiateGame(previous));
  const prior = new Set(preceding.map(claimKey));
  const authored = settledWorld(instantiateGame(next));
  world = declareFunctional(world, next.functionalPredicates);
  const functional = new Set(world.functionalPredicates);
  const atKey = ({ subject, predicate }) => canonical([subject, predicate]);
  const previousAt = new Set(preceding.map(atKey));
  const nextAt = new Set(authored.map(atKey));
  const editable = predicate => ["name", "description", "region", "part-of", "action-policy"].includes(predicate)
    || predicate.startsWith("offers-action:") || predicate.startsWith("exit-requires:") || predicate.startsWith("exit:");
  const authoredSources = new Set([`${next.id}:places`, `${next.id}:content`, `${next.id}:content-evolution`]);
  const unchangedAuthored = claim => {
    const current = cells(world, claim.subject, claim.predicate);
    if (current.length !== 1) return false;
    const cleared = !previousAt.has(atKey(claim)) && (current[0].object === null
      || claim.predicate.startsWith("exit-requires:") && canonical(current[0].object) === canonical(defineRequirements()));
    if (!prior.has(claimKey(current[0])) && !cleared) return false;
    const [held, denied] = sidesOfReading(current[0].evidence);
    // An independent affirmation is lived evidence even when its value agrees
    // with the preceding edition. A new edition cannot supersede its witness.
    return held && !denied && [...current[0].for, ...current[0].against]
      .every(witness => authoredSources.has(witness.source));
  };
  // Withdraw obsolete authored control together with its replacement. Objects,
  // inhabitants, possessions and independent observations remain in the carrier.
  const withdrawals = preceding.filter(claim => functional.has(claim.predicate)
    && editable(claim.predicate) && !nextAt.has(atKey(claim)) && unchangedAuthored(claim))
    .map(claim => ({ ...claim, object: claim.predicate.startsWith("exit-requires:") ? defineRequirements() : null }));
  const additions = authored.filter((claim) => {
    if (prior.has(claimKey(claim))) return false;
    const current = cells(world, claim.subject, claim.predicate);
    if (!functional.has(claim.predicate)) return !current.some((at) => claimKey(at) === claimKey(claim));
    if (!current.length) return true;
    // Authored presentation and the authored extent of places can evolve while player edits and disputed readings remain.
    return editable(claim.predicate) && unchangedAuthored(claim);
  });
  return additions.length||withdrawals.length ? tell(world, [...withdrawals,...additions], { source: `${next.id}:content-evolution` }) : world;
}
