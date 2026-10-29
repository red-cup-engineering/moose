import assert from "node:assert/strict";
import test from "node:test";
import { projectMooseResourceInventory } from "../src/resource-readout.mjs";

const origin = "https://engineering.561.group";
const organization = "Red Cup Engineering";
const base = () => ({ type: "PublicResourceInventory", version: 1,
  origin: origin + "/", organization,
  resources: [
    { id: "tool", title: "Engineering instrument", url: origin + "/resources.json",
      access: { mode: "public-read" }, humanAction: "Inspect documented resources.",
      agentAccess: { method: "GET", mediaType: "application/json" } },
    { id: "source", title: "Original repository", url: "https://github.com/red-cup-engineering/moose",
      access: { mode: "authorized-repository-reader" }, humanAction: "Request owner authorization.",
      agentAccess: { method: "GET", authorization: "repository-owner-authorized" } },
    { id: "offer", title: "Machine operation", url: "https://market.561.group/mcp",
      access: { mode: "public-read-only-tools" }, humanAction: "Use its protocol client.",
      agentAccess: { method: "POST", mediaType: "application/json" } },
  ],
});
test("the original public inventory retains per-item rights and transport semantics", () => {
  const input = base(), before = JSON.stringify(input);
  const tiles = projectMooseResourceInventory(input, { origin, organization });
  assert.deepEqual(tiles.map(v => v.id),
    ["section-resource-tool", "section-resource-source", "section-resource-offer"]);
  assert.equal(tiles[0].links[0].href, origin + "/resources.json");
  assert.match(tiles[0].content, /Source-declared access: public-read/u);
  assert.match(tiles[1].links[0].label, /authorization required/u);
  assert.match(tiles[1].content, /authorized-repository-reader/u);
  assert.equal(Object.hasOwn(tiles[2], "links"), false, "POST is not a pretend browser GET");
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(tiles));
  assert.ok(tiles.every(Object.isFrozen));
});
test("reject mismatched house identity, duplicates, unsafe addresses and fabricated method", () => {
  const fixture = base();
  for (const data of [
    { ...fixture, origin: "https://services.561.group/" },
    { ...fixture, organization: "Causeway Services" },
    { ...fixture, resources: [...fixture.resources, fixture.resources[0]] },
    { ...fixture, resources: [{ ...fixture.resources[0], url: "javascript:alert(1)" }] },
    { ...fixture, resources: [{ ...fixture.resources[0], url: "http://example.org/" }] },
    { ...fixture, resources: [{ ...fixture.resources[0], agentAccess: { method: "DELETE" } }] },
  ]) assert.throws(() => projectMooseResourceInventory(data, { origin, organization }), TypeError);
});
