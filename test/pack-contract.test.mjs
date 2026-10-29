import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function declaredTargets(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).flatMap(declaredTargets);
  }
  throw new TypeError("MOOSE exports must address published file paths");
}

test("the actual offline npm pack contains every export and binary, exactly the receiving tests", () => {
  // The publisher once refused an archive containing tests that require
  // development-only providers. This reads npm's actual file-selection
  // result rather than guessing from package.files or a source checkout.
  const raw = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", [
    "pack", "--json", "--dry-run", "--ignore-scripts", "--offline",
    "--no-audit", "--no-fund",
  ], { cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  const result = JSON.parse(raw);
  assert.equal(result.length, 1, "one actual package is assembled");
  const archive = result[0];
  assert.equal(archive.name, manifest.name);
  assert.equal(archive.version, manifest.version);
  assert.ok(Array.isArray(archive.files) && archive.files.length > 0);
  const paths = new Set(archive.files.map(file => file.path));
  assert.equal(paths.size, archive.files.length, "no duplicate archive members");

  for (const [name, target] of Object.entries(manifest.exports)) {
    for (const address of declaredTargets(target)) {
      assert.ok(address.startsWith("./"), name + " must name a package-relative target");
      assert.ok(paths.has(address.slice(2)), name + " is missing from the published archive");
    }
  }
  for (const [name, target] of Object.entries(manifest.bin ?? {})) {
    assert.ok(paths.has(target.replace(/^\.\//u, "")), "binary " + name + " is missing");
  }
  for (const required of ["package.json", "README.md", "LICENSE", "NOTICE.md"]) {
    assert.ok(paths.has(required), "required source terms or metadata missing: " + required);
  }

  const received = manifest.receivingTests;
  assert.ok(Array.isArray(received) && received.length > 0);
  assert.equal(new Set(received).size, received.length, "receiving suite declarations must be unique");
  assert.deepEqual(
    [...paths].filter(name => name.startsWith("test/")).sort(),
    [...received].sort(),
    "only explicitly selected original receiving tests may ship"
  );
  const localTests = readdirSync(join(root, "test"))
    .filter(name => name.endsWith(".test.mjs")).map(name => "test/" + name);
  for (const sourceOnly of localTests.filter(name => !received.includes(name))) {
    assert.equal(paths.has(sourceOnly), false,
      "source-only test (potential dev dependency) leaked into the published package");
  }
  assert.equal([...paths].some(name => name.startsWith(".github/") ||
    name.startsWith("docs/receiving-records/")), false,
    "runtime package must not duplicate CI configuration or dated source receipts");
});
