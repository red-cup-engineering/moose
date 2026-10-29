/**
 * Read the existing owning section's public site parameters; do NOT invent
 * new Brand, office, claims, capability status, permissions or page data.
 * TUFTE receives its navigation and MOOSE projects links to real section
 * destinations. One site of many, no independent identity registry.
 */
export function admitMoosePublicSite(site, origin) {
  if (site === undefined) return null;
  if (!site || typeof site !== "object" || Array.isArray(site) ||
      site.baseIri !== origin + "/" ||
      typeof site.name !== "string" || !site.name.trim() || site.name.length > 160 ||
      typeof site.description !== "string" || site.description.length > 1024 ||
      !Array.isArray(site.menu) || site.menu.length > 32) {
    throw new TypeError("MOOSE section home requires the original canonical public site parameters");
  }
  const seen = new Set();
  const menu = site.menu.map(link => {
    if (!link || typeof link !== "object" || Array.isArray(link) ||
        typeof link.label !== "string" || !link.label.trim() || link.label.length > 100 ||
        typeof link.href !== "string" || !link.href ||
        link.href.startsWith("//")) {
      throw new TypeError("MOOSE section navigation needs labeled public addresses");
    }
    let address;
    try { address = new URL(link.href, origin + "/"); }
    catch { throw new TypeError("MOOSE section navigation has an invalid address"); }
    const sameSite = address.origin === origin;
    if (address.protocol !== "https:" || address.username || address.password ||
        (sameSite && (address.pathname === "/_private" ||
          address.pathname.startsWith("/_private/"))) ||
        seen.has(address.href)) {
      throw new TypeError("MOOSE section navigation refuses private, ambiguous or insecure addresses");
    }
    seen.add(address.href);
    return Object.freeze({ href: link.href, label: link.label });
  });
  return Object.freeze({
    name: site.name,
    description: site.description,
    baseIri: site.baseIri,
    menu: Object.freeze(menu),
  });
}
