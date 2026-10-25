import { createLivingWebServer } from "@red-cup-engineering/living-web-server/fetch";

/** The shared MOOSE application boundary for source-backed public views.
 * Social sites and downstream applications use the same origin admission,
 * authority check and live TUFTE reader. Federation stays with the site's
 * independently commissioned ActivityPub provider.
 */
export function createMooseApplication({
  origin, home, pages = [], authorizePublicRead, document,
} = {}) {
  if (!Array.isArray(pages)) throw new TypeError("MOOSE application pages must be source declarations");
  const paths = new Set(home === undefined ? [] : ["/"]);
  const admitted = pages.map((page, index) => {
    const name = page?.name ?? `page-${index + 1}`;
    if (!page || typeof name !== "string" || !name.trim() || name.length > 512 ||
        /[\u0000-\u001f\u007f]/u.test(name) || typeof page.read !== "function") {
      throw new TypeError("MOOSE source pages require authority names and original readers");
    }
    if (typeof page.match !== "string" && !(page.match instanceof RegExp)) {
      throw new TypeError("MOOSE source pages require declared routes");
    }
    const route = String(page.match);
    if (paths.has(route)) throw new TypeError("MOOSE source pages must not shadow another route");
    paths.add(route);
    return Object.freeze({ ...page, name });
  });
  return createLivingWebServer({ origin, home, pages: admitted, authorizePublicRead, document });
}
