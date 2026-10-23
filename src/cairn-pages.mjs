/**
 * Source-owned MOOSE consumer of the original CAIRN FARS knowledge port.
 * Returns ONE page declaration for createMooseSite({ pages }), not a second
 * catalog, web server, actor registry, graph or credential authority.
 *
 * Native FeltOS routes need exact-page projection (MOOSE PR #5); this module
 * does not silently claim that pending receipt already exists.
 */
const EXACT = /^\/[a-z0-9](?:[a-z0-9/_-]*[a-z0-9])?$/u;
const MAX_PAGE_BYTES = 128 * 1024;

/**
 * Bind one already-authorized SignCraft document reading through CAIRN to
 * a source-specific TUFTE projection supplied by the publishing consumer.
 * principal is host-selected, never read from request query or headers.
 */
export function createMooseCairnPage({
  match, cairn, principal, documentOptions = {}, projectDocument,
} = {}) {
  if (typeof match !== "string" || !EXACT.test(match) ||
      match.includes("//") || match.split("/").some(part => part === "." || part === "..") ||
      match === "/actors" || match.startsWith("/actors/") ||
      match.startsWith("/.well-known/") ||
      match === "/social" ||
      ["/people", "/inbox", "/outbox",
       "/social/people", "/social/actors", "/social/inbox", "/social/outbox"]
        .some(prefix => match === prefix || match.startsWith(prefix + "/"))) {
    throw new TypeError("MOOSE CAIRN page requires one exact non-protocol route");
  }
  if (cairn?.kind !== "cairn.fars/v1" || typeof cairn.readSigncraft !== "function") {
    throw new TypeError("MOOSE requires original CAIRN FARS document reader");
  }
  if (typeof principal !== "string" || !principal.trim()) {
    throw new TypeError("MOOSE CAIRN principal must be selected by the host");
  }
  if (typeof projectDocument !== "function") {
    throw new TypeError("MOOSE CAIRN needs the original TUFTE document projection");
  }
  if (documentOptions === null || typeof documentOptions !== "object" || Array.isArray(documentOptions)) {
    throw new TypeError("MOOSE CAIRN document options must be a record");
  }
  return Object.freeze({
    match,
    name: "cairn-signcraft-document",
    read: async context => {
      // CAIRN alone consults the original SignCraft source-authorized reader.
      // The LWS site also checks authorizePublicRead BEFORE calling this page.
      const document = await cairn.readSigncraft({ principal, options: documentOptions });
      const page = await projectDocument(document, context);
      if (!page || typeof page.title !== "string" || !page.title.trim() ||
          !Array.isArray(page.tiles) || page.tiles.length > 64) {
        throw new TypeError("MOOSE CAIRN projection must return one bounded TUFTE page");
      }
      // A count of tiles is not a byte budget: one tile can carry megabytes.
      // Bound the adapter's JSON projection; the original renderer/host still
      // owns its independent HTTP response-size and public-reading policy.
      let serialized;
      try { serialized = JSON.stringify(page); }
      catch { throw new TypeError("MOOSE CAIRN projection must be serializable and bounded"); }
      if (typeof serialized !== "string" ||
          new TextEncoder().encode(serialized).byteLength > MAX_PAGE_BYTES) {
        throw new RangeError("MOOSE CAIRN projection exceeds 128 KiB source page budget");
      }
      return page;
    },
  });
}
