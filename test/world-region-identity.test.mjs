import assert from "node:assert/strict";
import test from "node:test";
import {
  REGION, createWorld, tell, queryWorld, regionOf, regionsOf,
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
