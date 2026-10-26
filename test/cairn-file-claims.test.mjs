import test from "node:test";
import assert from "node:assert/strict";
import * as original from "@red-cup-engineering/knowledge-system-server/finite-file-claims";
import * as forwarded from "../src/cairn-file-claims.mjs";
test("MOOSE forwards the same original CAIRN producer and receipt codec capabilities", () => {
  assert.deepEqual(Object.keys(forwarded).sort(), ["admitCairnFiniteFileClaims", "encodeCairnFiniteFileClaims", "readCairnFiniteFileClaims"]);
  for (const key of Object.keys(forwarded)) assert.equal(forwarded[key], original[key]);
});
