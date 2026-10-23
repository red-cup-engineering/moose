/** Present the original house's typed PublicResourceInventory as MOOSE tiles.
 * This is a bounded, read-only projection of an existing public contract.
 * No shadow resource store, no service verification and no HTTP method guesses.
 */
const KEY = /^[a-z][a-z0-9-]{0,79}$/u;
const MAX = 64;
const publicUrl = (input) => {
  if (typeof input !== "string" || input.length > 2048) throw new TypeError("MOOSE resource needs a bounded public IRI");
  let u;
  try { u = new URL(input); }
  catch { throw new TypeError("MOOSE resource URL is invalid"); }
  if (u.protocol !== "https:" || u.username || u.password) {
    throw new TypeError("MOOSE resource URI needs a public HTTPS address");
  }
  return u.href;
};

export function projectMooseResourceInventory(inventory, { origin, organization } = {}) {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory) ||
      inventory.type !== "PublicResourceInventory" || inventory.version !== 1 ||
      inventory.origin !== origin + "/" || inventory.organization !== organization ||
      !Array.isArray(inventory.resources) || inventory.resources.length > MAX) {
    throw new TypeError("MOOSE requires the original house PublicResourceInventory");
  }
  const seen = new Set();
  return Object.freeze(inventory.resources.map(resource => {
    if (!resource || typeof resource !== "object" || Array.isArray(resource) ||
        typeof resource.id !== "string" || !KEY.test(resource.id) || seen.has(resource.id) ||
        typeof resource.title !== "string" || !resource.title.trim() || resource.title.length > 160 ||
        typeof resource.humanAction !== "string" || resource.humanAction.length > 600 ||
        !resource.access || typeof resource.access.mode !== "string" ||
        !KEY.test(resource.access.mode) ||
        !resource.agentAccess || typeof resource.agentAccess !== "object") {
      throw new TypeError("MOOSE resource inventory has an ambiguous or unqualified entry");
    }
    seen.add(resource.id);
    const href = publicUrl(resource.url);
    const method = resource.agentAccess.method;
    if (method !== undefined && !["GET", "HEAD", "POST"].includes(method)) {
      throw new TypeError("MOOSE resource contains an unsupported transport method");
    }
    const openPublic = resource.access.mode === "public-read" && method === "GET";
    const openAuthorizedSource = resource.access.mode === "authorized-repository-reader" &&
      method === "GET";
    const context = resource.humanAction || "Consult the original owner for access conditions.";
    const mode = resource.access.mode;
    return Object.freeze({
      id: "section-resource-" + resource.id,
      title: resource.title,
      // UI labels explicitly distinguish source declaration from functioning,
      // accessible and independently verified service availability.
      content: "Source-declared access: " + mode + ". " + context +
        " Availability and authorization are checked at the destination.",
      ...(openPublic ? { links: Object.freeze([Object.freeze({ href, label: "Open public resource" })]) } :
        openAuthorizedSource ? { links: Object.freeze([Object.freeze({
          href, label: "Source reference (authorization required)",
        })]) } : {}),
    });
  }));
}
