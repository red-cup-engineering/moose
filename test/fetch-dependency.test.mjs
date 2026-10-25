import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const file = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("MOOSE Fetch entry owns live TUFTE pages without eager managed hosting imports", () => {
  const live = file("src/fetch.mjs");
  const host = file("src/application.mjs");
  const pkg = JSON.parse(file("package.json"));
  const application = file("src/source-application.mjs");
  assert.ok(application.includes('from "@red-cup-engineering/living-web-server/fetch"'));
  assert.ok(live.includes("export function createMooseSite("));
  assert.ok(live.includes("createMooseApplication({"));
  assert.ok(application.includes("createLivingWebServer({"));
  assert.ok(live.includes("readPublicActorTimeline"));
  assert.equal(live.includes("@red-cup-engineering/activitypub-server"), false,
    "a site-only Worker must not eagerly import a Node-managed listener");
  assert.doesNotMatch(live, /from ["']node:/u);
  assert.ok(host.includes("serveManagedActivityPubSites"),
    "the original managed hosting supplier must remain available to Node deployments");
  assert.ok(host.includes('from "./fetch.mjs"'));
  assert.equal(pkg.exports["./fetch"], "./src/fetch.mjs");
  assert.ok(pkg.dependencies["@red-cup-engineering/living-web-server"]);
  assert.equal(pkg.dependencies["@red-cup-engineering/computer-web-server"], undefined);
});

test("source qualification parses the actual MOOSE Fetch, Actor outbox and application tests", () => {
  const paths = [
    "src/application.mjs",
    "src/fetch.mjs",
    "src/source-application.mjs",
    "src/timeline.mjs",
    "src/local-node.mjs",
    "test/application.test.mjs",
    "test/timeline.test.mjs",
  ];
  for (const path of paths) {
    const absolute = fileURLToPath(new URL("../" + path, import.meta.url));
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", absolute],
      { stdio: "pipe", timeout: 15_000 }), path + " must parse as native ESM");
  }
});
