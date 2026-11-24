import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { activity, note, PUBLIC } from "@red-cup-engineering/activitypub-engineering-services-section/as2";
import { createMooseEngine } from "@red-cup-engineering/moose";
import { commissionLocalMooseSite } from "@red-cup-engineering/moose/local-node";

test("a commissioned MOOSE node reads an edited note on page two after restart and retracts it on delete", async t => {
  const stateDirectory = await mkdtemp(join(tmpdir(), "moose-social-"));
  const origin = "https://world.example";
  const actor = origin + "/actors/river";
  const noteId = actor + "/notes/campfire";
  const actors = [{ identifier: "river", actorType: "Person", actorName: "River", summary: "World resident",
    keyPath: join(stateDirectory, "river.keys") }];
  const start = async environment => {
    const local = await commissionLocalMooseSite({ origin, stateDirectory, actors, environment, authorizePublicRead: () => true });
    return { ...local, engine: createMooseEngine({ sites: [local.site] }) };
  };
  let node;
  t.after(async () => {
    try { await node?.site.release(); } finally { await rm(stateDirectory, { recursive: true, force: true }); }
  });
  node = await start({});
  const token = (await readFile(node.actorBearerTokenPaths[0].bearerTokenPath, "utf8")).trim();
  const publish = (type, object, authorized = true) => node.engine.fetch(new Request(actor + "/outbox", {
    method: "POST", headers: { "content-type": "application/activity+json", ...(authorized ? { authorization: "Bearer " + token } : {}) },
    body: JSON.stringify(activity(type, { id: origin + "/activities/" + type.toLowerCase(), actor, to: [PUBLIC], object })),
  }));
  const readActivity = (type, authorized = false) => node.engine.fetch(new Request(origin + "/activities/" + type, {
    headers: { accept: "application/activity+json", ...(authorized ? { authorization: "Bearer " + token } : {}) },
  }));
  const readNote = () => node.engine.fetch(new Request(noteId, { headers: { accept: "application/activity+json" } }));
  const readHome = async () => {
    const response = await node.engine.fetch(new Request(origin + "/@river/", { headers: { accept: "text/html" } }));
    assert.equal(response.status, 200);
    return response.text();
  };
  const draft = note({ id: noteId, attributedTo: actor, content: "Old campfire story" });
  assert.equal((await publish("Create", draft, false)).status, 401);
  assert.ok((await publish("Create", draft)).ok);
  assert.match(await readHome(), /Old campfire story/);
  assert.equal((await readActivity("create")).status, 200);
  assert.ok((await publish("Update", { ...draft, content: "Revised campfire story" })).ok);
  await node.site.release();
  node = undefined;

  // Fill the provider's first journal page with public activities that do not produce posts.
  const seed = join(stateDirectory, "likes.json");
  const likes = Array.from({ length: 100 }, (_, index) =>
    activity("Like", { id: actor + "/likes/" + index, actor, to: [PUBLIC], object: noteId }));
  await writeFile(seed, JSON.stringify(likes));
  node = await start({ ACTIVITYPUB_OUTBOX_PATH: seed });
  const received = await readNote();
  assert.equal(received.status, 200);
  assert.equal((await received.json()).content, "Revised campfire story");
  assert.equal((await readActivity("create")).status, 404);
  const original = await readActivity("create", true);
  assert.equal(original.status, 200);
  assert.equal((await original.json()).object.content, "Old campfire story");
  assert.equal((await readActivity("update")).status, 200);
  const html = await readHome();
  assert.match(html, /Revised campfire story/);
  assert.ok(html.includes(noteId));
  assert.doesNotMatch(html, /Old campfire story/);
  assert.ok((await publish("Delete", noteId)).ok);
  assert.equal((await readNote()).status, 404);
  assert.equal((await readActivity("update")).status, 404);
  assert.doesNotMatch(await readHome(), /campfire story/);
});
