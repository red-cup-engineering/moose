import assert from "node:assert/strict";
import test from "node:test";
import { createMooseSite, createMooseEngine } from "../src/application.mjs";

const ORIGIN = "https://social.example";
function fixture(readPublicTimeline = async () => ({ items: [], hasMore: false }), authorize = async () => true) {
  const provider = {
    origin: ORIGIN,
    identifier: "garden",
    identifiers: ["garden"],
    actorTypes: Object.freeze(["Group", "Person", "Service"]),
    routeCapabilities: { dynamicActors: true },
    fetch: async request => {
      const path = new URL(request.url).pathname;
      return path === "/actors/garden"
        ? Response.json({ type: "Group", id: ORIGIN + path })
        : new Response(null, { status: 404 });
    },
  };
  return createMooseSite({
    origin: ORIGIN, provider,
    readPublicTimeline,
    readPublicActor: async ({ identifier }) => identifier === "garden"
      ? { identifier, name: "Gardeners", summary: "Current public community" } : null,
    authorizePublicRead: authorize,
  });
}

test("MOOSE exposes live TUFTE pages and native ActivityPub without another HTTP server", async () => {
  let status = "First public action";
  const site = fixture(async () => ({ items: [{
    id: ORIGIN + "/activities/one", visibility: "public",
    summary: status, author: "Gardeners",
  }], hasMore: false }));
  const engine = createMooseEngine({ sites: [site] });
  const get = (path, accept = "text/html") => engine.fetch(new Request(ORIGIN + path, { headers: { accept } }));
  const first = await get("/");
  assert.equal(first.status, 200);
  assert.match(await first.text(), /First public action/);
  status = "New public action";
  assert.match(await (await get("/")).text(), /New public action/, "read one original current source");
  const actor = await get("/actors/garden", "application/activity+json");
  assert.equal((await actor.json()).type, "Group", "native provider remains actor authority");
  assert.match(await (await get("/people/garden")).text(), /Gardeners/);
  assert.equal((await get("/actors/unknown", "application/activity+json")).status, 404);
  assert.equal((await get("/people/unknown")).status, 404);
  assert.equal((await get("/not-in-moose")).status, 404);
  assert.equal((await engine.fetch(new Request("https://foreign.example/"))).status, 421);
});

test("MOOSE refuses private public-feed entries and unqualified older providers", async () => {
  const site = fixture(async () => ({ items: [{
    id: ORIGIN + "/activities/private", visibility: "followers",
    summary: "secret", author: "Gardeners",
  }], hasMore: false }));
  const read = await site.website.fetch(new Request(ORIGIN + "/", { headers: { accept: "text/html" } }));
  assert.notEqual(read.status, 200);
  const source = fixture();
  assert.throws(() => createMooseSite({
    origin: ORIGIN, provider: { ...source.provider, actorTypes: ["Service"] },
    readPublicTimeline: async () => ({ items: [], hasMore: false }),
    readPublicActor: async () => null, authorizePublicRead: async () => true,
  }), /Group-capable ActivityPub/);
});

test("the live source may deny a page without revealing its existence", async () => {
  let reads = 0;
  const site = fixture(async () => { reads++; return { items: [], hasMore: false }; }, async () => false);
  const res = await site.website.fetch(new Request(ORIGIN + "/"));
  assert.equal(res.status, 404);
  assert.equal(reads, 0);
});
