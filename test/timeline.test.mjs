import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC, readPublicTimeline, createMoosePublicReaders } from "../src/timeline.mjs";

const origin = "https://moose.example";
const actors = ["alice", "bob"];
const actorId = id => origin + "/actors/" + id;
const note = (identifier, id, published, props = {}) => ({
  type: "Create",
  actor: actorId(identifier),
  to: [PUBLIC],
  object: {
    id: actorId(identifier) + "/posts/" + id,
    type: "Note", attributedTo: actorId(identifier), content: "Body of " + id,
    published,
  },
  ...props,
});

function source(pages) {
  const calls = [];
  const provider = {
    origin,
    async fetch(request) {
      calls.push(request.url);
      const url = new URL(request.url);
      const match = /^\/actors\/([^/]+)\/outbox$/u.exec(url.pathname);
      if (!match || !Object.hasOwn(pages, match[1])) return new Response(null, { status: 404 });
      const items = pages[match[1]];
      return Response.json(url.searchParams.get("page") === "true" ? {
        type: "OrderedCollectionPage", orderedItems: items,
      } : {
        type: "OrderedCollection", totalItems: items.length,
        ...(items.length ? { first: origin + url.pathname + "?page=true" } : {}),
      });
    },
  };
  return { provider, calls };
}

test("two original signed-social outboxes produce one chronological live public timeline", async () => {
  const a = note("alice", "one", "2026-10-19T04:00:00Z");
  const b = note("bob", "two", "2026-10-19T05:00:00Z");
  const pages = { alice: [a], bob: [b] };
  const { provider, calls } = source(pages);
  const first = await readPublicTimeline({ origin, provider, identifiers: actors });
  assert.deepEqual(first.map(row => row.identifier), ["bob", "alice"]);
  assert.equal(first[0].content, "Body of two");
  pages.alice = [note("alice", "three", "2026-10-19T06:00:00Z"), a];
  const second = await readPublicTimeline({ origin, provider, identifiers: actors });
  assert.deepEqual(second.map(row => row.id), [
    actorId("alice") + "/posts/three", actorId("bob") + "/posts/two",
    actorId("alice") + "/posts/one",
  ]);
  assert.equal(calls.length, 8);
});

test("unaddressed private, foreign and forged actors are never projected", async () => {
  const privateNote = note("alice", "private", "2026-10-19T03:00:00Z", {
    to: [actorId("bob")], object: {
      id: actorId("alice") + "/posts/private", type: "Note", attributedTo: actorId("alice"),
      content: "DO NOT SHOW", published: "2026-10-19T03:00:00Z",
    },
  });
  const impersonation = note("alice", "other", "2026-10-19T04:00:00Z",
    { actor: actorId("bob") });
  const crossSite = note("alice", "external", "2026-10-19T05:00:00Z", {
    object: {
      id: "https://evil.example/actors/alice/posts/external",
      type: "Note", attributedTo: actorId("alice"),
      content: "foreign post", published: "2026-10-19T05:00:00Z",
    },
  });
  const { provider } = source({ alice: [privateNote, impersonation, crossSite], bob: [] });
  assert.deepEqual(await readPublicTimeline({ origin, provider, identifiers: actors }), []);
});

test("a wrong-origin outbox cursor is refused, never fetched", async () => {
  let count = 0;
  const provider = {
    origin,
    async fetch() {
      count += 1;
      return Response.json({
        type: "OrderedCollection", totalItems: 1,
        first: "https://untrusted.example/actors/alice/outbox?page=true",
      });
    },
  };
  await assert.rejects(
    readPublicTimeline({ origin, provider, identifiers: ["alice"] }),
    /foreign or noncanonical/,
  );
  assert.equal(count, 1);
});

test("missing original custody or malformed collections fail closed", async () => {
  const broken = { origin, fetch: async () => new Response(null, { status: 503 }) };
  await assert.rejects(readPublicTimeline({ origin, provider: broken, identifiers: ["alice"] }),
    /refused with status 503/);
  const invalid = {
    origin,
    fetch: async () => Response.json({ type: "OrderedCollection", totalItems: "one" }),
  };
  await assert.rejects(readPublicTimeline({ origin, provider: invalid, identifiers: ["alice"] }),
    /malformed public outbox collection/);
});

test("origin, actor provenance and bounded query requirements are mandatory", async () => {
  const { provider } = source({ alice: [] });
  await assert.rejects(readPublicTimeline({ origin: "http://public.example", provider, identifiers: ["alice"] }),
    /canonical HTTPS/);
  await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["alice", "alice"] }),
    /distinct source-owned/);
  await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["../bob"] }),
    /distinct source-owned/);
  await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["alice"], limit: 999 }),
    /limit must be between/);
});


test("native ActivityPub undated /notes IDs remain visible without a fictional clock", async () => {
  const originalActor = actorId("alice");
  const publishedElsewhere = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Create", id: origin + "/activities/alice-1",
    actor: originalActor, to: PUBLIC,
    object: {
      id: origin + "/notes/alice-1", type: "Note",
      attributedTo: originalActor, content: "Original provider post",
    },
  };
  const { provider } = source({ alice: [publishedElsewhere] });
  const rows = await readPublicTimeline({ origin, provider, identifiers: ["alice"] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, origin + "/notes/alice-1");
  assert.equal(rows[0].content, "Original provider post");
  assert.equal(rows[0].published, null);
});

test("ActivityStreams ordered collections with inline public items need no invented cursor", async () => {
  const original = note("alice", "one", "2026-10-19T05:00:00Z");
  const provider = {
    origin,
    fetch: async request => {
      assert.equal(new URL(request.url).search, "");
      return Response.json({
        type: "OrderedCollection", totalItems: 1, orderedItems: [original],
      });
    },
  };
  const rows = await readPublicTimeline({ origin, provider, identifiers: ["alice"] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, actorId("alice") + "/posts/one");
});


test("a retired original actor cannot deny every remaining actor's public timeline", async () => {
  const { provider, calls } = source({ alice: [note("alice", "one", "2026-10-19T05:00:00Z")], bob: [] });
  provider.resolveActor = async id => id === "alice" ? { identifier: id } : null;
  const posts = await readPublicTimeline({ origin, provider, identifiers: actors });
  assert.deepEqual(posts.map(row => row.identifier), ["alice"]);
  assert.equal(calls.length, 2);
});


test("one source-owned MOOSE reader serves both independent node and FeltOS consumer", async () => {
  const initial = note("alice", "one", "2026-10-19T05:00:00Z");
  const state = { alice: [initial], bob: [] };
  const { provider } = source(state);
  provider.identifiers = [...actors];
  provider.resolveActor = async identifier =>
    identifier === "alice" ? { identifier, actorName: "Alice", summary: "A live actor" } : null;
  const readers = createMoosePublicReaders({ origin, provider });
  assert.deepEqual(await readers.readPublicActor({ identifier: "alice" }), {
    identifier: "alice", name: "Alice", summary: "A live actor",
  });
  assert.equal(await readers.readPublicActor({ identifier: "bob" }), null);
  let current = await readers.readPublicTimeline({ maxItems: 64 });
  assert.equal(current.items.length, 1);
  assert.equal(current.items[0].visibility, "public");
  assert.match(current.items[0].summary, /Note: Body of one/);
  state.alice.unshift({
    ...note("alice", "one", "2026-10-19T06:00:00Z"),
    type: "Update",
    object: { ...initial.object, content: "Current version", updated: "2026-10-19T06:00:00Z" },
  });
  current = await readers.readPublicTimeline({ maxItems: 64 });
  assert.equal(current.items.length, 1, "Update replaces rather than doubles its object");
  assert.match(current.items[0].summary, /Current version/);
  state.alice.unshift({
    type: "Delete", actor: actorId("alice"), to: [PUBLIC],
    object: { type: "Tombstone", id: initial.object.id },
  });
  current = await readers.readPublicTimeline({ maxItems: 64 });
  assert.deepEqual(current.items, [], "deletion removes the current public object");
  assert.equal(current.hasMore, false);
});

test("Actor-scoped public outbox survives site-wide crowding and exposes bounded coverage", async () => {
  const alice = Array.from({ length: 70 }, (_, i) => note("alice", "entry-" + i,
    new Date(Date.UTC(2026, 9, 20, 0, i)).toISOString()));
  const bob = note("bob", "quiet", "2026-10-19T00:00:00Z");
  const { provider, calls } = source({ alice, bob: [bob] });
  provider.identifiers = ["alice", "bob"];
  provider.resolveActor = async identifier => ({
    identifier, actorName: identifier, summary: "A living source Actor",
  });
  const readers = createMoosePublicReaders({ origin, provider });
  const global = await readers.readPublicTimeline({ maxItems: 64 });
  assert.equal(global.items.length, 64);
  assert.equal(global.hasMore, true, "known truncation may never report an exhausted global feed");
  assert.equal(global.items.some(item => item.author === "bob"), false,
    "global truncation loses a quiet Actor's earlier source post");
  const quiet = await readers.readPublicActorTimeline({ identifier: "bob", maxItems: 64 });
  assert.equal(quiet.items.length, 1);
  assert.equal(quiet.items[0].author, "bob");
  assert.match(quiet.items[0].summary, /Body of quiet/);
  assert.equal(quiet.sourceOutbox, origin + "/actors/bob/outbox");
  assert.equal(quiet.coverage, "bounded-source-outbox");
  const busy = await readers.readPublicActorTimeline({ identifier: "alice", maxItems: 64 });
  assert.equal(busy.items.length, 64);
  assert.equal(busy.hasMore, true, "confirmed additional original public posts");
  assert.deepEqual(await readers.readPublicActorTimeline({ identifier: "unknown" }), null);
  assert.ok(calls.filter(url => url.includes("/actors/bob/outbox")).length >= 2,
    "the quiet Actor's own provider is read instead of redistributing another Actor's timeline");
});

test("original cursor-only and page=true first-page representations retain one bounded read", async () => {
  const outbox = actorId("alice") + "/outbox";
  const original = note("alice", "one", "2026-10-19T05:00:00Z");
  for (const query of ["?cursor=9007199254740991", "?page=true", "?page=true&cursor=9007199254740991"]) {
    for (const asObject of [false, true]) {
      const first = outbox + query;
      const calls = [];
      const provider = { origin, async fetch(request) {
        calls.push(request.url);
        if (request.url === outbox) return Response.json({
          type: "OrderedCollection", totalItems: 1,
          first: asObject ? { id: first } : first,
        });
        assert.equal(request.url, first, "follow the original URI without rewriting its cursor");
        return Response.json({ type: "OrderedCollectionPage", orderedItems: [original],
          next: outbox + "?cursor=1" });
      } };
      const rows = await readPublicTimeline({ origin, provider, identifiers: ["alice"] });
      assert.deepEqual(rows.map(row => row.id), [original.object.id]);
      assert.deepEqual(calls, [outbox, first], "do not traverse another page");
    }
  }
});

test("cursor-only admission preserves original source and query refusals before fetching a page", async () => {
  const outbox = actorId("alice") + "/outbox";
  const refused = [
    "https://foreign.example/actors/alice/outbox?cursor=1",
    actorId("bob") + "/outbox?cursor=1",
    outbox + "/other?cursor=1",
    "https://user:password@moose.example/actors/alice/outbox?cursor=1",
    outbox + "?cursor=1#fragment",
    outbox + "?cursor=1&private=true",
    outbox + "?page=false&cursor=1",
    outbox + "?page=&cursor=1",
    outbox,
    outbox + "?cursor=",
    outbox + "?cursor=1&cursor=2",
  ];
  for (const first of refused) {
    const calls = [];
    const provider = { origin, async fetch(request) {
      calls.push(request.url);
      return Response.json({ type: "OrderedCollection", totalItems: 1, first });
    } };
    await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["alice"] }),
      /foreign or noncanonical/, first);
    assert.deepEqual(calls, [outbox], "refuse before requesting the supplied page");
  }
});

test("cursor-only pages still require the original page shape and 100-item bound", async () => {
  const outbox = actorId("alice") + "/outbox";
  for (const [page, error] of [
    [{ type: "OrderedCollection", orderedItems: [] }, /malformed public outbox page/],
    [{ type: "OrderedCollectionPage", orderedItems: {} }, /malformed public outbox page/],
    [{ type: "OrderedCollectionPage", orderedItems: Array(101).fill(null) }, /exceeds a bounded page/],
  ]) {
    const calls = [];
    const provider = { origin, async fetch(request) {
      calls.push(request.url);
      return Response.json(request.url === outbox
        ? { type: "OrderedCollection", totalItems: 1, first: outbox + "?cursor=9007199254740991" }
        : page);
    } };
    await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["alice"] }), error);
    assert.deepEqual(calls, [outbox, outbox + "?cursor=9007199254740991"]);
  }
});
