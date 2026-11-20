import { openPublicActor } from "@red-cup-engineering/activitypub-engineering-services-section/public-actor";

const actorPattern = /^[a-z0-9][a-z0-9._-]*$/u;

function orderPosts(posts, limit) {
  const unique = new Map();
  for (const post of posts) unique.set(post.id, post);
  return Object.freeze([...unique.values()]
    // Time is optional. Undated authoring is not assigned a fictional timestamp.
    .sort((a, b) => a.published && b.published
      ? b.published.localeCompare(a.published) || a.id.localeCompare(b.id)
      : a.published ? -1 : b.published ? 1 : 0)
    .slice(0, limit));
}

function displayLimit(maxItems) {
  if (!Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > 64)
    throw new TypeError("MOOSE source read must be bounded to 1..64 public posts");
}

function publicReadout(posts, maxItems, scope) {
  const items = posts.slice(0, maxItems).map(post => Object.freeze({
    id: post.id, author: post.identifier, visibility: "public",
    ...(post.permalink ? { permalink: post.permalink } : {}),
    summary: `${post.type}: ${post.content.slice(0, 4070)}`,
  }));
  return Object.freeze({ items: Object.freeze(items), hasMore: posts.length > maxItems, ...scope });
}

/** Compose MOOSE display records from anonymous source actors and their advertised outboxes. */
export function createMoosePublicReaders({ origin, provider } = {}) {
  if (typeof origin !== "string" || provider?.origin !== origin || typeof provider.fetch !== "function" ||
      !Array.isArray(provider.identifiers) || provider.identifiers.length > 100 ||
      provider.identifiers.some(id => typeof id !== "string" || !actorPattern.test(id)) ||
      new Set(provider.identifiers).size !== provider.identifiers.length)
    throw new TypeError("MOOSE needs its source provider and distinct local actor identifiers");

  async function readActor(identifier, maxItems) {
    const actor = await openPublicActor({ provider, identifier });
    if (actor === null) return null;
    const posts = await actor.readPosts({ minimumPosts: maxItems + 1 });
    return { actor, posts: posts.map(post => ({ ...post, identifier })) };
  }

  async function readPublicProfile({ identifier, maxItems = 64 } = {}) {
    if (!provider.identifiers.includes(identifier)) return null;
    displayLimit(maxItems);
    const reading = await readActor(identifier, maxItems);
    if (reading === null) return null;
    const { actor, posts } = reading;
    return Object.freeze({
      identifier, id: actor.id, name: actor.name, summary: actor.summary, outbox: actor.outbox,
      timeline: publicReadout(orderPosts(posts, maxItems + 1), maxItems, { coverage: "bounded-source-outbox" }),
    });
  }

  async function readPublicTimeline({ maxItems = 64 } = {}) {
    displayLimit(maxItems);
    const readings = await Promise.all(provider.identifiers.map(id => readActor(id, maxItems)));
    const posts = readings.flatMap(reading => reading?.posts ?? []);
    return publicReadout(orderPosts(posts, maxItems + 1), maxItems, { coverage: "bounded-source-outboxes" });
  }

  return Object.freeze({ readPublicProfile, readPublicTimeline });
}
