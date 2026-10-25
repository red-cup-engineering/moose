import { exactPublicPageRoutes } from "./source-page-routes.mjs";
import { createLivingWebServer } from "@red-cup-engineering/living-web-server/fetch";
import { createActivityPubMultiSiteServerEngine } from "@red-cup-engineering/activitypub-server";
import { serveManagedActivityPubSites } from "@red-cup-engineering/activitypub-server/managed-sites";

const NAME = /^[a-z][a-z0-9._-]*$/u;
const MAX_VISIBLE = 64;

function named(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be nonempty text`);
  return value;
}
function publicItems(readout, provider) {
  if (!readout || !Array.isArray(readout.items) ||
      readout.items.length > MAX_VISIBLE || typeof readout.hasMore !== "boolean") {
    throw new TypeError("MOOSE timeline reader must return at most 64 admitted public activities and hasMore");
  }
  const seen = new Set();
  return readout.items.map((item, index) => {
    if (!item || item.visibility !== "public" || typeof item.id !== "string" ||
        typeof item.summary !== "string" || item.summary.length > 4096 ||
        typeof item.author !== "string" || !item.author.trim()) {
      throw new TypeError("MOOSE cannot present unadmitted or unbounded activity as public");
    }
    let url;
    try { url = new URL(item.id); } catch { throw new TypeError("MOOSE activity requires its original absolute IRI"); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
        seen.has(url.href)) throw new TypeError("MOOSE activity needs one distinct safe source identity");
    seen.add(url.href);
    // Link only what the original Fedify provider truly serves. In
    // particular an arbitrary Create.object IRI must not be presented
    // as a working permalink merely because it was visible in an outbox.
    const segments = url.pathname.split("/").filter(Boolean);
    const served = provider.routeCapabilities?.publicObjects === true &&
      url.origin === provider.origin && segments.length === 4 &&
      segments[0] === "actors" && segments[1] === item.author &&
      (segments[2] === "notes" || segments[2] === "articles") &&
      segments[3] !== "" && url.search === "" && url.hash === "";
    return Object.freeze({
      id: `event-${index + 1}`,
      title: item.author,
      content: item.summary,
      ...(served ? { links: [{ href: item.id, label: "Federated post" }] } : {}),
    });
  });
}

/**
 * MOOSE — MUD, Object Oriented, Socially Extended.
 *
 * One actual social application composed from Living Web Server's live TUFTE
 * views and the house's native ActivityPub actor/follower/inbox/outbox engine.
 * World objects, moderation decisions, memberships, keys and journal entries
 * remain in their source-owned providers; this application never duplicates
 * their authority or custody.
 */
export function createMooseSite({
  origin, provider, readPublicTimeline, readPublicActor,
  authorizePublicRead, pages = [], kv, queue, release, custodyRoot,
  basePath = "/",
} = {}) {
  const address = new URL(origin);
  if (address.origin !== origin || address.pathname !== "/" ||
      provider?.origin !== origin || typeof provider.fetch !== "function" ||
      !provider.actorTypes?.includes("Group")) {
    throw new TypeError("MOOSE needs the exact admitted origin and native Group-capable ActivityPub provider");
  }
  if (typeof readPublicTimeline !== "function" || typeof readPublicActor !== "function") {
    throw new TypeError("MOOSE requires the original current public timeline and actor readers");
  }
  if (typeof authorizePublicRead !== "function") throw new TypeError("MOOSE requires public-read authority");
  if (basePath !== "/" && !/^\/[a-z][a-z0-9-]*$/u.test(basePath)) {
    throw new TypeError("MOOSE site must select its exact source-owned social prefix");
  }
  if (!Array.isArray(provider.identifiers) || provider.identifiers.some(id => !NAME.test(id))) {
    throw new TypeError("MOOSE site needs admitted original actor identifiers");
  }
  const profilePrefix = basePath === "/" ? "/people/" : basePath + "/people/";
  const profileMatch = new RegExp("^" + profilePrefix.replaceAll("/", "\\/") + "[a-z][a-z0-9._-]*$", "u");
  const readHome = async () => {
    const activities = await readPublicTimeline({ maxItems: MAX_VISIBLE });
    return {
      title: "MOOSE — Semioverse",
      tiles: [
        { id: "introduction", title: "Federated social world", content: "Public activities from source-owned actors" },
        ...publicItems(activities, provider),
        ...(activities.hasMore ? [{
          id: "older-activities", title: "More history",
          content: "This is a bounded reading; the original ActivityPub outboxes hold further activities.",
        }] : []),
      ],
    };
  };
  const sourcePageRoutes = exactPublicPageRoutes(pages, { basePath });
  const website = createLivingWebServer({
    origin, authorizePublicRead,
    ...(basePath === "/" ? { home: readHome } : {}),
    pages: [
      ...(basePath === "/" ? [] : [{ match: basePath, name: "home", read: readHome }]),
      {
      match: profileMatch,
      name: "actor-profile",
      read: async context => {
        const identifier = new URL(context.request.url).pathname.slice(profilePrefix.length);
        if (!NAME.test(identifier)) return null;
        const actor = await readPublicActor({ identifier });
        if (actor === null || actor === undefined) return null;
        if (actor.identifier !== identifier) throw new TypeError("MOOSE source actor identity changed during projection");
        const label = named(actor.name, "public actor name");
        const summary = named(actor.summary, "public actor summary");
        return {
          title: label,
          tiles: [
            { id: "public-profile", title: label, content: summary },
            { id: "activitypub-face", title: "ActivityPub", content: new URL(`/actors/${identifier}`, origin).href },
          ],
        };
      },
    }, ...pages],
  });
  // When another native host (FeltOS) consumes this same website, its
  // admission layer accepts only exact public routes. No path wildcard and
  // no second listener are installed in the world driver.
  const paths = [
    { id: "moose.home", match: basePath },
    ...sourcePageRoutes,
    ...provider.identifiers.map(identifier => ({
      id: "moose.actor." + identifier, match: profilePrefix + identifier,
    })),
  ];
  const resources = Object.freeze(paths.map(route => Object.freeze({
    ...route, public: true,
    handler: context => website.fetch(context.request),
  })));
  return Object.freeze({
    origin, provider, website, resources,
    ...(kv === undefined ? {} : { kv }),
    ...(queue === undefined ? {} : { queue }),
    ...(release === undefined ? {} : { release }),
    ...(custodyRoot === undefined ? {} : { custodyRoot }),
  });
}

/** The original ActivityPub multisite host resolves each WebFinger/actor/outbox. */
export const createMooseEngine = ({ sites }) => createActivityPubMultiSiteServerEngine({ sites });

/** The original managed host owns worker lifecycle and source custody release. */
export const serveMooseSites = options => serveManagedActivityPubSites(options);

export { createMoosePublicReaders } from "./timeline.mjs";
