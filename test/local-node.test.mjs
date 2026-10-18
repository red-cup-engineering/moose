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
    object: { id: origin + "/notes/one", type: "Note", content: "Public first post", attributedTo: origin + "/actors/garden" },
  };
  const published = await engine.fetch(new Request(origin + "/actors/garden/outbox", {
    method: "POST", headers: { "content-type": "application/activity+json", authorization: "Bearer " + token },
    body: JSON.stringify(activity),
  }));
  assert.equal(published.status, 201, "the original provider retains the published Activity");
  const living = await get("/", "text/html");
  assert.equal(living.status, 200);
  assert.match(await living.text(), /Public first post/, "same custody, not a second feed database");
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
  assert.match(await durable.text(), /Public first post/, "restart reads original durable actor outbox");
});

test("MOOSE commissions neither an unsigned actor nor a no-op inbox", async t => {
  const directory = await mkdtemp(join(tmpdir(), "moose-refusals-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(commissionLocalMooseSite({
    origin: "https://social.example", stateDirectory: directory, environment: {},
  }), /public-read authority/);
});
