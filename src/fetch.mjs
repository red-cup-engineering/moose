import { exactPublicPageRoutes } from "./source-page-routes.mjs";
import { createMooseApplication } from "./source-application.mjs";
import { admitMoosePublicSite } from "./section-site.mjs";
import { projectMooseResourceInventory } from "./resource-readout.mjs";
import { createMoosePublicReaders } from "./timeline.mjs";

const NAME = /^[a-z][a-z0-9._-]*$/u;
const MAX_VISIBLE = 64;

function publicItems(readout) {
  return readout.items.map((item, index) => ({
    id: `event-${index + 1}`,
    title: item.author,
    content: item.summary,
    ...(item.permalink ? { links: [{ href: item.permalink, label: "Federated post" }] } : {}),
  }));
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
  origin, provider,
  authorizePublicRead, pages = [], kv, queue, release, custodyRoot,
  basePath = "/", publicSite, tufteTheme, readPublicResources,
} = {}) {
  const address = new URL(origin);
  if (address.origin !== origin || address.pathname !== "/" ||
      provider?.origin !== origin || typeof provider.fetch !== "function" ||
      !provider.actorTypes?.includes("Group")) {
    throw new TypeError("MOOSE needs the exact admitted origin and native Group-capable ActivityPub provider");
  }
  const { readPublicTimeline, readPublicProfile } = createMoosePublicReaders({ origin, provider });
  if (typeof authorizePublicRead !== "function") throw new TypeError("MOOSE requires public-read authority");
  if (basePath !== "/" && !/^\/[a-z][a-z0-9-]*$/u.test(basePath)) {
    throw new TypeError("MOOSE site must select its exact source-owned social prefix");
  }
  if (!Array.isArray(provider.identifiers) || provider.identifiers.some(id => !NAME.test(id))) {
    throw new TypeError("MOOSE site needs admitted original actor identifiers");
  }
  const section = admitMoosePublicSite(publicSite, origin);
  if (readPublicResources !== undefined &&
      (typeof readPublicResources !== "function" || !section)) {
    throw new TypeError("MOOSE resource inventory reader needs a source-owned public section");
  }
  const profilePrefix = basePath === "/" ? "/people/" : basePath + "/people/";
  const profileMatch = new RegExp("^" + profilePrefix.replaceAll("/", "\\/") + "[a-z][a-z0-9._-]*$", "u");
  // Human-friendly address aliases are projections of the same original Actor.
  // Never invent a second Actor, identity key, or permission at /@identifier/.
  // /@identifier/ is the portable public human address on EVERY MOOSE
  // origin. /social only relocates the site-wide timeline, not each home.
  const actorHomePrefix = "/@";
  const actorHomeMatch = new RegExp("^" + actorHomePrefix.replaceAll("/", "\\/") + "[a-z][a-z0-9._-]*\\/?$", "u");
  const scopedActorHomePrefix = basePath === "/" ? null : basePath + "/@";
  const scopedActorHomeMatch = scopedActorHomePrefix === null ? null :
    new RegExp("^" + scopedActorHomePrefix.replaceAll("/", "\\/") + "[a-z][a-z0-9._-]*\\/?$", "u");
  const readProfile = async (identifier) => {
    const actor = await readPublicProfile({ identifier, maxItems: MAX_VISIBLE });
    if (actor === null) return null;
    const label = actor.name || identifier;
    const readout = actor.timeline;
    return {
      title: label,
      ...(section ? { subtitle: section.description, navigation: section.menu } : {}),
      tiles: [
        ...(section ? [{
          id: "section-return", title: "Section public home",
          content: "Return to the original public section website.",
          links: [{ href: section.baseIri, label: section.name }],
        }] : []),
        { id: "public-profile", title: label, content: actor.summary ?? "" },
        { id: "activitypub-face", title: "ActivityPub", content: actor.id },
        { id: "source-outbox", title: "Public activity source",
          content: "The original ActivityPub outbox is the source of this Actor's public posts. This homepage is a bounded current reading.",
          links: [{ href: actor.outbox, label: "Original public outbox" }] },
        ...publicItems(readout),
        ...(readout.hasMore || readout.coverage === "bounded-source-outbox" ? [{
          id: "actor-history-note",
          title: "More history may exist",
          content: "Continue through this Actor's original ActivityPub outbox for more history.",
        }] : []),
      ],
    };
  };
  const readHome = async context => {
    const activities = await readPublicTimeline({ maxItems: MAX_VISIBLE });
    // The page grant does not imply inventory access; the owner must grant
    // this distinct resource before the original inventory reader is called.
    let resourceTiles = [];
    if (readPublicResources !== undefined &&
        await authorizePublicRead({ context, resource: "public-resource-inventory" }) === true) {
      const observed = await readPublicResources({ context, origin, organization: section.name });
      if (observed !== null && observed !== undefined) {
        resourceTiles = projectMooseResourceInventory(observed, {
          origin, organization: section.name,
        });
      }
    }
    return {
      title: section ? section.name + " · Social" : "MOOSE — Semioverse",
      ...(section ? { subtitle: section.description, navigation: section.menu } : {}),
      tiles: [
        ...(section ? [{
          id: "section-entrance", title: "Public section",
          content: section.description,
          links: [{ href: section.baseIri, label: "Open " + section.name }],
        }, {
          id: "section-directory", title: "Source-owned public directory",
          content: "These links are declared by the owning section; their destinations determine availability and access.",
          links: section.menu,
        }] : []),
        ...(resourceTiles.length ? [{
          id: "source-resource-inventory", title: "Public resource inventory",
          content: "Source-declared access and transport; no implied uptime, permission or completed action.",
        }, ...resourceTiles] : []),
        { id: "introduction", title: "Federated social world", content: "Public activities from source-owned actors" },
        ...publicItems(activities),
        ...(activities.hasMore ? [{
          id: "older-activities", title: "More history",
          content: "This is a bounded reading; the original ActivityPub outboxes hold further activities.",
        }] : []),
      ],
    };
  };
  const sourcePageRoutes = exactPublicPageRoutes(pages, { basePath, sectionRoot: section !== null });
  const website = createMooseApplication({
    origin, authorizePublicRead,
    // Use the one source-authorized LWS/TUFTE renderer: no second app boundary.
    ...(tufteTheme === undefined ? {} : { document: { theme: tufteTheme } }),
    ...(basePath === "/" ? { home: readHome } : {}),
    pages: [
      ...(basePath === "/" ? [] : [{ match: basePath, name: "home", read: readHome }]),
      {
      match: profileMatch,
      name: "actor-profile",
      read: async context => {
        const identifier = new URL(context.request.url).pathname.slice(profilePrefix.length);
        return readProfile(identifier);
      },
    },
      {
        match: actorHomeMatch,
        name: "actor-profile",
        read: context => {
          const identifier = new URL(context.request.url).pathname.slice(actorHomePrefix.length).replace(/\/$/u, "");
          return readProfile(identifier);
        },
      },
      ...(scopedActorHomeMatch === null ? [] : [{
        match: scopedActorHomeMatch, name: "actor-profile",
        read: context => {
          const identifier = new URL(context.request.url).pathname
            .slice(scopedActorHomePrefix.length).replace(/\/$/u, "");
          return readProfile(identifier);
        },
      }]),
      ...pages],
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
    ...provider.identifiers.flatMap(identifier => [
      { id: "moose.actor-home." + identifier, match: actorHomePrefix + identifier },
      { id: "moose.actor-home-slash." + identifier, match: actorHomePrefix + identifier + "/" },
      ...(scopedActorHomePrefix === null ? [] : [
        { id: "moose.actor-home-scoped." + identifier, match: scopedActorHomePrefix + identifier },
        { id: "moose.actor-home-scoped-slash." + identifier, match: scopedActorHomePrefix + identifier + "/" },
      ]),
    ]),
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

export { createMooseApplication } from "./source-application.mjs";
