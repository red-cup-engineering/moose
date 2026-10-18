#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { commissionLocalMooseSite } from "../src/local-node.mjs";
import { serveMooseSites } from "../src/application.mjs";

await runMain(async ({ stdout }) => {
  const required = key => {
    const value = process.env[key];
    if (typeof value !== "string" || !value.trim()) throw new TypeError(`${key} is required`);
    return value;
  };
  const origin = required("MOOSE_ORIGIN");
  const stateDirectory = required("MOOSE_STATE_DIR");
  const { site, bearerTokenPath } = await commissionLocalMooseSite({
    origin, stateDirectory, environment: process.env,
    // The already-authored public audience flag is selected by Fedify on
    // every outbox read. This grant does not open the private inbox.
    authorizePublicRead: async () => true,
  });
  let running;
  try {
    running = await serveMooseSites({
      sites: [site], hostname: "127.0.0.1",
      port: Number(process.env.MOOSE_PORT ?? "8000"),
      trustProxy: process.env.MOOSE_TRUST_PROXY === "true",
    });
  } catch (error) {
    await site.release();
    throw error;
  }
  let closing;
  const stop = () => closing ??= running.close().then(() => {
    process.exitCode = 0;
  }, error => {
    process.stderr.write(`MOOSE shutdown failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void stop(); });
  stdout.write(JSON.stringify({
    node: origin, actor: new URL(`/actors/${site.provider.identifier}`, origin).href,
    human: origin, bearerTokenPath, queueOwnership: "managed Fedify",
  }) + "\n");
}, { moduleUrl: import.meta.url, exitCode: 1 });
