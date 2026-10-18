import { createFlatfileActivityPubRuntime } from "@red-cup-engineering/activitypub-services-section/flatfile-runtime";
import { createActivityPubJournalCustody } from "@red-cup-engineering/activitypub-services-section/journal-custody";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { createMooseSite } from "./application.mjs";

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
  const runtime = createFlatfileActivityPubRuntime({ environment: configured, stateDirectory });
  const custody = createActivityPubJournalCustody({ stateDirectory: runtime.stateDirectory });
  let local;
  try {
    local = await createLocalActivityPubProvider({
      environment: configured, runtime, custody, origin,
      ...(actors === undefined ? {} : { actors }),
      manuallyStartQueue: true,
      // Fedify calls the customer only AFTER signed arrival verification.
      // Follow/Undo use the original provider's signed social machinery.
      onActivity: onActivity ?? (async arrival => {
        if (arrival.jsonLd?.type === "Follow" || arrival.jsonLd?.type === "Undo") return;
        throw new TypeError("MOOSE has no commissioned workflow for this inbound activity");
      }),
    });
    if (local.provider.queueStartup !== "manual" ||
        !local.provider.actorTypes?.includes("Group")) {
      throw new TypeError("MOOSE requires a Group-capable Fedify provider with one manually owned queue");
    }
    const readPublicActor = async ({ identifier }) => {
      const person = await local.provider.resolveActor(identifier);
      return person === null ? null : {
        identifier, name: person.actorName, summary: person.summary,
      };
    };
    const readPublicTimeline = async ({ maxItems = 64 } = {}) => {
      if (!Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > 64) {
        throw new TypeError("MOOSE source read must be bounded to 1..64 activities");
      }
      const rows = [];
      let hasMore = false;
      for (const identifier of local.provider.identifiers) {
        const outbox = new URL(`/actors/${encodeURIComponent(identifier)}/outbox?page=true`, origin);
        // Invoke the original PUBLIC Fedify representation, not the private
        // immutable custody directly: its projection strips blind recipients.
        const response = await local.provider.fetch(new Request(outbox, {
          headers: { accept: "application/activity+json" },
        }));
        if (response.status !== 200) throw new TypeError("MOOSE original public outbox is unavailable");
        const page = await response.json();
        const activities = page.orderedItems ?? page.items;
        if (!Array.isArray(activities)) throw new TypeError("MOOSE expected the original public activity page");
        hasMore ||= Boolean(page.next);
        for (const activity of activities) {
          if (activity === null || typeof activity !== "object" || typeof activity.id !== "string") {
            throw new TypeError("MOOSE cannot read an activity without its original identity");
          }
          const object = activity.object;
          const summary = typeof object?.content === "string" ? object.content :
            typeof object === "string" ? object :
            typeof object?.id === "string" ? object.id : activity.type;
          rows.push({
            id: activity.id, author: identifier,
            // A live public ActivityStreams EVENT, not a claim that an old
            // Create has survived later Delete/Update or moderation policy.
            summary: `${activity.type}: ${summary.slice(0, 4070)}`,
            visibility: "public",
          });
        }
      }
      return Object.freeze({
        items: Object.freeze(rows.slice(0, maxItems)),
        hasMore: hasMore || rows.length > maxItems,
      });
    };
    const site = createMooseSite({
      origin, provider: local.provider,
      kv: custody.kv, queue: runtime.queue, release: () => local.close(),
      custodyRoot: runtime.stateDirectory,
      readPublicTimeline, readPublicActor, authorizePublicRead,
    });
    return Object.freeze({ site, bearerTokenPath: local.bearerTokenPath });
  } catch (error) {
    try { await local?.close(); } finally { runtime.close?.(); }
    throw error;
  }
}
