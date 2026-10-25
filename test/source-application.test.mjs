import test from "node:test";
import assert from "node:assert/strict";
import { createMooseApplication } from "../src/fetch.mjs";

const origin = "https://source.example";
const request = (path = "/", accept = "application/json") => new Request(origin + path, { headers: { accept } });

test("a downstream application reads current source through the same MOOSE/TUFTE boundary", async () => {
  let current = "first source";
  const app = createMooseApplication({ origin, authorizePublicRead: async () => true,
    home: () => ({ title: current, tiles: [] }),
    pages: [{ match: "/api/source", name: "source", read: () => Response.json({ current }) }],
  });
  assert.equal((await (await app.fetch(request())).json()).title, "first source");
  current = "changed source";
  assert.equal((await (await app.fetch(request())).json()).title, current);
  assert.deepEqual(await (await app.fetch(request("/api/source"))).json(), { current });
  assert.equal((await app.fetch(new Request("https://foreign.example/"))).status, 421);
});

test("the host's public-read decision runs before the source reader, including JSON", async () => {
  let reads = 0;
  const seen = [];
  const app = createMooseApplication({ origin,
    authorizePublicRead: async ({ resource }) => { seen.push(resource); return false; },
    home: () => { reads++; return { title: "PRIVATE", tiles: [] }; },
    pages: [{ match: "/api/source", name: "source", read: () => { reads++; return Response.json({ private: true }); } }],
  });
  assert.equal((await app.fetch(request())).status, 404);
  assert.equal((await app.fetch(request("/api/source"))).status, 404);
  assert.equal(reads, 0);
  assert.deepEqual(seen, ["home", "source"]);
});

test("source declarations cannot silently shadow an admitted home or exact route", () => {
  const page = { match: "/source", name: "source", read: () => null };
  const options = { origin, authorizePublicRead: async () => true };
  assert.throws(() => createMooseApplication({ ...options, home: () => null,
    pages: [{ ...page, match: "/" }] }), /shadow/);
  assert.throws(() => createMooseApplication({ ...options, pages: [page, page] }), /shadow/);
  assert.throws(() => createMooseApplication({ ...options, pages: [{ ...page, read: undefined }] }), /readers/);
});
