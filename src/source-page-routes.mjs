/**
 * Project only exact, source-declared application pages into the original
 * FeltOS native-route inventory. MOOSE's Living Web Server still serves each
 * page through its own authority-checked Fetch application.
 *
 * A regular-expression route may be served by a standalone MOOSE site, but it
 * is NOT a finite native MUD affordance. Neither an arbitrary wildcard nor
 * a private/social protocol path can become an advertised route by projection.
 */
const RESERVED_PREFIXES = Object.freeze([
  "/actors", "/.well-known", "/people", "/inbox", "/outbox",
]);

function exactPath(path) {
  if (typeof path !== "string" || path.length < 2 || path.length > 512 ||
      !/^\/[a-z0-9][a-z0-9._/-]*$/u.test(path) ||
      path.includes("//") || path.endsWith("/") ||
      path.split("/").some(part => part === "." || part === "..")) {
    throw new TypeError("MOOSE added native page needs one exact, safe path");
  }
  return path;
}

/**
 * Project an existing LWS page declaration. This creates no content,
 * authorisation, listener, location registry, or extra publication.
 */
export function exactPublicPageRoutes(pages, { basePath = "/" } = {}) {
  if (!Array.isArray(pages) || (basePath !== "/" &&
      (typeof basePath !== "string" || !/^\/[a-z][a-z0-9-]*$/u.test(basePath)))) {
    throw new TypeError("MOOSE native page projection requires original pages and site prefix");
  }
  const occupied = new Set();
  const routes = [];
  for (const page of pages) {
    // Non-exact LWS routes have no finite source-qualified FeltOS path.
    if (page?.match instanceof RegExp) continue;
    const match = exactPath(page?.match);
    const reserved = [...RESERVED_PREFIXES, ...(basePath === "/" ? [] : [basePath])]
      .some(prefix => match === prefix || match.startsWith(prefix + "/"));
    if (reserved || occupied.has(match)) {
      throw new TypeError("MOOSE added native page conflicts with an existing protocol, social, or page route");
    }
    occupied.add(match);
    routes.push(Object.freeze({ id: "moose.page:" + match, match }));
  }
  return Object.freeze(routes);
}
