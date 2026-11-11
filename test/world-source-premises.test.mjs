import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { composeThings } from "@red-cup-engineering/signcraft/thing";
import { historyHeads, historySection, observeHistory } from "@red-cup-engineering/moose/world-history";
import { admit, createEngine, join, submit } from "@red-cup-engineering/moose/engine";
import { restoreEngine, snapshotEngine } from "@red-cup-engineering/moose/engine-snapshot";
import {
  cells, certainValue, createWorld, earshotOf, exitDestinationOf, exitsOf,
  LOCATED_IN, placeOf, POSE, receiveComposedThingWorld, regionOf, REGION,
  sightOf, tell, worldPose,
} from "@red-cup-engineering/moose/world";
import { createNativeWorldExample } from "../examples/native-world.mjs";

const fromSigncraft = createRequire(import.meta.resolve("@red-cup-engineering/signcraft/thing"));
const { cell, cellSet, coincides } = await import(pathToFileURL(fromSigncraft.resolve("@red-cup-engineering/signcell/cell")).href);
const { utterance } = await import(pathToFileURL(fromSigncraft.resolve("@red-cup-engineering/signcell/utterance")).href);
const received = result => {
  assert.equal(result.ok, true, JSON.stringify(result.refusal));
  return result.value;
};
const replaceWorld = (engine, world) => restoreEngine(snapshotEngine(engine, { world }));
const command = (engine, actor, text) => admit(submit(engine, { actor, command: text }));

/** Preserve the original functional Cell while adding actual native contrary
 * testimony. This is an original history observation, not a fake World view. */
function oppose(world, subject, predicate, object) {
  const prior = historySection(world, subject, predicate).find(value => coincides(value.object, object));
  assert.ok(prior?.for.length, "the monitor opposes an existing original source Cell");
  const monitor = cell(subject, predicate, object, { against: [{ source: "independent source-premise monitor" }] });
  const next = observeHistory(world, cellSet([prior, monitor]), { source: "source-premise monitoring" });
  const observed = historySection(next, subject, predicate).find(value => coincides(value.object, object));
  assert.ok(observed.for.length && observed.against.length, "both native evidence lanes remain present");
  for (const witness of prior.for) assert.ok(observed.for.some(value => coincides(value, witness)));
  return next;
}

async function neighboringActors() {
  const fixture = await createNativeWorldExample();
  let engine = join(fixture.engine, "alice", { name: "Alice" });
  engine = join(engine, "bob", { name: "Bob", at: fixture.ids.garden });
  return { ...fixture, engine };
}

function compositionWithParthood(fixture) {
  const additional = utterance({ source: "original native parthood author" }, {
    subject: fixture.ids.inn, predicate: "part-of", object: fixture.ids.riverWorld,
  });
  return received(composeThings({
    things: fixture.composed.things.map(({ typeId, source }) => ({ typeId, source })),
    relationSources: [...fixture.composed.relationPresentations.map(({ source }) => source), additional],
  }));
}

test("opposing an authored zero sight or voice range cannot expand native visibility or broadcast", async () => {
  const f = await neighboringActors();
  assert.ok(sightOf(f.engine.world, "alice").includes("bob"), "ordinary absent ranges retain their original defaults");
  assert.ok(earshotOf(f.engine.world, "alice", f.engine.actors).includes("bob"));
  const bounded = tell(f.engine.world, [
    { subject: "alice", predicate: "sight", object: 0 },
    { subject: "alice", predicate: "voice-range", object: 0 },
  ], { source: "authored zero remote range" });
  assert.ok(!sightOf(bounded, "alice").includes("bob"));
  assert.deepEqual(earshotOf(bounded, "alice", f.engine.actors), ["alice"]);
  const opposed = oppose(oppose(bounded, "alice", "sight", 0), "alice", "voice-range", 0);
  assert.equal(certainValue(opposed, "alice", "sight"), null);
  assert.equal(certainValue(opposed, "alice", "voice-range"), null);
  assert.ok(!sightOf(opposed, "alice").includes("bob"), "opposition must not select the absent-source sight default");
  assert.deepEqual(earshotOf(opposed, "alice", f.engine.actors), ["alice"]);
  const speech = command(replaceWorld(f.engine, opposed), "alice", "say Uncertain range must not broadcast.");
  assert.ok(speech.receipt.events.some(event => event.to === "alice" && event.text.includes("Uncertain range")));
  assert.ok(!speech.receipt.events.some(event => event.to === "bob" && event.text.includes("Uncertain range")));
});

test("a projected native exit loses traversal when its original exits-to relation is opposed", async () => {
  const f = await neighboringActors();
  const source = f.composed.relationPresentations.find(({ relationCell }) =>
    relationCell.subject === f.ids.inn && relationCell.predicate === "exits-to"
      && relationCell.object === f.ids.garden);
  assert.ok(source);
  assert.equal(exitDestinationOf(f.engine.world, f.ids.inn, "east"), f.ids.garden);
  const opposed = oppose(f.engine.world, source.relationCell.subject,
    source.relationCell.predicate, source.relationCell.object);
  assert.equal(certainValue(opposed, f.ids.inn, "exit:east"), f.ids.garden,
    "the historical directional projection itself still has its original positive source");
  assert.equal(exitDestinationOf(opposed, f.ids.inn, "east"), null,
    "current traversal consults the original relation rather than only its old projection");
  assert.ok(!exitsOf(opposed, f.ids.inn).some(exit => exit.direction === "east"));
  const walking = command(replaceWorld(f.engine, opposed), "alice", "east");
  assert.equal(placeOf(walking.engine.world, "alice"), f.ids.inn);
  const retained = historySection(walking.engine.world, f.ids.inn, "exits-to")
    .find(value => value.object === f.ids.garden);
  assert.ok(retained.against.length);
  for (const witness of source.relationCell.for)
    assert.ok(retained.for.some(value => coincides(value, witness)));
});

test("native parthood cannot substitute for an opposed Area-to-World containment premise", async () => {
  const f = await createNativeWorldExample();
  const composition = compositionWithParthood(f);
  const sourceWorld = received(await receiveComposedThingWorld(createWorld(), composition,
    { source: "original composition with distinct parthood and containment" })).world;
  const engine = join(createEngine(f.game, { world: sourceWorld }), "alice");
  const opposed = oppose(engine.world, f.ids.inn, LOCATED_IN, f.ids.riverWorld);
  assert.equal(certainValue(opposed, f.ids.inn, "part-of"), f.ids.riverWorld,
    "the independent parthood statement remains inspectable");
  assert.throws(() => createEngine(f.game, { world: opposed }), /certain|contested|entrance|Area|World/iu);
  const restored = replaceWorld(engine, opposed);
  assert.throws(() => join(restored, "latecomer"), /unknown|contested|place|Area/iu);
  const walking = command(restored, "alice", "east");
  assert.equal(placeOf(walking.engine.world, "alice"), f.ids.inn);
  assert.ok(cells(walking.engine.world, f.ids.inn, LOCATED_IN).some(value => value.for.length && value.against.length));
});

test("functional nonspatial source replay and later evidence keep both original witness lanes", async () => {
  const f = await createNativeWorldExample();
  const composition = compositionWithParthood(f);
  const original = composition.relationPresentations.find(({ relationCell }) => relationCell.predicate === "part-of").relationCell;
  const firstMonitor = cell(original.subject, original.predicate, original.object,
    { against: [{ source: "first independent parthood objection" }] });
  const options = { source: "functional nonspatial source admission", sourceCells: [firstMonitor] };
  const first = received(await receiveComposedThingWorld(createWorld({ functionalPredicates: ["part-of"] }), composition, options));
  const repeated = received(await receiveComposedThingWorld(first.world, composition, options));
  assert.equal(repeated.world, first.world, "opposition must not turn exact source replay into replacement or refusal");
  const nextMonitor = cell(original.subject, original.predicate, original.object,
    { against: [{ source: "second independent parthood objection" }] });
  const next = received(await receiveComposedThingWorld(first.world, composition,
    { ...options, sourceCells: [firstMonitor, nextMonitor] }));
  assert.equal(next.changed, true);
  assert.equal(next.world.revisions.length, first.world.revisions.length + 1);
  const [retained] = historySection(next.world, original.subject, original.predicate);
  assert.deepEqual(retained, cellSet([original, firstMonitor, nextMonitor])[0],
    "functional supersession retains the complete joined Cell rather than replacing the earlier lanes");
  assert.equal(certainValue(next.world, original.subject, original.predicate), null);
});

test("replaying the same original Thing occurrences under another receiving label creates no observation", async () => {
  const f = await createNativeWorldExample();
  const before = historyHeads(f.sourceWorld);
  const replayed = received(await receiveComposedThingWorld(f.sourceWorld, f.composed,
    { source: "another receiving label for the same retained occurrences" }));
  assert.equal(replayed.world, f.sourceWorld);
  assert.equal(replayed.changed, false);
  assert.equal(replayed.inserted, 0);
  assert.deepEqual(historyHeads(replayed.world), before);
});

test("opposed original geometry or pose cannot become a definite reading or movement premise", async () => {
  const f = await neighboringActors();
  const pose = worldPose(f.engine.world, "alice");
  const region = regionOf(f.engine.world, f.ids.inn);
  assert.ok(pose && region);
  for (const world of [
    oppose(f.engine.world, "alice", POSE, pose),
    oppose(f.engine.world, f.ids.inn, REGION, region),
  ]) {
    assert.equal(worldPose(world, "alice"), null);
    assert.deepEqual(sightOf(world, "alice"), []);
    assert.deepEqual(earshotOf(world, "alice", f.engine.actors), ["alice"]);
    const walking = command(replaceWorld(f.engine, world), "alice", "east");
    assert.equal(placeOf(walking.engine.world, "alice"), f.ids.inn);
  }
  const destination = oppose(f.engine.world, f.ids.garden, REGION, regionOf(f.engine.world, f.ids.garden));
  const walking = command(replaceWorld(f.engine, destination), "alice", "east");
  assert.equal(placeOf(walking.engine.world, "alice"), f.ids.inn,
    "a certain current pose cannot make an opposed destination extent usable");
});
