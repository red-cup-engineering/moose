import assert from "node:assert/strict";
import test from "node:test";
import { admitMoosePublicSite } from "../src/section-site.mjs";

const origin = "https://science.561.group";
const canonical = () => ({
  baseIri: origin + "/", name: "Lenticule Science",
  description: "A source-qualified public science facility.",
  menu: [
    { href: "/search/", label: "Search" },
    { href: "https://engineering.561.group/", label: "Engineering" },
  ],
  extraOwnerPolicy: "not-projected",
});
test("a source-owned public site passes as a bounded frozen navigation, never as another authority", () => {
  const original = canonical();
  const accepted = admitMoosePublicSite(original, origin);
  assert.equal(accepted.name, original.name);
  assert.deepEqual(accepted.menu, original.menu);
  assert.equal(Object.hasOwn(accepted, "extraOwnerPolicy"), false);
  assert.ok(Object.isFrozen(accepted));
  assert.ok(Object.isFrozen(accepted.menu));
  assert.ok(accepted.menu.every(Object.isFrozen));
  assert.deepEqual(original, canonical());
  assert.equal(admitMoosePublicSite(undefined, origin), null);
});
test("no site imposture, insecure link or internal operator link", () => {
  for (const malformed of [
    { ...canonical(), baseIri: "https://wrong.example/" },
    { ...canonical(), name: "" },
    { ...canonical(), menu: null },
    { ...canonical(), menu: [{ href: "javascript:alert(1)", label: "Execute" }] },
    { ...canonical(), menu: [{ href: "//evil.example/", label: "Confusing" }] },
    { ...canonical(), menu: [{ href: "/_private/system", label: "Private" }] },
    { ...canonical(), menu: [{ href: "http://engineering.561.group/", label: "Insecure" }] },
    { ...canonical(), menu: [{ href: "/search/", label: "One" }, { href: "/search/", label: "Two" }] },
  ]) assert.throws(() => admitMoosePublicSite(malformed, origin), TypeError);
});
