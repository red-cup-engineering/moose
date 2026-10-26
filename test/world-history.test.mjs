import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as CairnCell from '@red-cup-engineering/knowledge-system-server/signcell';
import * as CairnHistory from '@red-cup-engineering/knowledge-system-server/history';
import * as CairnThing from '@red-cup-engineering/knowledge-system-server/thing';
import * as MooseHistory from '@red-cup-engineering/moose/world-history';
import * as MooseWorld from '@red-cup-engineering/moose/world';
import * as MooseReading from '@red-cup-engineering/moose/world-reading';

// Resolve the original provider from CAIRN, never from an incidental test-root selection.
const fromCairn = createRequire(import.meta.resolve('@red-cup-engineering/knowledge-system-server/history'));
const historyPath = fromCairn.resolve('@red-cup-engineering/signcraft/history');
const thingPath = fromCairn.resolve('@red-cup-engineering/signcraft/thing');
const CurrentHistory = await import(pathToFileURL(historyPath).href);
const CurrentThing = await import(pathToFileURL(thingPath).href);
const fromCurrentSigncraft = createRequire(historyPath);
const signcraftCellPath = fromCairn.resolve('@red-cup-engineering/signcraft/cell');
const SigncraftCell = await import(pathToFileURL(signcraftCellPath).href);
const historyCellPath = fromCurrentSigncraft.resolve('./cell.mjs');
const HistoryCell = await import(pathToFileURL(historyCellPath).href);
const fromHistoryCell = createRequire(historyCellPath);
const cellPath = fromHistoryCell.resolve('@red-cup-engineering/signcell/cell');
const CurrentCell = await import(pathToFileURL(cellPath).href);
const fromCurrentCell = createRequire(cellPath);
const contentPath = fromCurrentCell.resolve('@red-cup-engineering/semiotic-content-address');
const CurrentContent = await import(pathToFileURL(contentPath).href);
const CurrentUtterance = await import(pathToFileURL(fromCurrentSigncraft.resolve('@red-cup-engineering/signcell/utterance')).href);
const { utterance } = CurrentUtterance;
const selectedManifest = JSON.parse(readFileSync(resolve(dirname(historyPath), '..', 'package.json'), 'utf8'));
function blobOf(path) {
  const bytes = readFileSync(path);
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
function assertSameExports(received, original, label) {
  assert.deepEqual(Object.keys(received).sort(), Object.keys(original).sort(), `${label}: complete original namespace`);
  for (const key of Object.keys(original)) assert.equal(received[key], original[key], `${label}: original export identity for ${key}`);
}

const yes = result => {
  assert.equal(result.ok, true, JSON.stringify(result.refusal));
  return result.value;
};
const detached = history => CairnHistory.restoreHistory(structuredClone(CairnHistory.checkpointHistory(history)));
const occurrencePolicy = MooseReading.defineWorldReadingPolicy({
  id: 'test.moose-original-occurrences', version: '1',
  read: ({ source }) => ({ cells: source.subjects().flatMap(subject =>
    source.rawOccurrences(subject, undefined, { archive: true }).rows.map(row => row.cell)) }),
});

test('MOOSE World and history retain the actual selected CAIRN original supplier', t => {
  assert.equal(selectedManifest.name, '@red-cup-engineering/signcraft');
  assert.equal(selectedManifest.version, '0.6.1-dev.495');
  assert.equal(blobOf(historyPath), 'e7f0a1ff039b50662c11b3018881b20a63c3fd0b');
  assert.equal(blobOf(thingPath), '2bcea3ab88f077829608f6621b19c76135a49082');
  assert.equal(blobOf(signcraftCellPath), '40d7d947430ad944f9baa2172c34cfceb1abdd41');
  t.diagnostic(JSON.stringify({ version: selectedManifest.version, gitHead: selectedManifest.gitHead,
    historyPath, historyBlob: blobOf(historyPath), thingPath, thingBlob: blobOf(thingPath),
    signcraftCellPath, historyCellPath, cellPath, contentPath }));
  assertSameExports(CairnHistory, CurrentHistory, 'CAIRN history');
  assertSameExports(CairnThing, CurrentThing, 'CAIRN Thing');
  assertSameExports(CairnCell, SigncraftCell, 'CAIRN SignCell and selected SignCraft Cell port');
  assertSameExports(SigncraftCell, HistoryCell, 'public Cell port and history-local selected Cell');
  assertSameExports(HistoryCell, {
    ...CurrentCell,
    articulatingUtter: CurrentUtterance.articulatingUtter,
    articulatingPair: CurrentUtterance.articulatingPair,
  }, 'history-selected original SignCell ports');
  for (const name of ['bytesToHex', 'retainedCarrier', 'semanticBytes', 'semanticId', 'coincides', 'coincidenceKey']) {
    assert.equal(typeof CairnCell[name], 'function', `${name} must be an original content operation`);
    assert.equal(CairnCell[name], CurrentContent[name], `${name} must retain the selected SignCell content owner's identity`);
  }
  assertSameExports(MooseHistory, CairnHistory, 'MOOSE world history');
  assert.equal(MooseWorld.validateWorld, CairnHistory.validateHistory);
  assert.equal(MooseWorld.declareFunctional, CairnHistory.withFunctionalPredicates);
  const world = MooseWorld.createWorld();
  assert.equal(CairnHistory.restoreHistory(world), world);
  assert.equal(MooseHistory.restoreHistory(world), world);
});

function composedDimension() {
  const typed = (typeId, name, attributes = {}) => yes(CairnThing.deriveComposedThing({
    typeId, source: utterance({ source: 'original TAB/qtOps receiving' }, { name, ...attributes }),
  }));
  const dimension = typed('Dimension', 'Union Dimension');
  const world = typed('World', 'Teraum');
  const secondWorld = typed('World', 'Archipelago');
  const inn = typed('Area', 'Crossed Candles Inn', { description: 'An authored meeting place.' });
  const garden = typed('Area', 'Garden');
  const harbor = typed('Area', 'Harbor');
  const pebble = typed('Object', 'pebble');
  const boat = typed('Object', 'boat');
  const work = typed('Work', 'Repair a boat');
  const task = typed('Task', 'Inspect rope');
  const parts = [dimension, world, secondWorld, inn, garden, harbor, pebble, boat, work, task];
  const relation = (from, predicate, to, token = {}) => utterance(
    { source: 'original relation author', token },
    { subject: from.thing.id, predicate, object: to.thing.id });
  const composed = yes(CairnThing.composeThings({
    things: parts.map(({ typeId, source }) => ({ typeId, source })),
    relationSources: [
      relation(world, 'located-in', dimension),
      relation(secondWorld, 'located-in', dimension),
      relation(inn, 'located-in', world),
      relation(garden, 'located-in', world),
      relation(harbor, 'located-in', secondWorld),
      relation(pebble, 'located-in', inn),
      relation(boat, 'located-in', harbor),
      relation(inn, 'exits-to', garden, { direction: 'east' }),
      relation(task, 'part-of', work),
    ],
  }));
  return { composed, dimension, world, secondWorld, inn, garden, harbor, pebble, boat, work, task };
}

test('original Thing composition, native archive and occurrence reading compose without another history owner', async () => {
  const f = composedDimension();
  const statementIds = f.composed.relationalField.statements.map(statement => statement.id);
  const original = MooseWorld.createWorld();
  const source = 'original CAIRN Thing projection';
  // Deliberately use the ordinary dynamic supplier, without injected Thing operations.
  const projected = yes(await MooseWorld.receiveComposedThingWorld(original, f.composed, { source }));
  assert.equal(projected.authority, 'not-conferred');
  assert.equal(projected.movement, 'not-performed');
  assert.equal(projected.changed, true);
  assert.ok(projected.inserted > 0);
  const world = projected.world;
  assert.equal(world.kind, 'signcraft.history');
  assert.equal(MooseWorld.value(world, f.dimension.thing.id, 'kind'), 'dimension');
  assert.equal(MooseWorld.value(world, f.world.thing.id, 'kind'), 'world');
  assert.equal(MooseWorld.value(world, f.secondWorld.thing.id, 'kind'), 'world');
  assert.equal(MooseWorld.value(world, f.inn.thing.id, 'kind'), 'area');
  assert.equal(MooseWorld.value(world, f.task.thing.id, 'kind'), 'task');
  assert.equal(MooseWorld.value(world, f.task.thing.id, 'part-of'), f.work.thing.id);
  assert.deepEqual(MooseWorld.territoryOf(world, f.pebble.thing.id).path,
    [f.inn.thing.id, f.world.thing.id, f.dimension.thing.id]);
  assert.deepEqual(MooseWorld.territoryOf(world, f.boat.thing.id).path,
    [f.harbor.thing.id, f.secondWorld.thing.id, f.dimension.thing.id]);
  assert.deepEqual(MooseWorld.exitsOf(world, f.inn.thing.id),
    [{ direction: 'east', destination: f.garden.thing.id }]);
  assert.deepEqual(MooseWorld.contentsOf(world, f.inn.thing.id), [f.pebble.thing.id]);
  assert.equal(MooseWorld.value(original, f.inn.thing.id, 'kind'), null);
  assert.deepEqual(f.composed.relationalField.statements.map(statement => statement.id), statementIds);
  assert.equal(world.revisions.length, 1);
  world.revisions[0].cells.forEach((cell, position) => {
    assert.deepEqual(cell.for, [{ source, parents: [], position }]);
    assert.deepEqual(cell.against, []);
  });
  const repeated = yes(await MooseWorld.receiveComposedThingWorld(world, f.composed, { source }));
  assert.equal(repeated.world, world);
  assert.equal(repeated.changed, false);
  assert.equal(repeated.inserted, 0);

  const evidence = MooseWorld.tell(world, [
    { subject: f.pebble.thing.id, predicate: 'rumor', object: 'rain', evidence: 'stable' },
    { subject: f.pebble.thing.id, predicate: 'silence', object: 'unread', evidence: 'absurd' },
  ], { source: 'original evidence on both sides' });
  const event = CairnHistory.retainHistoryCell({ subject: f.pebble.thing.id,
    predicate: 'heard', object: 'bell', for: [{ source: 'original bell occurrence' }], against: [] });
  const batch = CairnHistory.observeHistory(evidence, [event, event], { source: 'original bell occurrence' });
  const full = CairnHistory.observeHistory(batch, [event], { source: 'original bell occurrence' });
  assert.deepEqual(CairnHistory.historySection(full, f.pebble.thing.id, 'heard'),
    CairnHistory.historySection(batch, f.pebble.thing.id, 'heard'),
    'settled evidence stays equal while addressed occurrences remain distinct');
  const originalFrame = MooseHistory.captureHistoryOccurrences(full, { archive: true });
  const occurrences = MooseHistory.readCapturedHistoryOccurrences(originalFrame, f.pebble.thing.id, 'heard');
  assert.deepEqual(occurrences.rows.map(row => row.occurrence), [
    { revisionId: batch.revisions.at(-1).id, cellIndex: 0 },
    { revisionId: batch.revisions.at(-1).id, cellIndex: 1 },
    { revisionId: full.revisions.at(-1).id, cellIndex: 0 },
  ]);

  const compact = detached(full);
  assert.equal(compact.revisions.length, 0);
  const unavailable = MooseHistory.captureHistoryOccurrences(compact, { archive: true });
  assert.ok(unavailable.unresolved.length > 0);
  assert.ok(unavailable.rows.every(row => row.occurrence === null));
  assert.throws(() => CairnHistory.materializeHistory(compact), /archive/);
  // A real archive may contain later observations; only this checkpoint's ancestry belongs here.
  const future = MooseWorld.tell(full, { subject: 'later', predicate: 'event', object: 'outside this cut' });
  let archiveCalls = 0;
  CairnHistory.bindHistoryArchive(compact, () => { archiveCalls += 1; return future.revisions; });
  const captured = MooseHistory.captureHistoryOccurrences(compact, { archive: true });
  assert.equal(archiveCalls, 1);
  assert.deepEqual(captured.unresolved, []);
  assert.deepEqual(captured.rows, originalFrame.rows);
  assert.equal(MooseHistory.isHistoryOccurrenceFrameFor(captured, compact), true);
  const reading = MooseReading.readWorld(compact, {
    policy: occurrencePolicy, edition: { source: 'original authored edition', version: 1 }, occurrenceFrame: captured,
  });
  assert.equal(MooseReading.carrierOfWorldReading(reading), compact);
  assert.equal(reading.occurrenceVersion, captured.id);
  assert.deepEqual(reading.carrierHeads, CairnHistory.historyHeads(full));
  for (let warm = 0; warm < 2; warm += 1) {
    const tracked = MooseHistory.captureHistoryReads(() => reading.section(f.pebble.thing.id, 'heard'));
    assert.deepEqual(tracked.reads, [{}], 'both cold and warm reads retain the native conservative footprint');
    assert.deepEqual(tracked.result, CairnHistory.historySection(full, f.pebble.thing.id, 'heard'));
  }
  assert.equal(archiveCalls, 1, 'the explicit frame supplies the complete operation reading');
  assert.equal(MooseReading.rebindWorldReading(reading, compact), reading);

  const snapshot = CairnHistory.materializeHistory(compact);
  assert.deepEqual(snapshot, full);
  assert.equal(MooseWorld.value(snapshot, 'later', 'event'), null);
  const restored = CairnHistory.restoreHistory(structuredClone(snapshot));
  assert.deepEqual(CairnHistory.historyHeads(restored), CairnHistory.historyHeads(full));
  assert.deepEqual(restored.revisions, full.revisions);
  assert.deepEqual(MooseWorld.settledWorld(restored), MooseWorld.settledWorld(full));
  assert.deepEqual(MooseHistory.captureHistoryOccurrences(restored, { archive: true }).rows, originalFrame.rows);
  const evidenceRows = CairnHistory.historySubjectCells(restored, f.pebble.thing.id);
  const rumor = evidenceRows.find(cell => cell.predicate === 'rumor');
  assert.deepEqual(rumor.for, rumor.against);
  assert.equal(rumor.for[0].source, 'original evidence on both sides');
  const silence = evidenceRows.find(cell => cell.predicate === 'silence');
  assert.deepEqual([silence.for, silence.against], [[], []]);

  const joined = MooseHistory.mergeHistories(restored, CairnHistory.restoreHistory(structuredClone(snapshot)));
  assert.deepEqual(joined, restored);
  assert.equal(MooseHistory.historySize(joined), MooseHistory.historySize(restored));
  assert.deepEqual(MooseHistory.captureHistoryOccurrences(joined, { archive: true }).rows, originalFrame.rows);
  assert.throws(() => MooseWorld.continueWorld(restored, structuredClone(restored.revisions)), /Duplicate history revision/);
  assert.deepEqual(restored.revisions, snapshot.revisions, 'refused duplicate append preserves the received carrier');
});

test('incomplete and forged archives refuse ancestry while same-carrier visibility changes invalidate the reading', () => {
  const full = MooseWorld.tell(MooseWorld.createWorld(), { subject: 'room', predicate: 'name', object: 'Room' });
  const compact = detached(full);
  let available = false;
  CairnHistory.bindHistoryArchive(compact, () => available ? full.revisions : []);
  const absentFrame = MooseHistory.captureHistoryOccurrences(compact, { archive: true });
  const absentReading = MooseReading.readWorld(compact, { policy: occurrencePolicy, occurrenceFrame: absentFrame });
  assert.equal(MooseReading.worldReadingOccurrenceFrameIsCurrent(absentReading), true);
  assert.throws(() => CairnHistory.materializeHistory(compact), /missing/);
  assert.equal(absentFrame.rows[0].occurrence, null);
  available = true;
  assert.equal(MooseReading.rebindWorldReading(absentReading, compact), absentReading);
  assert.equal(MooseReading.worldReadingOccurrenceFrameIsCurrent(absentReading), false);
  const presentFrame = MooseHistory.captureHistoryOccurrences(compact, { archive: true });
  const presentReading = MooseReading.readWorld(compact, { policy: occurrencePolicy, occurrenceFrame: presentFrame });
  assert.equal(MooseReading.worldReadingOccurrenceFrameIsCurrent(presentReading), true);
  available = false;
  assert.equal(MooseReading.worldReadingOccurrenceFrameIsCurrent(presentReading), false);
  const forged = structuredClone(full.revisions);
  forged[0].cells[0].object = 'forged Room';
  CairnHistory.bindHistoryArchive(compact, () => forged);
  assert.throws(() => CairnHistory.materializeHistory(compact), /content address/);
  const refused = MooseHistory.captureHistoryOccurrences(compact, { archive: true });
  assert.ok(refused.unresolved.length > 0);
  assert.equal(refused.rows[0].occurrence, null);
  assert.throws(() => MooseReading.readWorld(compact, { occurrenceFrame: { ...presentFrame } }), /exact admitted carrier/);
  assert.throws(() => MooseReading.readWorld(detached(full), { occurrenceFrame: presentFrame }), /exact admitted carrier/);
});

test('World tell and reading retain private byte content across the actual relocated lower suppliers', () => {
  const bytes = new Uint8Array([0, 1, 127, 128, 255]);
  const world = MooseWorld.tell(MooseWorld.createWorld(), {
    subject: 'byte-carrier', predicate: 'payload', object: { bytes },
  }, { source: 'original World cell producer' });
  const head = CairnHistory.historyHeads(world);
  bytes.fill(9);
  world.revisions[0].cells[0].object.bytes.fill(8);
  const frame = MooseHistory.captureHistoryOccurrences(world, { archive: true });
  const editionBytes = new Uint8Array([4, 8, 16]);
  const edition = CairnCell.retainedCarrier({ source: 'original byte reading edition', bytes: editionBytes });
  const policy = MooseReading.defineWorldReadingPolicy({
    id: 'test.moose-byte-edition', version: '1',
    read: ({ source, edition }) => {
      const cells = source.rawOccurrences('byte-carrier', 'payload', { archive: true }).rows.map(row => row.cell);
      return { cells, metadata: CairnCell.retainedCarrier({ editionBytes: edition.bytes, cellBytes: cells[0].object.bytes }) };
    },
  });
  const sourceVersion = CairnCell.semanticId(edition);
  const readingVersion = CairnCell.semanticId({ policy: { id: policy.id, version: policy.version }, edition, occurrenceFrame: frame.id });
  const reading = MooseReading.readWorld(world, { policy, edition, occurrenceFrame: frame });
  editionBytes.fill(6);
  edition.bytes.fill(5);
  assert.equal(reading.sourceVersion, sourceVersion);
  assert.equal(reading.readingVersion, readingVersion);
  const read = reading.section('byte-carrier', 'payload')[0];
  assert.deepEqual([...read.object.bytes], [0, 1, 127, 128, 255]);
  read.object.bytes.fill(7);
  assert.deepEqual([...reading.section('byte-carrier', 'payload')[0].object.bytes], [0, 1, 127, 128, 255]);
  const metadata = reading.metadata();
  assert.deepEqual([...metadata.editionBytes], [4, 8, 16]);
  assert.deepEqual([...metadata.cellBytes], [0, 1, 127, 128, 255]);
  metadata.editionBytes.fill(3);
  metadata.cellBytes.fill(2);
  assert.deepEqual([...reading.metadata().editionBytes], [4, 8, 16]);
  assert.deepEqual([...reading.metadata().cellBytes], [0, 1, 127, 128, 255]);
  assert.equal(reading.sourceVersion, sourceVersion);
  assert.equal(reading.readingVersion, readingVersion);
  const restored = CairnHistory.restoreHistory(structuredClone(CairnHistory.materializeHistory(world)));
  assert.deepEqual(CairnHistory.historyHeads(restored), head);
  assert.deepEqual([...CairnHistory.historySubjectCells(restored, 'byte-carrier')[0].object.bytes], [0, 1, 127, 128, 255]);
});
