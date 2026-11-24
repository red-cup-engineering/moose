import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-engineering-services-section/local-server";
import { createMooseSite } from "./fetch.mjs";

/**
 * Commission one real source-owned local MOOSE node. Keys, Fedify protocol KV,
 * followers, immutable outbox, verified inbox and queue are all the original
 * Networking provider's storage. No MOOSE-specific account or journal.
 */
export async function commissionLocalMooseSite({
  origin, stateDirectory, environment = {}, actors,
  onActivity, authorizePublicRead,
} = {}) {
  if (typeof origin !== "string" || typeof stateDirectory !== "string" ||
      !stateDirectory.startsWith("/") || !environment || typeof environment !== "object") {
    throw new TypeError("MOOSE commissioning requires its actual origin and absolute private state directory");
  }
  if (typeof authorizePublicRead !== "function") {
    throw new TypeError("MOOSE commissioning requires an original public-read authority");
  }
  if (onActivity !== undefined && typeof onActivity !== "function") {
    throw new TypeError("MOOSE onActivity must be an explicit receiver");
  }
  const configured = { ...environment, ACTIVITYPUB_ORIGIN: origin };
  const local = await createLocalActivityPubProvider({
    environment: configured, stateDirectory, origin,
    ...(actors === undefined ? {} : { actors }),
    manuallyStartQueue: true,
    // Fedify calls the customer only AFTER signed arrival verification.
    // Follow/Undo use the original provider's signed social machinery.
    onActivity: onActivity ?? (async arrival => {
      // Fedify has already checked sender proofs and retained the arrival.
      // Accept/Reject are social responses to our outbound Follow, not
      // enterprise decisions, invitations to spend, or capability grants.
      if (["Follow", "Undo", "Accept", "Reject"].includes(arrival.jsonLd?.type)) return;
      throw new TypeError("MOOSE has no commissioned workflow for this inbound activity");
    }),
  });
  try {
    if (local.provider.queueStartup !== "manual" ||
        !local.provider.actorTypes?.includes("Group")) {
      throw new TypeError("MOOSE requires a Group-capable Fedify provider with one manually owned queue");
    }
    const site = createMooseSite({
      origin, provider: local.provider,
      kv: local.kv, queue: local.queue, release: local.close,
      custodyRoot: local.custodyRoot,
      authorizePublicRead,
    });
    return Object.freeze({
      site,
      // An independently provisioned multi-actor MOOSE node has separate
      // persisted bearer credentials. Expose their existing *paths*, never
      // invent a site-wide token or reveal credential contents.
      ...(local.bearerTokenPath === undefined ? {} : { bearerTokenPath: local.bearerTokenPath }),
      ...(local.actorBearerTokenPaths === undefined ? {} : { actorBearerTokenPaths: local.actorBearerTokenPaths }),
    });
  } catch (error) {
    await local.close();
    throw error;
  }
}
