import assert from "node:assert/strict";
import test from "node:test";
import { createMooseSite, createMooseEngine } from "../src/application.mjs";

const ORIGIN = "https://social.example";
function fixture(readPublicTimeline = async () => ({ items: [], hasMore: false }), authorize = async () => true, readPublicActorTimeline) {
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
    ...(readPublicActorTimeline === undefined ? {} : { readPublicActorTimeline }),
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
  assert.match(await (await get("/@garden/")).text(), /Gardeners/);
  assert.match(await (await get("/@garden/")).text(), /ActivityPub/);
  assert.doesNotMatch(await (await get("/@garden/")).text(), /First public action/,
    "an unrelated author must not appear on this actor's homepage");
  assert.match(await (await get("/@garden")).text(), /Gardeners/);
  assert.equal((await get("/@unknown/")).status, 404);
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


test("FeltOS mounts the actual independent MOOSE application on exact native social routes", async () => {
  let current = "a public observation";
  const native = fixture(async () => ({ items: [{
    id: ORIGIN + "/actors/garden/notes/one", author: "garden",
    visibility: "public", summary: current,
  }], hasMore: false }));
  const site = createMooseSite({
    origin: ORIGIN, provider: native.provider, basePath: "/social",
    readPublicTimeline: async () => ({ items: [{
      id: ORIGIN + "/actors/garden/notes/one", author: "garden",
      visibility: "public", summary: current,
    }], hasMore: false }),
    readPublicActor: async ({ identifier }) => identifier === "garden"
      ? { identifier, name: "Gardeners", summary: "Current community" } : null,
    readPublicActorTimeline: async ({ identifier }) => ({
      items: [{ id: ORIGIN + "/actors/" + identifier + "/notes/one",
        author: identifier, visibility: "public", summary: current }],
      hasMore: false, coverage: "bounded-source-outbox",
    }),
    authorizePublicRead: async ({ resource }) =>
      resource === "home" || resource === "actor-profile",
  });
  assert.deepEqual(site.resources.map(route => route.match), [
    "/social", "/social/people/garden", "/@garden", "/@garden/",
    "/social/@garden", "/social/@garden/",
  ]);
  assert.ok(site.resources.every(route => route.public === true));
  const get = path => site.website.fetch(new Request(ORIGIN + path, {
    headers: { accept: "text/html" },
  }));
  assert.equal((await get("/")).status, 404,
    "the social site cannot seize the native world's homepage");
  const first = await get("/social");
  assert.equal(first.status, 200);
  assert.match(await first.text(), /a public observation/);
  current = "new source observation";
  assert.match(await (await get("/social")).text(), /new source observation/);
  assert.match(await (await get("/social/people/garden")).text(), /Gardeners/);
  assert.match(await (await get("/social/@garden/")).text(), /Gardeners/);
  assert.match(await (await get("/@garden/")).text(), /Gardeners/,
    "the canonical Actor home is at the host root, not hidden under /social");
  assert.match(await (await get("/@garden/")).text(), /new source observation/);
  assert.match(await (await get("/social/@garden/")).text(), /new source observation/,
    "a current, source-owned public post appears on the actor home");
  assert.equal((await get("/social/people/unknown")).status, 404);
  assert.equal((await site.website.fetch(new Request("https://foreign.example/social"))).status, 421);
});

test("an Actor home reads the Actor-specific source, not a truncated global feed", async () => {
  let globalReads = 0;
  let scopedReads = 0;
  const site = fixture(async () => {
    globalReads++;
    return { items: [{ id: ORIGIN + "/actors/other/notes/old",
      author: "other", summary: "UNRELATED_GLOBAL", visibility: "public" }], hasMore: false };
  }, async () => true, async ({ identifier, maxItems }) => {
    scopedReads++;
    assert.equal(identifier, "garden");
    assert.equal(maxItems, 64);
    return { items: [{ id: ORIGIN + "/actors/garden/notes/own",
      author: "garden", visibility: "public", summary: "GARDEN_SPECIFIC" }],
      hasMore: false, coverage: "bounded-source-outbox" };
  });
  const html = await (await site.website.fetch(new Request(ORIGIN + "/@garden/", {
    headers: { accept: "text/html" },
  }))).text();
  assert.match(html, /GARDEN_SPECIFIC/);
  assert.doesNotMatch(html, /UNRELATED_GLOBAL/);
  assert.equal(globalReads, 0, "an Actor homepage must not consume the site-wide feed");
  assert.equal(scopedReads, 1);
  assert.match(html, /bounded/i, "do not claim the sampled outbox is complete");
});

test("Actor homepage refuses a source reader that leaks another Actor's post", async () => {
  const site = fixture(undefined, undefined, async () => ({
    items: [{ id: ORIGIN + "/actors/other/notes/one",
      author: "other", summary: "PRIVATE_BOUNDARY", visibility: "public" }],
    hasMore: false,
  }));
  const response = await site.website.fetch(new Request(ORIGIN + "/@garden/", {
    headers: { accept: "text/html" },
  }));
  assert.notEqual(response.status, 200);
  assert.doesNotMatch(await response.text(), /PRIVATE_BOUNDARY/);
});

test("same printable handle on two settlements never means one Actor", async () => {
  const make = (origin, description) => {
    const provider = {
      origin, identifier: "garden", identifiers: ["garden"],
      actorTypes: ["Group", "Person", "Service"],
      routeCapabilities: { dynamicActors: true, publicObjects: true },
      fetch: async request => new URL(request.url).pathname === "/actors/garden"
        ? Response.json({ type: "Group", id: origin + "/actors/garden",
          outbox: origin + "/actors/garden/outbox" })
        : new Response(null, { status: 404 }),
    };
    return createMooseSite({ origin, provider, basePath: "/social",
      readPublicTimeline: async () => ({ items: [], hasMore: false }),
      readPublicActor: async ({ identifier }) => ({
        identifier, name: description, summary: "Resident only at " + origin,
      }),
      readPublicActorTimeline: async ({ identifier }) => ({
        items: [{ id: origin + "/actors/" + identifier + "/notes/one",
          author: identifier, summary: description + " owns this observation",
          visibility: "public" }],
        hasMore: false, coverage: "bounded-source-outbox",
      }),
      authorizePublicRead: async () => true,
    });
  };
  const first = "https://west.example", second = "https://east.example";
  const engine = createMooseEngine({ sites: [
    make(first, "WEST_GARDEN"), make(second, "EAST_GARDEN"),
  ] });
  const page = async origin => {
    const response = await engine.fetch(new Request(origin + "/@garden/",
      { headers: { accept: "text/html" } }));
    assert.equal(response.status, 200);
    return response.text();
  };
  const west = await page(first), east = await page(second);
  assert.match(west, /WEST_GARDEN/);
  assert.doesNotMatch(west, /EAST_GARDEN/);
  assert.match(east, /EAST_GARDEN/);
  assert.doesNotMatch(east, /WEST_GARDEN/);
  assert.match(west, /west.example\/actors\/garden/);
  assert.match(east, /east.example\/actors\/garden/);
  for (const origin of [first, second]) {
    const response = await engine.fetch(new Request(origin + "/actors/garden",
      { headers: { accept: "application/activity+json" } }));
    assert.equal(response.status, 200);
    const actor = await response.json();
    assert.equal(actor.id, origin + "/actors/garden",
      "identical printable handles cannot rewrite the original Actor IRI");
  }
  assert.equal((await engine.fetch(new Request("https://third.example/@garden/"))).status, 421,
    "an unknown settlement must not borrow an authorized Actor from either house");
});
