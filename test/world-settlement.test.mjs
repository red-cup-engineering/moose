import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { cp, copyFile, mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as WorldHistory from "../src/world-history.mjs";
import * as DirectHistory from "@red-cup-engineering/signcraft/history";
import * as DirectSettlement from "@red-cup-engineering/signcraft/settle";
import WorldCell from "../src/world-cell.mjs";
import { createWorld, tell } from "../src/world.mjs";
import { settleHistory, settlementAdmits } from "../src/world-settlement.mjs";

// Resolve native constructors from the actual World supplier. The production
// boundary has no Node resolver, alternate rule dialect or constructor shim.
const signcraftPath = fileURLToPath(import.meta.resolve("@red-cup-engineering/signcraft/settle"));
const fromSigncraft = createRequire(signcraftPath);
const originalSettlement = await import(pathToFileURL(signcraftPath).href);
const originalHistory = await import(pathToFileURL(fromSigncraft.resolve("@red-cup-engineering/signcraft/history")).href);
const originalCell = await import(pathToFileURL(fromSigncraft.resolve("@red-cup-engineering/signcell/cell")).href);
const Rules = await import(pathToFileURL(fromSigncraft.resolve("@red-cup-engineering/signchain/rules")).href);
const { cell, cellSet, address, semanticId, knowledgeReading } = originalCell;
const same = (left, right) => assert.equal(semanticId(left), semanticId(right));
const findCell = (values, target) => values.find(value => address(value) === address(target));

function fixture() {
  const history = tell(createWorld({ functionalPredicates: ["health"] }), [
    { subject: "actor", predicate: "health", object: 0, evidence: "stable" },
    { subject: "archive", predicate: "retains", object: "unrelated", evidence: "active" },
  ], { source: "original-world-observation" });
  const seed = WorldHistory.historySection(history, "actor", "health")[0];
  const dead = cell("actor", "condition", "dead");
  const haunted = cell("room", "haunted", true);
  const rules = [
    Rules.rule("health-to-condition", [{ cell: seed, atLeast: "potential" }],
      { cell: dead, reading: "potential" }),
    Rules.rule("condition-to-haunting", [{ cell: dead, atLeast: "potential" }],
      { cell: haunted, reading: "potential" }),
  ];
  return { history, seed, dead, haunted, rules };
}

test("World closure and native constructors retain the selected SignCraft provider family", () => {
  assert.deepEqual(Object.keys(WorldHistory), Object.keys(DirectHistory));
  for (const name of Object.keys(WorldHistory)) {
    assert.equal(WorldHistory[name], DirectHistory[name], `direct history ${name}`);
    assert.equal(WorldHistory[name], originalHistory[name], `selected history ${name}`);
  }
  assert.equal(WorldCell, originalCell, "the complete Cell namespace is the actual selected supplier");
  const admitted = cell("source", "retains", originalCell.retainedCarrier(new Uint8Array([0, 127, 255])), { for: ["source"] });
  assert.equal(WorldHistory.retainHistoryCell(admitted), admitted,
    "the Cell constructor shares SignCraft history's private admission and byte custody");
  const world = tell(createWorld(), {
    subject: "source", predicate: "retains", object: WorldCell.retainedCarrier(new Uint8Array([0, 127, 255])),
  });
  const observed = WorldHistory.historySection(world, "source", "retains")[0];
  assert.equal(WorldCell.admitCell(observed), observed,
    "the World observation retains the selected Cell owner's admission");
  assert.deepEqual([...observed.object], [0, 127, 255]);
  assert.equal(DirectSettlement.settleHistory, originalSettlement.settleHistory);
  assert.equal(settlementAdmits, originalSettlement.settlementAdmits);
  const rule = Rules.rule("native", [], { cell: cell("source", "says", "claim"), reading: "potential" });
  assert.equal(Rules.admitRule(rule), rule, "the native rule constructor keeps its own admission custody");
});

test("MOOSE World closure preserves the native orbit, witnesses and one atomic revision", () => {
  const f = fixture(), before = semanticId(f.history);
  const result = settleHistory(f.history, f.rules);
  assert.ok(Object.isFrozen(result));
  assert.equal(result.settlement.settledAt, 2);
  assert.equal(settlementAdmits(result.settlement).admitted, true);
  assert.equal(result.history.revisions.length, f.history.revisions.length + 1);
  assert.equal(result.history.revisions[0], f.history.revisions[0]);
  same(result.history.revisions.at(-1).parents, WorldHistory.historyHeads(f.history));
  same(result.history.revisions.at(-1).source,
    { kind: "signcraft.settlement", id: semanticId(result.settlement) });
  assert.equal(result.added.length, 2);
  same(findCell(result.added, f.dead).for, [Rules.derivation(f.rules[0])]);
  same(findCell(result.added, f.haunted).for, [Rules.derivation(f.rules[1])]);
  same(findCell(result.settlement.settled, f.seed), f.seed);
  assert.equal(knowledgeReading(findCell(result.settlement.settled, f.seed)), "stable");
  same(WorldHistory.historySection(result.history, "archive"), WorldHistory.historySection(f.history, "archive"));
  same(cellSet(WorldHistory.queryHistory(result.history, {})), result.settlement.settled);
  assert.equal(semanticId(f.history), before);
  const replay = WorldHistory.restoreHistory(structuredClone(result.history));
  same(WorldHistory.historyHeads(replay), WorldHistory.historyHeads(result.history));
  same(cellSet(WorldHistory.queryHistory(replay, {})), result.settlement.settled);
});

test("already closed World histories return the original carrier without a new occurrence", () => {
  const f = fixture(), first = settleHistory(f.history, f.rules);
  const before = WorldHistory.captureHistoryOccurrences(first.history);
  const repeated = settleHistory(first.history, f.rules);
  assert.equal(repeated.history, first.history);
  assert.deepEqual(repeated.added, []);
  assert.equal(repeated.settlement.settledAt, 0);
  assert.equal(settlementAdmits(repeated.settlement).admitted, true);
  same(WorldHistory.captureHistoryOccurrences(repeated.history), before);
});

test("closure preserves private World archive custody through a checkpoint and new revision", () => {
  const f = fixture();
  const compact = WorldHistory.restoreHistory(structuredClone(WorldHistory.checkpointHistory(f.history)));
  WorldHistory.bindHistoryArchive(compact, () => f.history.revisions);
  assert.equal(settleHistory(compact, []).history, compact);
  const result = settleHistory(compact, f.rules);
  assert.equal(result.history.checkpoint, compact.checkpoint);
  same(result.history.revisions[0].parents, WorldHistory.historyHeads(compact));
  const materialized = WorldHistory.materializeHistory(result.history);
  same(materialized.revisions, [...f.history.revisions, ...result.history.revisions]);
  const frame = WorldHistory.captureHistoryOccurrences(result.history, { archive: true });
  assert.deepEqual(frame.unresolved, []);
  assert.equal(WorldHistory.isHistoryOccurrenceFrameFor(frame, result.history), true);
  const captured = WorldHistory.captureHistoryReads(() =>
    DirectHistory.readCapturedHistoryOccurrences(frame, "actor", "condition"));
  assert.deepEqual(captured.reads, [{}]);
  assert.equal(captured.result.rows.length, 1);
  assert.equal(captured.result.rows[0].occurrence.revisionId, result.history.revisions[0].id);
});

test("native functional, dialect and inert-source refusals occur without changing World history", () => {
  const f = fixture(), before = semanticId(f.history);
  for (const antecedent of [[], [{ cell: cell("absent", "claim", true), atLeast: "potential" }]]) {
    const replacement = Rules.rule("illegal-location", antecedent,
      { cell: cell("actor", "located-in", "elsewhere"), reading: "potential" });
    assert.throws(() => settleHistory(f.history, [replacement]), /functional conclusions/);
  }
  assert.throws(() => settleHistory(f.history, [{ when: f.seed, then: f.dead }]), TypeError);
  assert.throws(() => settleHistory(f.history, f.rules, { fuel: 1 }), /exactly/);
  let reads = 0;
  const executable = { ...f.rules[0] };
  Object.defineProperty(executable, "antecedent", { enumerable: true,
    get() { reads += 1; return []; } });
  assert.throws(() => settleHistory(f.history, [executable]), TypeError);
  const forged = structuredClone(f.history);
  forged.revisions[0].cells[0].object = "substituted";
  assert.throws(() => settleHistory(forged, f.rules), /content address/);
  assert.equal(reads, 0);
  assert.equal(semanticId(f.history), before);
});

test("later functional replacement does not turn historical closure into current truth maintenance", () => {
  const f = fixture(), first = settleHistory(f.history, f.rules);
  const revised = tell(first.history,
    { subject: "actor", predicate: "health", object: 100 }, { source: "later-health-observation" });
  assert.equal(Rules.antecedentHolds(f.rules[0], WorldHistory.queryHistory(revised, {})), false);
  const later = settleHistory(revised, f.rules);
  assert.equal(later.history, revised);
  assert.deepEqual(later.added, []);
  same(WorldHistory.historySection(later.history, "actor", "condition")[0].for,
    [Rules.derivation(f.rules[0])]);
  assert.equal(settlementAdmits(first.settlement).admitted, true);
});

test("a second copy of the same original SignCraft refuses only when World closure is selected", async t => {
  const directory = await mkdtemp(join(tmpdir(), "moose-world-supplier-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const selectedRoot = dirname(fromSigncraft.resolve("@red-cup-engineering/signcraft/package.json"));
  const duplicateRoot = join(directory, "original-signcraft-copy");
  const consumerRoot = join(directory, "consumer");
  const scope = join(consumerRoot, "node_modules", "@red-cup-engineering");
  await mkdir(duplicateRoot, { recursive: true });
  await mkdir(scope, { recursive: true });
  await copyFile(join(selectedRoot, "package.json"), join(duplicateRoot, "package.json"));
  await cp(join(selectedRoot, "src"), join(duplicateRoot, "src"), { recursive: true });
  const manifest = JSON.parse(await readFile(join(selectedRoot, "package.json"), "utf8"));
  for (const name of Object.keys(manifest.dependencies)) {
    const destination = join(duplicateRoot, "node_modules", name);
    const installedPackage = dirname(fromSigncraft.resolve(name + "/package.json"));
    await mkdir(dirname(destination), { recursive: true });
    await symlink(installedPackage, destination, "dir");
  }
  await symlink(duplicateRoot, join(scope, "signcraft"), "dir");
  await symlink(fileURLToPath(new URL("../src/world-history.mjs", import.meta.url)),
    join(consumerRoot, "world-history.mjs"), "file");
  const boundary = join(consumerRoot, "world-settlement.mjs");
  await copyFile(fileURLToPath(new URL("../src/world-settlement.mjs", import.meta.url)), boundary);
  assert.equal(await readFile(join(duplicateRoot, "src", "history.mjs"), "utf8"),
    await readFile(join(selectedRoot, "src", "history.mjs"), "utf8"), "the second provider is original source, not a mock");
  const isolated = await import(pathToFileURL(boundary).href);
  assert.equal(typeof isolated.settleHistory, "function", "module loading does not reject unrelated operations");
  let reads = 0;
  const untouched = { get kind() { reads += 1; throw new Error("history must remain unread"); } };
  assert.throws(() => isolated.settleHistory(untouched, []), /same original MOOSE and SignCraft history provider/);
  assert.equal(reads, 0, "supplier refusal precedes reading or rebuilding the World");
});
