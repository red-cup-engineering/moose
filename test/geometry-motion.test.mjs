import assert from "node:assert/strict";
import test from "node:test";
import { nearestCompass, parseTarget, stepInPlane } from "../src/geometry.mjs";

const pose = { position: [10, 20, 3], heading: 45 };

test("movement targets retain absolute coordinates and signed compass distances", () => {
  assert.deepEqual(parseTarget("  3 4 5  ", pose), [3, 4, 5]);
  assert.deepEqual(parseTarget("-3 4", pose), [-3, 4]);
  assert.deepEqual(parseTarget(" NORTH 6 ", pose), [10, 26]);
  assert.deepEqual(parseTarget("north -6", pose), [10, 14]);
});

test("only own compass directions can produce movement targets", () => {
  for (const direction of ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"]) {
    assert.equal(parseTarget(`${direction} 6`, pose), null, direction);
  }
});

test("invalid or overflowing target input is refused without nonfinite coordinates", () => {
  for (const input of [null, undefined, 42, {}, "", "north", "north Infinity", "1 NaN", "1 2 3 4"]) {
    assert.equal(parseTarget(input, pose), null, String(input));
  }
  assert.equal(parseTarget("east 1e308", { position: [1e308, 0, 0], heading: 0 }), null);
  assert.equal(parseTarget("north 1", { position: [0, NaN, 0], heading: 0 }), null);
});

test("a bounded step advances toward its target and preserves input values", () => {
  const start = structuredClone(pose), target = [13, 24, 99];
  const result = stepInPlane(start, target, 2);
  assert.deepEqual(result.xy, [11.2, 21.6]);
  assert.equal(result.t, 0.4);
  assert.ok(Math.abs(result.heading - 36.86989764584405) < 1e-10);
  assert.deepEqual(start, pose);
  assert.deepEqual(target, [13, 24, 99]);
  assert.deepEqual(stepInPlane(pose, target, 5).xy, [13, 24]);
  assert.equal(stepInPlane(pose, target, 20).t, 1);
});

test("zero movement preserves orientation and reports whether the target is reached", () => {
  assert.deepEqual(stepInPlane(pose, [10, 20], 0), { xy: [10, 20], t: 1, heading: 45 });
  assert.deepEqual(stepInPlane(pose, [30, 20], 0), { xy: [10, 20], t: 0, heading: 45 });
});

test("invalid movement bounds and coordinates cannot reverse or poison a step", () => {
  for (const distance of [-1, NaN, Infinity, -Infinity, undefined, "6"]) {
    assert.throws(() => stepInPlane(pose, [30, 20], distance), RangeError);
  }
  for (const target of [null, [], [1], Array(2), [1, NaN], [1, 2, Infinity], [1, 2, 3, 4]]) {
    assert.throws(() => stepInPlane(pose, target, 6), TypeError);
  }
  for (const start of [null, {}, { position: Array(3), heading: 0 }, { position: [NaN, 0, 0], heading: 0 }, { position: [0, 0, 0], heading: Infinity }]) {
    assert.throws(() => stepInPlane(start, [30, 20], 6), TypeError);
  }
});

test("finite extreme coordinates still produce bounded finite movement", () => {
  const result = stepInPlane({ position: [-1e308, 0, 0], heading: 0 }, [1e308, 0], 1e308);
  assert.deepEqual(result.xy, [0, 0]);
  assert.equal(result.t, 0.5);
  assert.equal(result.heading, 90);
});

test("planar movement conserves the requested bound across directions and distances", () => {
  for (let degrees = 0; degrees < 360; degrees += 15) for (const distance of [0, 1, 6, 20, 100]) {
    const radians = degrees * Math.PI / 180;
    const target = [10 + Math.sin(radians) * distance, 20 + Math.cos(radians) * distance];
    const result = stepInPlane(pose, target, 6);
    assert.ok(result.xy.every(Number.isFinite));
    assert.ok(result.t >= 0 && result.t <= 1);
    assert.ok(Math.hypot(result.xy[0] - 10, result.xy[1] - 20) <= 6 + 1e-12);
    assert.ok(Math.hypot(target[0] - result.xy[0], target[1] - result.xy[1]) <= distance + 1e-12);
  }
});

test("compass headings are invariant under complete positive and negative rotations", () => {
  for (const [degrees, expected] of [[0, "north"], [90, "east"], [180, "south"], [270, "west"]]) {
    for (const turns of [-100, -3, -2, -1, 0, 1, 2, 100]) assert.equal(nearestCompass(degrees + turns * 360), expected);
  }
  for (const degrees of [NaN, Infinity, -Infinity, "90", null]) assert.throws(() => nearestCompass(degrees), TypeError);
});
