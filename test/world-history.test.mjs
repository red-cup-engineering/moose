import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import WorldCell from '@red-cup-engineering/moose/world-cell';
import * as OriginalHistory from '@red-cup-engineering/signcraft/history';
import * as OriginalThing from '@red-cup-engineering/signcraft/thing';
import * as MooseHistory from '@red-cup-engineering/moose/world-history';
import * as MooseWorld from '@red-cup-engineering/moose/world';
import * as MooseReading from '@red-cup-engineering/moose/world-reading';

// Resolve the declared SignCraft owner from MOOSE, then its own original Cell.
const fromMoose = createRequire(import.meta.resolve('@red-cup-engineering/moose/world-history'));
const historyPath = fromMoose.resolve('@red-cup-engineering/signcraft/history');
const thingPath = fromMoose.resolve('@red-cup-engineering/signcraft/thing');
const CurrentHistory = await import(pathToFileURL(historyPath).href);
const CurrentThing = await import(pathToFileURL(thingPath).href);
const fromCurrentSigncraft = createRequire(historyPath);
const cellPath = fromCurrentSigncraft.resolve('@red-cup-engineering/signcell/cell');
const CurrentCell = await import(pathToFileURL(cellPath).href);
const contentPath = fromCurrentSigncraft.resolve('@red-cup-engineering/signcell/content-address');
const CurrentContent = await import(pathToFileURL(contentPath).href);
const CurrentUtterance = await import(pathToFileURL(fromCurrentSigncraft.resolve('@red-cup-engineering/signcell/utterance')).href);
const { utterance } = CurrentUtterance;
function assertSameExports(received, original, label) {
  assert.deepEqual(Object.keys(received).sort(), Object.keys(original).sort(), `${label}: complete original namespace`);
  for (const key of Object.keys(original)) assert.equal(received[key], original[key], `${label}: original export identity for ${key}`);
}

const yes = result => {
  assert.equal(result.ok, true, JSON.stringify(result.refusal));
  return result.value;
};
const detached = history => OriginalHistory.restoreHistory(structuredClone(OriginalHistory.checkpointHistory(history)));
const occurrencePolicy = MooseReading.defineWorldReadingPolicy({
  id: 'test.moose-original-occurrences', version: '1',
  read: ({ source }) => ({ cells: source.subjects().flatMap(subject =>
    source.rawOccurrences(subject, undefined, { archive: true }).rows.map(row => row.cell)) }),
});

test('MOOSE World and history retain the actual selected SignCraft and SignCell owners', () => {
  const { dependencies } = fromMoose('@red-cup-engineering/moose/package.json');
  const selected = fromMoose('@red-cup-engineering/signcraft/package.json');
  assert.equal(selected.version, dependencies['@red-cup-engineering/signcraft']);
  assert.equal(fromCurrentSigncraft('@red-cup-engineering/signcell/package.json').version,
    selected.dependencies['@red-cup-engineering/signcell']);
  assertSameExports(OriginalHistory, CurrentHistory, 'selected SignCraft history');
  assertSameExports(OriginalThing, CurrentThing, 'selected SignCraft Thing');
  assertSameExports(WorldCell, CurrentCell, 'MOOSE original selected Cell namespace');
  for (const name of ['bytesToHex', 'retainedCarrier', 'semanticBytes', 'semanticId', 'coincides', 'coincidenceKey']) {
    assert.equal(typeof WorldCell[name], 'function', `${name} must be an original content operation`);
    assert.equal(WorldCell[name], CurrentContent[name], `${name} must retain the selected SignCell content owner's identity`);
  }
  const probe = WorldCell.cell('original', 'native-owner', true);
  assert.equal(CurrentHistory.retainHistoryCell(probe), probe);
  assertSameExports(MooseHistory, CurrentHistory, 'MOOSE world history');
  assert.equal(MooseWorld.validateWorld, CurrentHistory.validateHistory);
  assert.equal(MooseWorld.declareFunctional, CurrentHistory.withFunctionalPredicates);
  const world = MooseWorld.createWorld();
  assert.equal(CurrentHistory.restoreHistory(world), world);
  assert.equal(MooseHistory.restoreHistory(world), world);
});

function composedDimension() {
  const typed = (typeId, name, attributes = {}) => yes(OriginalThing.deriveComposedThing({
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
  const composed = yes(OriginalThing.composeThings({
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
  assert.equal(f.composed.kind, 'signcraft.composed-things.v2');
  const statementIds = f.composed.relationalField.statements.map(statement => statement.id);
  const original = MooseWorld.createWorld();
  const source = 'original SignCraft Thing projection';
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
  for (const presentation of f.composed.relationPresentations) {
    const originalCell = presentation.relationCell;
    const [received] = OriginalHistory.historySection(world, originalCell.subject, originalCell.predicate);
    assert.deepEqual(received, originalCell, 'the original relation and both witness lanes survive reception');
    assert.equal(WorldCell.address(received), presentation.relationCellId);
  }
  const [kind] = OriginalHistory.historySection(world, f.inn.thing.id, 'kind');
  assert.equal(kind.for[0].kind, 'moose.thing-projection.v1');
  assert.equal(kind.for[0].predicationCellId, f.inn.predicationCellId);
  assert.deepEqual(kind.for[0].utterance, f.inn.source);
  const [exit] = OriginalHistory.historySection(world, f.inn.thing.id, 'exit:east');
  const originalExit = f.composed.relationalField.statements.find(row => row.statement.predicate === 'exits-to');
  assert.deepEqual(exit.for[0].statement, originalExit, 'the directional projection retains the native statement ID and witness');
  const repeated = yes(await MooseWorld.receiveComposedThingWorld(world, f.composed, { source }));
  assert.equal(repeated.world, world);
  assert.equal(repeated.changed, false);
  assert.equal(repeated.inserted, 0);

  const evidence = MooseWorld.tell(world, [
    { subject: f.pebble.thing.id, predicate: 'rumor', object: 'rain', evidence: 'stable' },
    { subject: f.pebble.thing.id, predicate: 'silence', object: 'unread', evidence: 'absurd' },
  ], { source: 'original evidence on both sides' });
  const event = OriginalHistory.retainHistoryCell({ subject: f.pebble.thing.id,
    predicate: 'heard', object: 'bell', for: [{ source: 'original bell occurrence' }], against: [] });
  const batch = OriginalHistory.observeHistory(evidence, [event, event], { source: 'original bell occurrence' });
  const full = OriginalHistory.observeHistory(batch, [event], { source: 'original bell occurrence' });
  assert.deepEqual(OriginalHistory.historySection(full, f.pebble.thing.id, 'heard'),
    OriginalHistory.historySection(batch, f.pebble.thing.id, 'heard'),
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
  assert.throws(() => OriginalHistory.materializeHistory(compact), /archive/);
  // A real archive may contain later observations; only this checkpoint's ancestry belongs here.
  const future = MooseWorld.tell(full, { subject: 'later', predicate: 'event', object: 'outside this cut' });
  let archiveCalls = 0;
  OriginalHistory.bindHistoryArchive(compact, () => { archiveCalls += 1; return future.revisions; });
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
  assert.deepEqual(reading.carrierHeads, OriginalHistory.historyHeads(full));
  for (let warm = 0; warm < 2; warm += 1) {
    const tracked = MooseHistory.captureHistoryReads(() => reading.section(f.pebble.thing.id, 'heard'));
    assert.deepEqual(tracked.reads, [{}], 'both cold and warm reads retain the native conservative footprint');
    assert.deepEqual(tracked.result, OriginalHistory.historySection(full, f.pebble.thing.id, 'heard'));
  }
  assert.equal(archiveCalls, 1, 'the explicit frame supplies the complete operation reading');
  assert.equal(MooseReading.rebindWorldReading(reading, compact), reading);

  const snapshot = OriginalHistory.materializeHistory(compact);
  assert.deepEqual(snapshot, full);
  assert.equal(MooseWorld.value(snapshot, 'later', 'event'), null);
  const restored = OriginalHistory.restoreHistory(structuredClone(snapshot));
  assert.deepEqual(OriginalHistory.historyHeads(restored), OriginalHistory.historyHeads(full));
  assert.deepEqual(restored.revisions, full.revisions);
  assert.deepEqual(MooseWorld.settledWorld(restored), MooseWorld.settledWorld(full));
  assert.deepEqual(MooseHistory.captureHistoryOccurrences(restored, { archive: true }).rows, originalFrame.rows);
  const evidenceRows = OriginalHistory.historySubjectCells(restored, f.pebble.thing.id);
  const rumor = evidenceRows.find(cell => cell.predicate === 'rumor');
  assert.deepEqual(rumor.for, rumor.against);
  assert.equal(rumor.for[0].source, 'original evidence on both sides');
  const silence = evidenceRows.find(cell => cell.predicate === 'silence');
  assert.deepEqual([silence.for, silence.against], [[], []]);

  const joined = MooseHistory.mergeHistories(restored, OriginalHistory.restoreHistory(structuredClone(snapshot)));
  assert.deepEqual(joined, restored);
  assert.equal(MooseHistory.historySize(joined), MooseHistory.historySize(restored));
  assert.deepEqual(MooseHistory.captureHistoryOccurrences(joined, { archive: true }).rows, originalFrame.rows);
  assert.throws(() => MooseWorld.continueWorld(restored, structuredClone(restored.revisions)), /Duplicate history revision/);
  assert.deepEqual(restored.revisions, snapshot.revisions, 'refused duplicate append preserves the received carrier');
});

test('World projection refuses the retired Thing dialect without recording an observation', async () => {
  const source = structuredClone(composedDimension().composed);
  source.kind = 'signcraft.composed-things.v1';
  const world = MooseWorld.createWorld();
  const refused = await MooseWorld.receiveComposedThingWorld(world, source, { source: 'retired source' });
  assert.equal(refused.ok, false);
  assert.equal(refused.refusal.kind, 'invalid-thing-world-source');
  assert.deepEqual(OriginalHistory.historyHeads(world), []);
});

for (const [name, forge] of [
  ['Thing attributes', source => { source.things[0].thing.attributes.name = 'borrowed identity'; }],
  ['relation Cell witnesses', source => { source.relationPresentations[0].relationCell.for = ['forged witness']; }],
  ['relation statements', source => { source.relationalField.statements[0].statement.object = 'forged target'; }],
]) {
  test(`World projection retains native refusal of forged ${name}`, async () => {
    const source = structuredClone(composedDimension().composed);
    forge(source);
    assert.equal(OriginalThing.readThingSpatialProjection(source).ok, false,
      'the original producer rejects this presentation despite its borrowed IDs');
    const world = MooseWorld.createWorld();
    const refused = await MooseWorld.receiveComposedThingWorld(world, source, { source: 'forged source' });
    assert.equal(refused.ok, false);
    assert.equal(refused.refusal.kind, 'unqualified-thing-spatial-projection');
    assert.deepEqual(OriginalHistory.historyHeads(world), []);
  });
}

test('World projection retains the original carrier before inspecting source fields', async () => {
  const source = structuredClone(composedDimension().composed);
  let accessed = false;
  Object.defineProperty(source, 'things', { get() { accessed = true; return []; } });
  const world = MooseWorld.createWorld();
  const refused = await MooseWorld.receiveComposedThingWorld(world, source, { source: 'accessor source' });
  assert.equal(refused.ok, false);
  assert.equal(refused.refusal.kind, 'invalid-thing-world-source');
  assert.equal(accessed, false);
  assert.deepEqual(OriginalHistory.historyHeads(world), []);
});

test('source monitoring retains the native spatial refusal and its opposing witnesses before any World effect', async () => {
  const f = composedDimension();
  const original = f.composed.relationPresentations.find(row => row.relationCell.predicate === 'exits-to').relationCell;
  const opposed = WorldCell.cell(original.subject, original.predicate, original.object, {
    for: original.for, against: [{ source: 'independent closed-path observation' }],
  });
  const world = MooseWorld.createWorld();
  const received = await MooseWorld.receiveComposedThingWorld(world, f.composed, {
    source: 'monitored source', sourceCells: [opposed],
  });
  assert.equal(received.ok, false);
  assert.equal(received.refusal.cause.kind, 'spatial-source-obstructed');
  assert.deepEqual(received.refusal.cause.obstructions[0].witnessesFor, opposed.for);
  assert.deepEqual(received.refusal.cause.obstructions[0].witnessesAgainst, opposed.against);
  assert.deepEqual(OriginalHistory.historyHeads(world), []);
});

test('native non-spatial opposition joins original relation testimony and survives replay', async () => {
  const f = composedDimension();
  const original = f.composed.relationPresentations.find(row => row.relationCell.predicate === 'part-of').relationCell;
  const contrary = WorldCell.cell(original.subject, original.predicate, original.object, {
    against: [{ source: 'independent disputed work membership' }],
  });
  const options = { source: 'monitored source', sourceCells: [contrary] };
  const received = yes(await MooseWorld.receiveComposedThingWorld(MooseWorld.createWorld(), f.composed, options));
  const [relation] = OriginalHistory.historySection(received.world, original.subject, original.predicate);
  assert.deepEqual(relation, WorldCell.cellSet([original, contrary])[0]);
  assert.equal(WorldCell.knowledgeReading(relation), 'stable');
  assert.equal(MooseWorld.certainValue(received.world, original.subject, original.predicate), null);
  const repeated = yes(await MooseWorld.receiveComposedThingWorld(received.world, f.composed, options));
  assert.equal(repeated.world, received.world);
  assert.equal(repeated.changed, false);
});

test('another original Thing occurrence adds source testimony without replacing prior witnesses or Thing identity', async () => {
  const f = composedDimension();
  const source = 'original source admission';
  const first = yes(await MooseWorld.receiveComposedThingWorld(MooseWorld.createWorld(), f.composed, { source }));
  const nextSource = utterance({ source: 'second original observation' }, f.inn.thing.attributes);
  const repeatedThing = yes(OriginalThing.deriveComposedThing({ typeId: f.inn.typeId, source: nextSource }));
  assert.equal(repeatedThing.thing.id, f.inn.thing.id);
  const composition = yes(OriginalThing.composeThings({
    things: [...f.composed.things.map(({ typeId, source }) => ({ typeId, source })),
      { typeId: f.inn.typeId, source: nextSource }],
    relationSources: f.composed.relationPresentations.map(({ source }) => source),
  }));
  const second = yes(await MooseWorld.receiveComposedThingWorld(first.world, composition, { source }));
  const [before] = OriginalHistory.historySection(first.world, f.inn.thing.id, 'kind');
  const [after] = OriginalHistory.historySection(second.world, f.inn.thing.id, 'kind');
  assert.equal(second.changed, true);
  assert.equal(after.for.length, 2);
  assert.ok(after.for.some(witness => WorldCell.coincides(witness, before.for[0])));
  assert.ok(after.for.some(witness => witness.predicationCellId === repeatedThing.predicationCellId));
  assert.equal(MooseWorld.certainValue(second.world, f.inn.thing.id, 'kind'), 'area');
  assert.equal(yes(await MooseWorld.receiveComposedThingWorld(second.world, composition, { source })).world, second.world);
});

test('opposed location is retained as testimony and cannot become actionable containment', () => {
  const world = MooseWorld.tell(MooseWorld.createWorld(), [
    { subject: 'room-a', predicate: 'kind', object: 'room' },
    { subject: 'alice', predicate: 'located-in', object: 'room-a', evidence: 'stable' },
  ], { source: 'contested location' });
  assert.equal(MooseWorld.value(world, 'alice', 'located-in'), 'room-a', 'support remains inspectable');
  assert.equal(MooseWorld.placeOf(world, 'alice'), null);
  assert.deepEqual(MooseWorld.contentsOf(world, 'room-a'), []);
  assert.equal(MooseWorld.territoryOf(world, 'alice').place, null);
  const [retained] = OriginalHistory.historySection(world, 'alice', 'located-in');
  assert.equal(retained.for.length, 1);
  assert.equal(retained.against.length, 1);
});

test('incomplete and forged archives refuse ancestry while same-carrier visibility changes invalidate the reading', () => {
  const full = MooseWorld.tell(MooseWorld.createWorld(), { subject: 'room', predicate: 'name', object: 'Room' });
  const compact = detached(full);
  let available = false;
  OriginalHistory.bindHistoryArchive(compact, () => available ? full.revisions : []);
  const absentFrame = MooseHistory.captureHistoryOccurrences(compact, { archive: true });
  const absentReading = MooseReading.readWorld(compact, { policy: occurrencePolicy, occurrenceFrame: absentFrame });
  assert.equal(MooseReading.worldReadingOccurrenceFrameIsCurrent(absentReading), true);
  assert.throws(() => OriginalHistory.materializeHistory(compact), /missing/);
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
  OriginalHistory.bindHistoryArchive(compact, () => forged);
  assert.throws(() => OriginalHistory.materializeHistory(compact), /content address/);
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
  const head = OriginalHistory.historyHeads(world);
  bytes.fill(9);
  world.revisions[0].cells[0].object.bytes.fill(8);
  const frame = MooseHistory.captureHistoryOccurrences(world, { archive: true });
  const editionBytes = new Uint8Array([4, 8, 16]);
  const edition = WorldCell.retainedCarrier({ source: 'original byte reading edition', bytes: editionBytes });
  const policy = MooseReading.defineWorldReadingPolicy({
    id: 'test.moose-byte-edition', version: '1',
    read: ({ source, edition }) => {
      const cells = source.rawOccurrences('byte-carrier', 'payload', { archive: true }).rows.map(row => row.cell);
      return { cells, metadata: WorldCell.retainedCarrier({ editionBytes: edition.bytes, cellBytes: cells[0].object.bytes }) };
    },
  });
  const sourceVersion = WorldCell.semanticId(edition);
  const readingVersion = WorldCell.semanticId({ policy: { id: policy.id, version: policy.version }, edition, occurrenceFrame: frame.id });
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
  const restored = OriginalHistory.restoreHistory(structuredClone(OriginalHistory.materializeHistory(world)));
  assert.deepEqual(OriginalHistory.historyHeads(restored), head);
  assert.deepEqual([...OriginalHistory.historySubjectCells(restored, 'byte-carrier')[0].object.bytes], [0, 1, 127, 128, 255]);
});
