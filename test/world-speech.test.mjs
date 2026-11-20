import assert from "node:assert/strict";
import test from "node:test";
import { defineGame, evolveGameWorld, instantiateGame } from "@red-cup-engineering/moose/game";
import { createNativeWorldExample } from "../examples/native-world.mjs";
import { admit, join, submit } from "@red-cup-engineering/moose/engine";
import { decodeSnapshot, encodeSnapshot } from "@red-cup-engineering/moose/engine-snapshot";
import { checkpointHistory, historyHeads, mergeHistories } from "@red-cup-engineering/moose/world-history";
import { defineWorldReadingPolicy, readWorld } from "@red-cup-engineering/moose/world-reading";
import {
  admitWorldSpeech, cells, placeOf, receiveWorldSpeech, roomSpeech, tell, validateWorld,
  worldSpeechRoom, worldSpeechSource, worldSpeechText,
  WORLD_SPEECH_FROM, WORLD_SPEECH_GROUP, WORLD_SPEECH_TO, WORLD_SPEECH_WITHDRAWAL,
} from "@red-cup-engineering/moose/world";

const sender = Object.freeze({
  actor: "https://garden.example/actors/river",
  dimension: "https://garden.example/dimensions/garden",
  world: "https://garden.example/worlds/riverbank",
});
const group = "https://harbor.example/actors/commons";
const remoteGroup = "https://garden.example/actors/riverbank";
function occurrence(id, content) {
  return {
    ...sender, recipient: group, content,
    activityId: "https://garden.example/activities/" + id,
    noteId: "https://garden.example/actors/river/notes/" + id,
  };
}
function grant(subject, predicate, object, evidence = "potential") {
  return { subject, predicate, object, evidence };
}
async function commons() {
  const { engine, ids } = await createNativeWorldExample();
  const inhabited = join(join(engine, "alice", { name: "Alice" }), "mei", { name: "Mei", at: ids.harbor });
  const world = tell(inhabited.world, [
    grant(ids.inn, WORLD_SPEECH_GROUP, group),
    grant(ids.inn, WORLD_SPEECH_FROM, sender),
    grant(ids.inn, WORLD_SPEECH_TO, remoteGroup),
  ], { source: "local room owners" });
  return { engine: { ...inhabited, world }, room: ids.inn, ids };
}
function excluding(world, subject) {
  const policy = defineWorldReadingPolicy({
    id: "local visibility", version: "1",
    read: ({ source }) => ({ cells: source.subjects()
      .filter(id => id !== subject).flatMap(id => source.rawCells(id)) }),
  });
  return readWorld(world, { policy });
}

test("addressed World speech retains distinct witnessed occurrences across checkpoint and restart", async () => {
  const { engine, ids, room } = await commons();
  const first = occurrence("one", "The harbor is clear.");
  const second = occurrence("two", first.content);
  const mentioned = tell(engine.world, [
    grant(first.activityId, "world-speech-occurrence", first),
    grant(first.activityId, "world-speech-heard-in", room),
  ], { source: first.activityId });
  assert.deepEqual(roomSpeech(mentioned, room), []);
  assert.throws(() => receiveWorldSpeech(mentioned, first, { room }), /common occurrence witness/);
  const initial = receiveWorldSpeech(engine.world, first, { room });
  assert.equal(initial.appended, true);
  assert.deepEqual(historyHeads(engine.world), initial.world.revisions.at(-1).parents);
  assert.equal(initial.world.revisions.at(-1).source, first.activityId);
  const both = receiveWorldSpeech(initial.world, second, { room }).world;
  assert.deepEqual(roomSpeech(both, room), [first, second]);
  assert.equal(placeOf(both, first.actor), null);
  assert.deepEqual(roomSpeech(both, ids.harbor), []);

  const checkpoint = validateWorld(JSON.parse(JSON.stringify(checkpointHistory(both))));
  assert.deepEqual(roomSpeech(checkpoint, room), [first, second]);
  assert.equal(receiveWorldSpeech(checkpoint, first, { room }).appended, false);
  const restored = decodeSnapshot(encodeSnapshot({ ...engine, world: both }));
  assert.deepEqual(roomSpeech(restored.world, room), [first, second]);
  const repeat = receiveWorldSpeech(restored.world, first, { room });
  assert.equal(repeat.appended, false);
  assert.equal(repeat.world, restored.world);
  assert.throws(() => receiveWorldSpeech(restored.world, { ...first, content: "another body" }, { room }), /different or opposed/);
  const alternative = receiveWorldSpeech(engine.world, { ...first, content: "another report" }, { room }).world;
  const merged = mergeHistories(initial.world, alternative);
  assert.deepEqual(roomSpeech(merged, room), []);
  assert.equal(cells(merged, first.activityId, "world-speech-occurrence").length, 2);
  assert.deepEqual(roomSpeech(excluding(both, first.activityId), room), [second]);

  const heard = admit(submit(restored, { actor: "alice", command: "listen 1" }));
  assert.equal(heard.receipt.events.filter(e => e.channel === "speech").length, 1);
  assert.ok(heard.receipt.events.some(e => e.text.includes(first.actor) && e.text.includes(first.content)));
  const absent = admit(submit(restored, { actor: "mei", command: "listen" }));
  assert.ok(absent.receipt.events.every(e => !e.text.includes(first.content)));
});

test("World speech requires the current room Group and unopposed authority in both directions", async () => {
  const { engine: { world }, room, ids } = await commons();
  const speech = occurrence("one", "Meet us in the garden.");
  assert.equal(worldSpeechRoom(world, remoteGroup), null);
  assert.equal(admitWorldSpeech(world, speech), room);
  assert.deepEqual(worldSpeechSource(world, "alice", remoteGroup), {
    dimension: ids.dimension, world: ids.riverWorld, room, group,
  });
  assert.throws(() => worldSpeechSource(world, "mei", remoteGroup), /Group/);
  assert.throws(() => worldSpeechSource(world, "alice", group), /world-speech-to/);
  assert.throws(() => receiveWorldSpeech(world, speech, { room: ids.harbor }), /another room/);
  for (const field of ["actor", "dimension", "world", "recipient"])
    assert.throws(() => admitWorldSpeech(world, { ...speech, [field]: "https://elsewhere.example/" }));

  const contested = tell(world, [
    grant(room, WORLD_SPEECH_FROM, sender, "active"),
    grant(room, WORLD_SPEECH_TO, remoteGroup, "active"),
  ], { source: "room owner revocation" });
  assert.throws(() => receiveWorldSpeech(contested, speech, { room }), /world-speech-from/);
  assert.throws(() => worldSpeechSource(contested, "alice", remoteGroup), /world-speech-to/);
  assert.throws(() => receiveWorldSpeech(contested, speech, { room, reading: readWorld(world) }), /actual receiving World/);
  const ambiguous = tell(world, grant(ids.harbor, WORLD_SPEECH_GROUP, group));
  assert.throws(() => admitWorldSpeech(ambiguous, speech), /exactly one/);
  assert.throws(() => worldSpeechSource(ambiguous, "alice", remoteGroup), /exactly one/);
  const hidden = excluding(world, room);
  assert.throws(() => receiveWorldSpeech(world, speech, { room, reading: hidden }), /no local speech room/);
  assert.equal(worldSpeechText("é".repeat(2048)).length, 2048);
  assert.throws(() => worldSpeechText("é".repeat(2049)), /4096/);
});

test("a city edition withdraws only its own exact speech witnesses and can offer the room again", () => {
  const room = "square";
  const dimension = "https://city.example/dimensions/City";
  const worldId = "ni:///sha-256;" + "A".repeat(43);
  const granted = [grant(room, WORLD_SPEECH_GROUP, group), grant(room, WORLD_SPEECH_TO, remoteGroup),
    grant(room, WORLD_SPEECH_FROM, sender)];
  const definition = assertions => defineGame({
    id: "city", name: "City", start: room, dimension,
    worlds: { [worldId]: {name: "City", description: "The city", policy: "runtime"} },
    areas: { district: {name: "District", description: "A district", within: worldId} },
    rooms: { [room]: {name: "Square", description: "The square", within: "district"} },
    assertions,
  });
  const open = definition(granted), closed = definition([]);
  assert.deepEqual(defineGame(open), open);
  assert.throws(() => defineGame({...open, dimension: "ni:invalid"}));
  assert.throws(() => defineGame({...open, dimension: room}), /collides/);
  assert.throws(() => defineGame({...open, functionalPredicates: [WORLD_SPEECH_FROM]}), /cannot be functional/);
  const original = tell(instantiateGame(open), grant("alice", "located-in", room), {source: "arrival"});
  const phrase = occurrence("written-once", "We will be here tomorrow.");
  const heard = receiveWorldSpeech(original, phrase, {room}).world;
  assert.deepEqual(worldSpeechSource(heard, "alice", remoteGroup), {dimension, world: worldId, room, group});
  const restored = validateWorld(structuredClone(checkpointHistory(evolveGameWorld(heard, open, closed))));
  assert.equal(worldSpeechRoom(restored, group), null);
  const hiddenWithdrawals = defineWorldReadingPolicy({
    id: "visible room facts", version: "1", read: ({source}) => ({
      cells: source.subjects().flatMap(id => source.rawCells(id)).filter(at => at.predicate !== WORLD_SPEECH_WITHDRAWAL),
    }),
  });
  assert.equal(worldSpeechRoom(readWorld(restored, {policy: hiddenWithdrawals}), group), null);
  assert.throws(() => worldSpeechSource(restored, "alice", remoteGroup), /Group/);
  assert.deepEqual(roomSpeech(restored, room), [phrase]);
  const reopened = evolveGameWorld(restored, closed, open);
  assert.equal(admitWorldSpeech(reopened, phrase), room);
  assert.deepEqual(worldSpeechSource(reopened, "alice", remoteGroup), {dimension, world: worldId, room, group});
  assert.deepEqual(roomSpeech(reopened, room), [phrase]);

  // Other authors can support the same tuple or oppose it. Rotating one
  // edition may neither withdraw their support nor lift their opposition.
  const independent = tell(heard, [granted[0], granted[1]], {source: "local council"});
  const remaining = evolveGameWorld(independent, open, closed);
  assert.equal(worldSpeechSource(remaining, "alice", remoteGroup).room, room);
  assert.throws(() => admitWorldSpeech(remaining, phrase), /world-speech-from/);
  const opposed = tell(remaining, grant(room, WORLD_SPEECH_FROM, sender, "active"), {source: "local council"});
  assert.throws(() => admitWorldSpeech(evolveGameWorld(opposed, closed, open), phrase), /world-speech-from/);
});
