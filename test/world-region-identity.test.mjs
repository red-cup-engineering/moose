import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCATED_IN, POSE, REGION, createWorld, tell, queryWorld, regionOf, regionsOf, sightOf, perceivedOf,
} from "../src/world.mjs";

const region = (label) => ({
  body: { kind: "world-region-identity.fixture.v1", label,
    lower: [0, 0, 0], upper: [1, 1, 1] },
});
const withRegions = (declarations) => tell(
  createWorld(),
  declarations.map(({ subject, value, evidence = "potential" }) =>
    ({ subject, predicate: REGION, object: value, evidence })),
  { source: "moose/world-region-identity receiving" },
);

test("native World cover keeps prototype-named admitted source regions", () => {
  const names = ["constructor", "__proto__", "toString", "ordinary"];
  const values = names.map((subject) => ({ subject, value: region(subject) }));
  const world = withRegions(values);
  for (const name of names) {
    assert.equal(queryWorld(world, { subject: name, predicate: REGION }).length, 1,
      `the source history actually contains ${name}`);
    assert.deepEqual(regionOf(world, name), region(name));
  }
  const cover = regionsOf(world);
  assert.deepEqual(Object.keys(cover).sort(), names.slice().sort(),
    "World cannot confuse a source subject with Object.prototype membership");
  for (const name of names) {
    assert.equal(Object.hasOwn(cover, name), true);
    assert.deepEqual(cover[name], region(name));
  }
  assert.equal(Object.getPrototypeOf(cover), Object.prototype);
  assert.equal(Object.isFrozen(cover), true);
  assert.deepEqual(JSON.parse(JSON.stringify(cover)), cover,
    "ordinary JSON projection retains every independently admitted name");
  assert.throws(() => { cover.constructor = region("forged"); }, TypeError);
  assert.deepEqual(regionsOf(world), cover, "repeat readings are deterministic");
});

test("the cover selects unique regions by the original SignCell coincidence relation", () => {
  const names = ["caf\u00e9", "cafe\u0301"];
  const world = withRegions(names.map((subject) => ({ subject, value: region("café") })));
  const cover = regionsOf(world);
  const matching = Object.keys(cover).filter(name => name.normalize("NFC") === "café");
  assert.equal(matching.length, 1, "equivalent source carriers are one region");
  assert.deepEqual(cover[matching[0]], region("café"));
});

test("negative-only or missing regions do not become positive geometry", () => {
  const world = withRegions([
    { subject: "unwitnessed", value: region("unwitnessed"), evidence: "active" },
    { subject: "observed", value: region("observed") },
  ]);
  assert.equal(regionOf(world, "unwitnessed"), null);
  const cover = regionsOf(world);
  assert.deepEqual(Object.keys(cover), ["observed"]);
  assert.equal(Object.hasOwn(cover, "unwitnessed"), false);
  assert.equal(Object.hasOwn(cover, "nonexistent"), false);
});

test("actual World sight and actor perception receive geometry named by a source carrier", () => {
  const prism = (from, to) => ({
    body: { footprint: [[from, 0], [to, 0], [to, 10], [from, 10]], z: [0, 3] },
  });
  const pose = x => ({ position: [x, 5, 1], heading: 0 });
  const world = tell(createWorld(), [
    { subject: "world-one", predicate: "kind", object: "world" },
    { subject: "lookout", predicate: "kind", object: "room" },
    { subject: "constructor", predicate: "kind", object: "room" },
    { subject: "lookout", predicate: LOCATED_IN, object: "world-one" },
    { subject: "constructor", predicate: LOCATED_IN, object: "world-one" },
    { subject: "lookout", predicate: REGION, object: prism(0, 10) },
    { subject: "constructor", predicate: REGION, object: prism(10, 20) },
    { subject: "observer", predicate: LOCATED_IN, object: "lookout" },
    { subject: "observer", predicate: POSE, object: pose(5) },
    { subject: "target", predicate: LOCATED_IN, object: "constructor" },
    { subject: "target", predicate: POSE, object: pose(15) },
  ], { source: "original World perception receiving" });
  assert.deepEqual(Object.keys(regionsOf(world)).sort(), ["constructor", "lookout"]);
  assert.ok(sightOf(world, "observer").includes("target"),
    "a real distant source-named region must participate in the World sight cover");
  assert.ok(perceivedOf(world, "observer").subjects.includes("target"),
    "the original actor perception must receive the same visible subject");
});
