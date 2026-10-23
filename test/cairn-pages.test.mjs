import assert from "node:assert/strict";
import test from "node:test";
import { createMooseCairnPage } from "../src/cairn-pages.mjs";

test("MOOSE delegates a TUFTE source page reading to original CAIRN FARS", async () => {
  const seen = [];
  const cairn = {
    kind: "cairn.fars/v1",
    readSigncraft: async input => {
      seen.push(input);
      return { source: "signcraft", title: "A received observation" };
    },
  };
  const page = createMooseCairnPage({
    match: "/social/research",
    cairn, principal: "public-source-reader",
    documentOptions: { order: ["chapter-1"] },
    projectDocument: document => ({
      title: document.title,
      tiles: [{ id: "source", title: "Source", content: document.source }],
    }),
  });
  assert.equal(page.match, "/social/research");
  assert.equal(page.name, "cairn-signcraft-document");
  const result = await page.read({ request: new Request("https://social.example/social/research") });
  assert.equal(result.title, "A received observation");
  assert.deepEqual(seen, [{ principal: "public-source-reader", options: { order: ["chapter-1"] } }]);
});

test("MOOSE refuses fake CAIRN readers, caller-supplied routes and invalid projections", async () => {
  const cairn = { kind: "cairn.fars/v1", readSigncraft: async () => ({}) };
  const ok = { cairn, principal: "host-selected", projectDocument: () => ({ title: "Known", tiles: [] }) };
  for (const match of ["/actors/alice", "/social/people/alice", "/social", "/x//y", "/x/../y", "/"]) {
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
