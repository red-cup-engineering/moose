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
    "src/world-gateway.mjs",
    "src/world.mjs",
    "src/world-reading.mjs",
    "src/world-history.mjs",
    "src/geometry.mjs",
    "test/application.test.mjs",
    "test/timeline.test.mjs",
  ];
  for (const path of paths) {
    const absolute = fileURLToPath(new URL("../" + path, import.meta.url));
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", absolute],
      { stdio: "pipe", timeout: 15_000 }), path + " must parse as native ESM");
  }
});


test("Fetch installation has no mandatory social or managed hosting supplier", () => {
  const pkg = JSON.parse(file("package.json"));
  assert.deepEqual(Object.keys(pkg.dependencies), [
    "@red-cup-engineering/living-web-server",
    "@red-cup-engineering/knowledge-system-server",
    "@red-cup-engineering/computer-data-engineering-services-section",
  ]);
  for (const [name, version] of Object.entries({
    "@red-cup-engineering/activitypub-server": "0.1.4-dev.89",
    "@red-cup-engineering/activitypub-services-section": "0.11.2",
    "@red-cup-engineering/javascript-file-services-section": "0.1.1",
  })) {
    assert.equal(pkg.peerDependencies[name], version);
    assert.equal(pkg.peerDependenciesMeta[name].optional, true);
    assert.equal(pkg.devDependencies[name], version);
  }
  assert.equal(pkg.exports["./public-readers"], "./src/timeline.mjs");
  assert.doesNotMatch(file("src/fetch.mjs"), /from ["']\.\/timeline\.mjs["']/u);
  assert.match(file("src/application.mjs"), /createMoosePublicReaders.*from ["']\.\/timeline\.mjs["']/u);
  assert.equal(pkg.exports["./cairn-file-claims"], "./src/cairn-file-claims.mjs");
  for (const path of ["src/fetch.mjs", "src/source-application.mjs"]) {
    assert.doesNotMatch(file(path), /from ["'](?:node:|@red-cup-engineering\/knowledge-system-server|\.\/(?:cairn-file-claims|world(?:-gateway|-reading|-history)?|geometry)\.mjs)/u,
      "separate native CAIRN and World exports must not enter the portable Fetch import path");
  }
  assert.equal(pkg.exports["./world-gateway"], "./src/world-gateway.mjs");
  for (const entry of ["world", "world-reading", "world-history", "geometry"]) {
    assert.equal(pkg.exports["./" + entry], "./src/" + entry + ".mjs");
  }
  for (const [name, version] of Object.entries({
    "@red-cup-engineering/computer-data-engineering-services-section": "0.2.0",
  })) {
    assert.equal(pkg.dependencies[name], version);
    assert.equal(pkg.peerDependencies[name], undefined);
  }
  for (const [name, version] of Object.entries({
    "@red-cup-engineering/json-services-section": "0.4.0",
    "@red-cup-engineering/computer-content-address-engineering-services-section": "0.2.0",
  })) {
    assert.equal(pkg.peerDependencies[name], version);
    assert.equal(pkg.peerDependenciesMeta[name].optional, true);
    assert.equal(pkg.devDependencies[name], version);
    assert.equal(pkg.dependencies[name], undefined);
  }
});
