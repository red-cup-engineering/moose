import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commissionLocalMooseSite } from "../src/local-node.mjs";
import { createMooseEngine } from "../src/application.mjs";

test("real native Group actor and persistent authored public post cross MOOSE's living-web surface", async t => {
  const directory = await mkdtemp(join(tmpdir(), "moose-local-node-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const origin = "https://social.example";
  const options = {
    origin, stateDirectory: directory, environment: {},
    actors: [{
      identifier: "garden", actorName: "Gardeners", actorType: "Group",
      summary: "A real community", keyPath: join(directory, "garden-keys.json"),
    }],
    authorizePublicRead: async () => true,
  };
  const first = await commissionLocalMooseSite(options);
  const engine = createMooseEngine({ sites: [first.site] });
  const get = (path, accept) => engine.fetch(new Request(origin + path, { headers: { accept } }));
  const actor = await get("/actors/garden", "application/activity+json");
  assert.equal(actor.status, 200);
  const face = await actor.json();
  assert.equal(face.type, "Group");
  assert.equal(face.id, origin + "/actors/garden");
  const initial = await get("/", "text/html");
  assert.equal(initial.status, 200);
  assert.match(await initial.text(), /Federated social world/);
  const token = (await readFile(first.bearerTokenPath, "utf8")).trim();
  const activity = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: origin + "/activities/one", type: "Create",
    actor: origin + "/actors/garden",
    to: "https://www.w3.org/ns/activitystreams#Public",
    object: { id: origin + "/actors/garden/notes/one", type: "Note", content: "Public first post", attributedTo: origin + "/actors/garden" },
  };
  const published = await engine.fetch(new Request(origin + "/actors/garden/outbox", {
    method: "POST", headers: { "content-type": "application/activity+json", authorization: "Bearer " + token },
    body: JSON.stringify(activity),
  }));
  assert.equal(published.status, 201, "the original provider retains the published Activity");
  const nativeNote = await get("/actors/garden/notes/one", "application/activity+json");
  assert.equal(nativeNote.status, 200, "the original Fedify provider serves its Note object URI");
  assert.equal((await nativeNote.json()).content, "Public first post");
  const living = await get("/", "text/html");
  assert.equal(living.status, 200);
  assert.match(await living.text(), /Public first post/, "same custody, not a second feed database");
  const revision = { ...activity, id: origin + "/activities/two", type: "Update",
    object: { ...activity.object, content: "Revised public post" } };
  const edited = await engine.fetch(new Request(origin + "/actors/garden/outbox", {
    method: "POST", headers: { "content-type": "application/activity+json", authorization: "Bearer " + token },
    body: JSON.stringify(revision),
  }));
  assert.equal(edited.status, 201);
  const current = await get("/actors/garden/notes/one", "application/activity+json");
  assert.equal(current.status, 200);
  assert.equal((await current.json()).content, "Revised public post");
  const human = await get("/", "text/html");
  assert.match(await human.text(), /Revised public post/, "MOOSE projects the latest object, not both versions");
  assert.equal((await get("/actors/stranger", "application/activity+json")).status, 404);
  assert.equal((await engine.fetch(new Request(origin + "/actors/garden/inbox", {
    method: "POST", headers: { "content-type": "application/activity+json" },
    body: JSON.stringify(activity),
  }))).status, 401);
  const oldKey = await readFile(join(directory, "garden-keys.json"));
  await first.site.release();
  const restarted = await commissionLocalMooseSite(options);
  t.after(() => restarted.site.release());
  assert.deepEqual(await readFile(join(directory, "garden-keys.json")), oldKey);
  const after = createMooseEngine({ sites: [restarted.site] });
  const durable = await after.fetch(new Request(origin + "/", { headers: { accept: "text/html" } }));
  assert.match(await durable.text(), /Revised public post/, "restart reads original latest object");
  const removed = await after.fetch(new Request(origin + "/actors/garden/outbox", {
    method: "POST", headers: { "content-type": "application/activity+json", authorization: "Bearer " + token },
    body: JSON.stringify({ ...activity, id: origin + "/activities/three", type: "Delete",
      object: { id: activity.object.id, type: "Tombstone" } }),
  }));
  assert.equal(removed.status, 201);
  const deleted = await after.fetch(new Request(activity.object.id, {
    headers: { accept: "application/activity+json" },
  }));
  assert.notEqual(deleted.status, 200, "a deletion is not a readable stale Note");
  const livingAfterDelete = await after.fetch(new Request(origin + "/", {
    headers: { accept: "text/html" },
  }));
  assert.doesNotMatch(await livingAfterDelete.text(), /Revised public post|Public first post/,
    "the same source removes deleted content from MOOSE's human timeline");
});

test("MOOSE commissions neither an unsigned actor nor a no-op inbox", async t => {
  const directory = await mkdtemp(join(tmpdir(), "moose-refusals-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(commissionLocalMooseSite({
    origin: "https://social.example", stateDirectory: directory, environment: {},
  }), /public-read authority/);
});
