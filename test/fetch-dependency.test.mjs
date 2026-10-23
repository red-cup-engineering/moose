import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("MOOSE consumes the real Living Web Fetch module without importing its Node listener",()=>{
  const source=file("src/application.mjs");
  assert.ok(source.includes('from "@red-cup-engineering/living-web-server/fetch"'));
  assert.ok(!source.includes('from "@red-cup-engineering/living-web-server"'));
  assert.ok(source.includes("createLivingWebServer({"));
  assert.ok(source.includes("serveManagedActivityPubSites"));
  const pkg=JSON.parse(file("package.json"));
  assert.ok(pkg.dependencies["@red-cup-engineering/living-web-server"]);
  assert.equal(pkg.dependencies["@red-cup-engineering/computer-web-server"],undefined);
});
