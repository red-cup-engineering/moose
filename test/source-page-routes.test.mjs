import assert from "node:assert/strict";
import test from "node:test";
import { exactPublicPageRoutes } from "../src/source-page-routes.mjs";

test("a canonical research page is a finite native resource without becoming a new publisher", () => {
  const pages = [
    { match: "/research/jiangshi-web", name: "science-jiangshi" },
    { match: /^\/research\/[a-z-]+$/u, name: "other-research" },
    { match: "/papers/source-claims", name: "source-claims" },
  ];
  const result = exactPublicPageRoutes(pages, { basePath: "/social" });
  assert.deepEqual(result, [
    { id: "moose.page:/research/jiangshi-web", match: "/research/jiangshi-web" },
    { id: "moose.page:/papers/source-claims", match: "/papers/source-claims" },
  ]);
  assert.equal(Object.isFrozen(result), true);
  assert.ok(result.every(Object.isFrozen));
  assert.deepEqual(pages[0], { match: "/research/jiangshi-web", name: "science-jiangshi" },
    "the original source page remains the owner; no rewrite or registration");
});

test("the projection refuses unsafe, ambiguous, or claimed protocol/social space", () => {
  for (const match of [
    "/research/:slug", "/research/*", "/research//paper", "/research/../private",
    "/research/./paper", "/research/Paper", "/research/%2e%2e", "/research/",
    "/actors/science", "/actors", "/.well-known/webfinger",
    "/people/science", "/inbox/private", "/outbox/science",
    "/social", "/social/people/science", "/science?draft=yes", "/#fragment",
  ]) {
    assert.throws(() => exactPublicPageRoutes([{ match }], { basePath: "/social" }),
      TypeError, match);
  }
  assert.throws(() => exactPublicPageRoutes([
    { match: "/research/a" }, { match: "/research/a" },
  ]), /conflicts/);
  assert.throws(() => exactPublicPageRoutes(null), /requires original pages/);
  assert.deepEqual(exactPublicPageRoutes([], { basePath: "/" }), []);
});
