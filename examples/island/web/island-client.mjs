// The island demo's client: fetch alice's perception frame and the island's description, project the
// fiber once, and draw it with the 3D tier, the text tier beside it as the supplement.

import { createAssetResolver, wellKnownFetch } from "@red-cup-engineering/qwzspace/scene";
import { environmentAt } from "../../../src/game-content/environment.mjs";
import { projectFiber } from "../../../src/world/fiber.mjs";
import { sceneProviders } from "../../../src/world/scene-providers.mjs";
import { createViewport } from "@red-cup-engineering/qwzspace/viewport";
import { createBackend as createTextBackend } from "../../../src/world/render-text.mjs";

const query = new URLSearchParams(location.search);
const time = Number(query.get("time") ?? 9);
const status = { ready: false, graphics: null, terrain: false, state: "loading", loss: null, lines: [], error: null };
globalThis.island = status;
const panel = document.getElementById("text");

try {
  const [frame, world] = await Promise.all([
    fetch(`/frame.json?${new URLSearchParams({ time: String(time), ...(query.get("weather") ? { weather: query.get("weather") } : {}) })}`).then((r) => r.json()),
    fetch("/world.json").then((r) => r.json()),
  ]);
  const scene = projectFiber(frame, world);
  const assets = createAssetResolver({ fetchBytes: wellKnownFetch(location.origin) });
  // The ladder's 3D rungs, richest first: WebGPU, else WebGL2 (`webgl=1` asks for WebGL2 outright).
  const canvas = document.getElementById("view");
  const view = createViewport(canvas, { renderer: query.get("webgl") === "1" ? "webgl2" : "webgl", assets, ...sceneProviders });
  await view.ready;
  const observe = () => {
    status.state = view.state;
    status.graphics = view.graphics;
    status.terrain = view.terrain;
    status.loss = view.loss;
    status.ready = view.state === "ready" && (view.tier !== "webgl" || view.terrain);
  };
  view.onChange(observe);
  const text = createTextBackend({
    write(lines) {
      status.lines = lines;
      panel.replaceChildren(...lines.map((line) => Object.assign(document.createElement("p"), { textContent: line })));
    },
  });
  text.render(scene);
  if (query.get("view") === "overview") {
    // The demo's original position (900, -1700, 420), heading -28 degrees and pitch -16
    // degrees, expressed through the shared camera aim. Device selection and recovery stay upstream.
    const distance = 1000, orbit = -28 * Math.PI / 180, lift = Math.tan(16 * Math.PI / 180) * distance;
    view.setCamera({ target: [900 + Math.sin(orbit) * distance, -1700 + Math.cos(orbit) * distance, 420 - lift], distance, orbit, lift, size: 2500, base: distance });
  }

  observe();
  await assets.resolve(world.terrain.address);
  const started = performance.now();
  const draw = () => {
    // Animating runs the sky and the tide on between frames; the fiber itself is the one sent.
    const now = query.get("animate") === "1" ? time + (performance.now() - started) / 1000 : time;
    view.render(now === time ? scene : { ...scene, environment: environmentAt({ ...frame.clock, time: now }, world) });
    observe();
    requestAnimationFrame(draw);
  };
  draw();
} catch (error) {
  const message = "The island could not be displayed.";
  status.lines = [message];
  panel.replaceChildren(Object.assign(document.createElement("p"), { textContent: message }));
  status.error = String(error?.stack ?? error);
  throw error;
}
