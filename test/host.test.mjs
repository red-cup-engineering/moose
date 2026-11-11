import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import test from "node:test";
import { serveLivingWebHost } from "@red-cup-engineering/living-web-server/host";
import { createMooseEngine, serveMooseSites } from "../src/host.mjs";

function siteAt(origin, events = []) {
  const site = {
    origin,
    provider: {
      origin, identifier: "garden", identifiers: ["garden"],
      actorTypes: ["Group", "Person", "Service"],
      routeCapabilities: { dynamicActors: true, publicObjects: true },
      queueStartup: "manual",
      federation: {
        startQueue(_context, { signal }) {
          events.push([origin, "worker-start"]);
          return new Promise(resolve => {
            const stop = () => { events.push([origin, "worker-stop"]); resolve(); };
            if (signal.aborted) stop();
            else signal.addEventListener("abort", stop, { once: true });
          });
        },
      },
      async fetch(request) {
        const pathname = new URL(request.url).pathname;
        events.push([origin, "federation", pathname]);
        return pathname === "/actors/garden"
          ? Response.json({ type: "Group", id: origin + pathname })
          : new Response(null, { status: 404 });
      },
    },
    website: {
      origin,
      async fetch(request) {
        events.push([origin, "website", new URL(request.url).pathname]);
        return Response.json({ origin, title: "Living source" });
      },
    },
    kv: { get: async () => undefined },
    queue: { enqueue: async () => {}, listen: async () => {} },
    release: async () => { events.push([origin, "release"]); },
  };
  return site;
}

function requestListener(server, host, path = "/") {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1", port: server.address().port,
      path, headers: { host, connection: "close" },
    }, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body }));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.end();
  });
}

test("Living Web hosts MOOSE origins while original providers retain protocol routes", async () => {
  const events = [];
  const west = "https://west.example", east = "https://east.example";
  const engine = createMooseEngine({ sites: [siteAt(west, events), siteAt(east, events)] });
  assert.deepEqual(engine.origins, [west, east]);
  assert.ok(Object.isFrozen(engine) && Object.isFrozen(engine.origins));
  for (const origin of [west, east]) {
    const page = await engine.fetch(new Request(origin + "/"));
    assert.deepEqual(await page.json(), { origin, title: "Living source" });
    const actor = await engine.fetch(new Request(origin + "/actors/garden", {
      headers: { accept: "application/activity+json" },
    }));
    assert.deepEqual(await actor.json(), { type: "Group", id: origin + "/actors/garden" });
    for (const path of ["/actors/unknown", "/actors/garden/inbox", "/actors/garden/outbox",
      "/.well-known/webfinger?resource=acct:garden@" + new URL(origin).host]) {
      assert.equal((await engine.fetch(new Request(origin + path))).status, 404);
    }
  }
  assert.equal(events.filter(([, kind]) => kind === "website").length, 2,
    "a website catch-all cannot answer federation routes or unknown actors");
  const before = events.length;
  const unknown = await engine.fetch(new Request("https://unknown.example/"));
  assert.equal(unknown.status, 421);
  assert.equal(unknown.headers.get("cache-control"), "no-store");
  assert.equal(events.length, before, "unregistered origins cannot call either site's reader");
});

test("MOOSE refuses ambiguous or foreign site identities before hosting effects", () => {
  const events = [];
  const origin = "https://social.example";
  const site = siteAt(origin, events);
  assert.throws(() => createMooseEngine(), /one or more original sites/u);
  assert.throws(() => createMooseEngine({ sites: [] }), /one or more original sites/u);
  assert.throws(() => createMooseEngine({ sites: [site, site] }), /Duplicate/u);
  assert.throws(() => createMooseEngine({ sites: [{
    ...site, provider: { ...site.provider, origin: "https://foreign.example" },
  }] }), /origin/u);
  assert.deepEqual(events, [], "admitting a host does not start workers or read source");
});

test("the MOOSE engine is an original Living Web host accepted by its listener", async t => {
  const host = createMooseEngine({ sites: [siteAt("http://localhost")] });
  const running = await serveLivingWebHost(host, { port: 0 });
  t.after(() => running.close());
  const response = await requestListener(running.server, "localhost");
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.body).origin, "http://localhost");
  assert.equal((await requestListener(running.server, "foreign.example")).status, 421);
});

test("managed MOOSE starts the Living Web listener and releases custody after its workers stop", async t => {
  const events = [];
  const origin = "http://localhost";
  const running = await serveMooseSites({ sites: [siteAt(origin, events)], port: 0 });
  t.after(() => running.close());
  assert.deepEqual(running.siteOrigins, [origin]);
  assert.equal((await requestListener(running.server, "localhost")).status, 200);
  const actor = await requestListener(running.server, "localhost", "/actors/garden");
  assert.equal(JSON.parse(actor.body).id, origin + "/actors/garden");
  assert.equal((await requestListener(running.server, "unknown.example")).status, 421);
  assert.equal(events.filter(([, kind]) => kind === "worker-start").length, 1);
  const closing = running.close();
  assert.equal(running.close(), closing, "shutdown keeps the original single close promise");
  await closing;
  assert.equal(running.server.listening, false);
  const order = events.map(([, kind]) => kind);
  assert.equal(order.filter(kind => kind === "worker-stop").length, 1);
  assert.equal(order.filter(kind => kind === "release").length, 1);
  assert.ok(order.indexOf("worker-stop") < order.indexOf("release"));
});

test("managed close retains site custody until the real listener finishes an active response", { timeout: 10_000 }, async t => {
  const events = [];
  const site = siteAt("http://localhost", events);
  let body;
  site.website.fetch = () => new Response(new ReadableStream({
    start(controller) {
      body = controller;
      controller.enqueue(new TextEncoder().encode("active response"));
    },
  }));
  const running = await serveMooseSites({ sites: [site], port: 0 });
  const started = Promise.withResolvers();
  let request;
  const finished = new Promise((resolve, reject) => {
    request = httpRequest({
      hostname: "127.0.0.1", port: running.server.address().port,
      headers: { host: "localhost", connection: "close" },
    }, response => {
      response.on("data", () => started.resolve());
      response.on("end", resolve);
      response.on("error", reject);
    });
    request.on("error", reject);
    request.end();
  });
  t.after(async () => {
    try { body?.close(); } catch { /* The test may already have ended the stream. */ }
    request?.destroy();
    await running.close();
  });
  await started.promise;
  let closed = false;
  const closing = running.close().then(() => { closed = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, false, "close must await the original active HTTP response");
  assert.equal(events.some(([, kind]) => kind === "release"), false,
    "the listening capability cannot release site custody while a response remains active");
  body.close();
  await finished;
  await closing;
  assert.equal(events.filter(([, kind]) => kind === "release").length, 1);
});

test("hosting policy is refused before listener or delivery startup", async () => {
  const events = [];
  await assert.rejects(serveMooseSites({
    sites: [siteAt("https://social.example", events)], port: 0,
  }), /trusted TLS/u);
  assert.deepEqual(events, [], "an unadmitted site's custody remains with its caller");
  await assert.rejects(serveMooseSites({
    sites: [siteAt("https://social.example", events)],
    hostname: "0.0.0.0", port: 0, trustProxy: true,
  }), /loopback/u);
  assert.deepEqual(events.map(([, kind]) => kind), ["release"],
    "after managed admission, a refused listener releases custody without starting workers");
});

test("the established injected listener retains managed startup failure cleanup", async () => {
  const events = [];
  const origin = "http://localhost";
  const failure = new Error("listener unavailable");
  await assert.rejects(serveMooseSites({
    sites: [siteAt(origin, events)], port: 0,
    serve: async options => {
      assert.equal(options.sites[0].origin, origin);
      assert.equal(options.port, 0);
      events.push([origin, "listener-start"]);
      throw failure;
    },
  }), error => error === failure);
  assert.deepEqual(events.map(([, kind]) => kind), ["listener-start", "release"]);
});
