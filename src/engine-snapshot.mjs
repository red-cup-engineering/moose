import {admitIntentOrigin} from './intent-origin.mjs';
import { admitGameWorld, defineGame } from "./game.mjs";
import { cells } from "./world.mjs";
import { materializeHistory, restoreHistory, validateHistory } from "./world-history.mjs";

const ACTOR_IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) { throw new TypeError(message); }
function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be a record`);
  return value;
}

export function snapshotWorld(world) {
  if (world?.kind !== "signcraft.history") fail("snapshotWorld requires a SignCraft history");
  return materializeHistory(validateHistory(world));
}

export function restoreWorld(source) {
  const snapshot = record(source, "world snapshot");
  if (snapshot.kind !== "signcraft.history") fail("invalid world snapshot envelope");
  return restoreHistory(snapshot);
}

export function snapshotEngine(engine, { world } = {}) {
  if (engine?.kind !== "feltos.engine.v1") fail("snapshotEngine requires a FeltOS engine");
  return Object.freeze({
    kind: "feltos.engine-snapshot.v1",
    game: engine.game,
    world: world ?? snapshotWorld(engine.world),
    actors: Object.freeze([...engine.actors]),
    tick: engine.tick,
    nextIntent: engine.nextIntent,
    queue: Object.freeze(engine.queue.map((intent) => Object.freeze({ ...intent }))),
  });
}

function restoreEngineStateOf(snapshot, world) {
  if (world?.kind !== "signcraft.history") fail("engine state requires an admitted SignCraft history");
  if (!Array.isArray(snapshot.actors)
    || !Array.isArray(snapshot.queue)
    || !Number.isSafeInteger(snapshot.tick)
    || snapshot.tick < 0
    || !Number.isSafeInteger(snapshot.nextIntent)
    || snapshot.nextIntent < 1) fail("invalid engine snapshot envelope");
  const game = defineGame(record(snapshot.game, "snapshot game"));
  admitGameWorld(game, world, { recovering: true });
  const actors = [...snapshot.actors];
  if (new Set(actors).size !== actors.length
    || actors.some((actor) => typeof actor !== "string" || !ACTOR_IDENTIFIER.test(actor)
      || cells(world,actor,'kind').some(cell=>cell.object!=='actor'))) fail("engine snapshot contains invalid actor identities");
  const queue = snapshot.queue.map((intent, index) => {
    record(intent, `queued intent ${index}`);
    if (intent.kind !== "feltos.command.v1"
      || !Number.isSafeInteger(intent.ordinal)
      || intent.ordinal < 1
      || !actors.includes(intent.actor)
      || typeof intent.command !== "string"
      || intent.command.length === 0) fail(`queued intent ${index} is invalid`);
    return Object.freeze({ kind: intent.kind, ordinal: intent.ordinal, actor: intent.actor, command: intent.command, ...(Object.hasOwn(intent,"origin")?{origin:admitIntentOrigin(intent.origin)}:{}) });
  });
  if (new Set(queue.map(intent => intent.ordinal)).size !== queue.length) fail("queued intent ordinals must be unique");
  if (queue.some(({ ordinal }) => ordinal >= snapshot.nextIntent)) fail("queued intent exceeds nextIntent frontier");
  return Object.freeze({
    kind: "feltos.engine.v1", game, world,
    actors: Object.freeze(actors.sort(compareText)), tick: snapshot.tick,
    nextIntent: snapshot.nextIntent,
    queue: Object.freeze(queue.sort((left, right) => left.ordinal - right.ordinal)),
  });
}

export function restoreEngine(source) {
  const snapshot = record(source, "engine snapshot");
  if (snapshot.kind !== "feltos.engine-snapshot.v1") fail("invalid engine snapshot envelope");
  return restoreEngineStateOf(snapshot, restoreWorld(snapshot.world));
}

export function encodeSnapshot(engine) { return `${JSON.stringify(snapshotEngine(engine), null, 2)}\n`; }
export function decodeSnapshot(text) {
  if (typeof text !== "string") fail("snapshot representation must be text");
  return restoreEngine(JSON.parse(text));
}
