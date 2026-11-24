import assert from "node:assert/strict";
import test from "node:test";
import { createMoosePublicReaders } from "../src/timeline.mjs";

test("a retired actor is skipped and a foreign page refuses the timeline", async () => {
  const origin = "https://world.example";
  const outbox = origin + "/actors/river/outbox";
  const requests = [];
  const provider = {
    origin, identifiers: ["retired", "river"],

    fetch(request) {
      if (request.url.endsWith("/actors/retired")) return new Response(null, { status: 410 });
      if (request.url.endsWith("/actors/river"))
        return Response.json({ type: "Person", id: request.url, outbox, name: "River", summary: "Resident" });
      requests.push(request.url);
      return Response.json(request.url === outbox
        ? { type: "OrderedCollection", first: outbox + "?page=true" }
        : { type: "OrderedCollectionPage", orderedItems: [], next: origin + "/actors/retired/outbox?page=true" });
    },
  };
  const readers = createMoosePublicReaders({ origin, provider });
  assert.equal(await readers.readPublicProfile({ identifier: "retired" }), null);
  await assert.rejects(readers.readPublicTimeline(), /cursor/);
  assert.deepEqual(requests, [outbox, outbox + "?page=true"]);
});
