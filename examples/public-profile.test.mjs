import assert from "node:assert/strict";
import test from "node:test";
import { createMooseSite } from "@red-cup-engineering/moose/fetch";
import { createMoosePublicReaders } from "@red-cup-engineering/moose/public-readers";

test("the actor homepage displays a public post from the next outbox page", async () => {
  const origin = "https://world.example";
  const actor = origin + "/actors/river";
  const outbox = actor + "/published";
  const post = slug => ({ type: "Create", actor, to: "as:Public",
    object: { id: actor + "/notes/" + slug, type: "Note", attributedTo: actor, content: slug } });
  const pages = {
    [actor]: { type: "Person", id: actor, outbox, name: "River", summary: "World resident" },
    [outbox]: { type: "OrderedCollection", first: outbox + "?cursor=first" },
    [outbox + "?cursor=first"]: { type: "OrderedCollectionPage", next: outbox + "?cursor=older",
      orderedItems: [{ type: "Delete", actor, object: actor + "/notes/withdrawn" }] },
    [outbox + "?cursor=older"]: { type: "OrderedCollectionPage", orderedItems: [post("withdrawn"), post("campfire-story")] },
  };
  const provider = { origin, identifiers: ["river"], actorTypes: ["Group"],
    fetch: request => Response.json(pages[request.url]),
  };
  const readers = createMoosePublicReaders({ origin, provider });
  const site = createMooseSite({ origin, provider, authorizePublicRead: () => true });
  for (const path of ["/@river/", "/"]) {
    const response = await site.website.fetch(new Request(origin + path, { headers: { accept: "text/html" } }));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /campfire-story/);
    assert.doesNotMatch(html, /withdrawn/);
    if (path === "/@river/") assert.ok(html.includes(outbox));
  }
  const profile = await readers.readPublicProfile({ identifier: "river", maxItems: 1 });
  assert.equal(profile.outbox, outbox);
  assert.deepEqual(profile.timeline, {
    items: [{ id: actor + "/notes/campfire-story", author: "river", visibility: "public", summary: "Note: campfire-story" }],
    hasMore: false, coverage: "bounded-source-outbox",
  });
});
