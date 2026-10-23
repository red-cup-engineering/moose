import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const file = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("MOOSE Fetch entry owns live TUFTE pages without eager managed hosting imports", () => {
  const live = file("src/fetch.mjs");
  const host = file("src/application.mjs");
  const pkg = JSON.parse(file("package.json"));
  assert.ok(live.includes('from "@red-cup-engineering/living-web-server/fetch"'));
  assert.ok(live.includes("export function createMooseSite("));
  assert.ok(live.includes("createLivingWebServer({"));
  assert.ok(live.includes("readPublicActorTimeline"));
  assert.doesNotMatch(live, /@red-cup-engineering\\/activitypub-server/u,
    "a site-only Worker must not eagerly import a Node-managed listener");
  assert.doesNotMatch(live, /from ["']node:/u);
  assert.ok(host.includes("serveManagedActivityPubSites"),
    "the original managed hosting supplier must remain available to Node deployments");
  assert.ok(host.includes('from "./fetch.mjs"'));
  assert.equal(pkg.exports["./fetch"], "./src/fetch.mjs");
  assert.ok(pkg.dependencies["@red-cup-engineering/living-web-server"]);
  assert.equal(pkg.dependencies["@red-cup-engineering/computer-web-server"], undefined);
});
