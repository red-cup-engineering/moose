import assert from "node:assert/strict";
import test from "node:test";
import { KnowledgeBase } from "@red-cup-engineering/signcraft/knowledge-base";
import { composeCairnFars } from "@red-cup-engineering/knowledge-system-server/fars";
import { createMooseCairnPage } from "../src/cairn-pages.mjs";

test("MOOSE delegates a TUFTE source page reading to original CAIRN FARS", async () => {
  const seen = [];
  const signcraft = new KnowledgeBase().articulate("observation", "received", "source");
  const documentOptions = { order: [], references: [] };
  const cairn = composeCairnFars({
    signcraft,
    authorizeRead: async input => {
      seen.push(input);
      return input.principal === "public-source-reader";
    },
  });
  const page = createMooseCairnPage({
    match: "/social/research",
    cairn, principal: "public-source-reader",
    documentOptions,
    projectDocument: document => ({
      title: "A received observation",
      tiles: [{ id: "source", title: "Source", content: document.id }],
    }),
  });
  assert.equal(page.match, "/social/research");
  assert.equal(page.name, "cairn-signcraft-document");
  const result = await page.read({ request: new Request("https://social.example/social/research") });
  assert.equal(result.title, "A received observation");
  assert.equal(result.tiles[0].content, signcraft.document(documentOptions).id);
  assert.deepEqual(seen, [{ principal: "public-source-reader", resource: "signcraft",
    operation: "document", options: documentOptions }]);
});

test("MOOSE refuses missing CAIRN ports, caller-supplied routes and invalid projections", async () => {
  const cairn = { kind: "cairn.fars/v1", readSigncraft: async () => ({}) };
  const ok = { cairn, principal: "host-selected", projectDocument: () => ({ title: "Known", tiles: [] }) };
  for (const match of ["/actors", "/actors/alice", "/people", "/people/alice", "/inbox", "/inbox/private",
    "/outbox", "/outbox/actor", "/social/people", "/social/people/alice", "/social/actors",
    "/social/actors/alice", "/social/inbox", "/social/outbox", "/social", "/x//y", "/x/../y", "/"]) {
    assert.throws(() => createMooseCairnPage({ ...ok, match }), /exact non-protocol route/);
  }
  assert.throws(() => createMooseCairnPage({ ...ok, match: "/reading", cairn: { readSigncraft() {} } }), /original CAIRN/);
  assert.throws(() => createMooseCairnPage({ ...ok, match: "/reading", principal: "" }), /selected by the host/);
  const bad = createMooseCairnPage({
    ...ok, match: "/social/research",
    projectDocument: () => ({ title: "Too big", tiles: new Array(65).fill({}) }),
  });
  await assert.rejects(bad.read({}), /bounded TUFTE page/);
});

test("CAIRN denial is not replaced by a silent MOOSE local semantic fallback", async () => {
  let projected = false;
  const page = createMooseCairnPage({
    match: "/social/knowledge",
    principal: "host-selected", cairn: {
      kind: "cairn.fars/v1",
      readSigncraft: async () => { throw new Error("original source refused"); },
    },
    projectDocument: () => { projected = true; return { title: "Invented", tiles: [] }; },
  });
  await assert.rejects(page.read({}), /original source refused/);
  assert.equal(projected, false);
});

test("one enormous TUFTE tile refuses even when the tile count is small", async () => {
  const page = createMooseCairnPage({
    match: "/research", principal: "public", cairn: {
      kind: "cairn.fars/v1", readSigncraft: async () => ({ source: "approved" }),
    },
    projectDocument: () => ({ title: "Oversized", tiles: [{ content: "🌱".repeat(40000) }] }),
  });
  await assert.rejects(page.read({}), /128 KiB source page budget/);
});

test("bounded UTF-8 page, invalid projection and circular output receive different outcomes", async () => {
  const base = { match: "/research", principal: "public", cairn: {
    kind: "cairn.fars/v1", readSigncraft: async () => ({}),
  } };
  const within = createMooseCairnPage({ ...base,
    projectDocument: () => ({ title: "Research", tiles: [{ content: "🌱".repeat(32000) }] }),
  });
  assert.equal((await within.read({})).tiles.length, 1);
  const circular = { title: "Cyclic", tiles: [] };
  circular.me = circular;
  const bad = createMooseCairnPage({ ...base, projectDocument: () => circular });
  await assert.rejects(bad.read({}), /serializable and bounded/);
});


test("MOOSE returns only the byte-qualified JSON snapshot, never mutable hidden TUFTE tiles", async () => {
  const original = {
    title: "Qualified",
    tiles: [{ content: "unbounded".repeat(25000) }],
    toJSON() { return { title: "Qualified", tiles: [{ content: "bounded" }] }; },
  };
  const base = {
    match: "/social/research", principal: "public-reader",
    cairn: { kind: "cairn.fars/v1", readSigncraft: async () => ({}) },
  };
  const result = await createMooseCairnPage({
    ...base, projectDocument: () => original,
  }).read({});
  assert.deepEqual(result, { title: "Qualified", tiles: [{ content: "bounded" }] });
  original.tiles[0].content = "later mutation";
  assert.equal(result.tiles[0].content, "bounded", "the original projector cannot change a measured page after admission");

  const disguised = createMooseCairnPage({
    ...base, projectDocument: () => ({
      title: "Surface", tiles: [],
      toJSON: () => ({ title: "Surface", hidden: "tiles were removed" }),
    }),
  });
  await assert.rejects(disguised.read({}), /serialized projection must retain/);
});
