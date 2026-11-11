import assert from 'node:assert/strict';
import test from 'node:test';
import { createNativeWorldExample } from '../examples/native-world.mjs';
import { gardenGame } from './fixtures/garden.mjs';
import { defineGame, evolveGameWorld, instantiateGame } from '../src/game.mjs';
import { admit, createEngine, join, submit } from '../src/engine.mjs';
import { decodeSnapshot, encodeSnapshot, restoreEngine, snapshotEngine, snapshotWorld } from '../src/engine-snapshot.mjs';
import { bindHistoryArchive, captureHistoryOccurrences, checkpointHistory, historyHeads, restoreHistory } from '../src/world-history.mjs';
import { cells, certainValue, placeOf, tell } from '../src/world.mjs';
import { CHARACTER_ALIASES } from '../src/character-aliases.mjs';

test('source-backed selection requires actual original history admission and preserves private archive custody', async () => {
  const { game, sourceWorld } = await createNativeWorldExample();
  assert.throws(() => createEngine(game), /admitted original World/);
  assert.throws(() => instantiateGame(game), /admitted original World/);
  const decoded = JSON.parse(JSON.stringify(snapshotWorld(sourceWorld)));
  assert.throws(() => createEngine(game, { world: decoded }), /original history owner/);
  const restored = restoreHistory(decoded);
  assert.equal(createEngine(game, { world: restored }).world, restored);

  const checkpoint = checkpointHistory(sourceWorld);
  bindHistoryArchive(checkpoint, () => sourceWorld.revisions);
  const frame = captureHistoryOccurrences(checkpoint, { archive: true });
  assert.equal(createEngine(game, { world: checkpoint }).world, checkpoint);
  assert.deepEqual(captureHistoryOccurrences(checkpoint, { archive: true }), frame);
  assert.deepEqual(historyHeads(checkpoint), historyHeads(sourceWorld));

  const corrupted = structuredClone(decoded);
  corrupted.revisions[0].cells[0].object = 'a forged source body';
  assert.throws(() => createEngine(game, { world: corrupted }));
});

test('native selection separates source references from handles and cannot mix in a second content blueprint', async () => {
  const { game, sourceWorld } = await createNativeWorldExample();
  assert.throws(() => defineGame({ ...game, start: 'inn' }), /original content-addressed Thing reference/);
  assert.throws(() => defineGame({ ...game, dimension: 'dimension:native-world' }), /original content-addressed Thing reference/);
  assert.throws(() => defineGame({ ...game, rooms: {} }), /authored World content/);
  assert.throws(() => createEngine(defineGame({ ...game, functionalPredicates: ['absent-schema'] }), { world: sourceWorld }), /not admitted functional predicate/);
  assert.throws(() => join(createEngine(game, { world: sourceWorld }), game.start), /stable lowercase identifier/);
});

test('source policy evolution retains the exact lived World, actors and pending command frontier', async () => {
  const { game, engine: fresh, ids } = await createNativeWorldExample();
  const engine = submit(join(fresh, 'alice'), { actor: 'alice', command: 'go east' });
  const next = defineGame({ ...game, name: 'A new policy edition', readingEdition: { revision: 2 } });
  const world = evolveGameWorld(engine.world, game, next);
  assert.equal(world, engine.world);
  const adopted = Object.freeze({ ...engine, game: next, world });
  const recovered = decodeSnapshot(encodeSnapshot(adopted));
  assert.deepEqual(recovered.actors, engine.actors);
  assert.deepEqual(recovered.queue, engine.queue);
  assert.equal(recovered.nextIntent, engine.nextIntent);
  assert.equal(recovered.game.worldSource, 'history');
  assert.equal(recovered.game.start, ids.inn);
  assert.equal(recovered.game.dimension, ids.dimension);
  const result = admit(recovered);
  assert.equal(placeOf(result.engine.world, 'alice'), ids.garden);
  assert.equal(result.engine.queue.length, 0);
  assert.equal(placeOf(engine.world, 'alice'), ids.inn);
  assert.throws(() => evolveGameWorld(engine.world, game, defineGame({ ...gardenGame, id: game.id })), /replace an original World source/);
});

test('checkpoint recovery retains opposed entrance evidence and pending work without granting execution', async () => {
  const { game, engine: fresh, ids } = await createNativeWorldExample();
  const waiting = submit(join(fresh, 'alice'), { actor: 'alice', command: 'go east' });
  const world = tell(waiting.world, { subject: ids.inn, predicate: 'located-in', object: ids.riverWorld, evidence: 'stable' }, { source: 'opposed entrance witness' });
  const engine = Object.freeze({ ...waiting, world });
  assert.throws(() => createEngine(game, { world }), /certain original Area/);
  const recovered = decodeSnapshot(encodeSnapshot(engine));
  assert.deepEqual(recovered.queue, waiting.queue);
  assert.ok(cells(recovered.world, ids.inn, 'located-in').some(cell => cell.against.length > 0));
  const result = admit(recovered);
  assert.equal(placeOf(result.engine.world, 'alice'), ids.inn);
  assert.match(result.receipt.events.map(event => event.text).join('\n'), /unknown or contested/);
  assert.ok(cells(result.engine.world, ids.inn, 'located-in').some(cell => cell.against.length > 0));

  const badSelection = structuredClone(snapshotEngine(recovered));
  badSelection.game.start = ids.lantern;
  assert.throws(() => restoreEngine(badSelection), /wrong original Thing kind/);
});

test('the original legacy game and pending engine snapshot remain usable', () => {
  let engine = join(createEngine(gardenGame), 'alice');
  engine = admit(submit(engine, { actor: 'alice', command: 'take lantern' })).engine;
  engine = submit(engine, { actor: 'alice', command: 'go north' });
  const restored = decodeSnapshot(encodeSnapshot(engine));
  assert.deepEqual(snapshotEngine(restored), snapshotEngine(engine));
  assert.equal(placeOf(restored.world, 'lantern'), 'alice');
  assert.equal(placeOf(admit(restored).engine.world, 'alice'), 'kitchen-garden');
  const repeated = structuredClone(snapshotEngine(engine));
  repeated.queue.push({ ...repeated.queue[0] });
  assert.throws(() => restoreEngine(repeated), /ordinals must be unique/);
});

test('native character aliases admit their first schema and retain one current book through edits', async () => {
  const { engine: fresh } = await createNativeWorldExample();
  let engine = join(fresh, 'alice');
  assert.equal(engine.world.functionalPredicates.includes(CHARACTER_ALIASES), false);
  for (const [command, revision] of [['alias inspect look', 1], ['alias inspect inventory', 2], ['unalias inspect', 3]]) {
    const result = admit(submit(engine, { actor: 'alice', command }));
    engine = result.engine;
    assert.match(result.receipt.events.map(event => event.text).join('\n'), /Saved character alias|Removed character alias/);
    assert.equal(engine.world.functionalPredicates.includes(CHARACTER_ALIASES), true);
    assert.equal(cells(engine.world, 'alice', CHARACTER_ALIASES).length, 1);
    assert.equal(certainValue(engine.world, 'alice', CHARACTER_ALIASES).revision, revision);
  }
  assert.deepEqual(certainValue(engine.world, 'alice', CHARACTER_ALIASES).aliases, []);
  const restored = decodeSnapshot(encodeSnapshot(engine));
  assert.deepEqual(certainValue(restored.world, 'alice', CHARACTER_ALIASES), certainValue(engine.world, 'alice', CHARACTER_ALIASES));
});

test('alias editing cannot reinterpret existing unqualified or opposed source observations', async () => {
  for (const evidence of ['potential', 'stable']) {
    const { engine: fresh } = await createNativeWorldExample();
    const joined = join(fresh, 'alice');
    const book = { kind: 'feltos.character.alias-book/v1', revision: 7,
      aliases: [{ name: 'inspect', template: 'look' }] };
    const world = tell(joined.world, { subject: 'alice', predicate: CHARACTER_ALIASES, object: book, evidence },
      { source: 'original unqualified alias evidence' });
    const result = admit(submit({ ...joined, world }, { actor: 'alice', command: 'alias inspect inventory' }));
    assert.match(result.receipt.events.map(event => event.text).join('\n'), /schema|unknown or contested/);
    assert.equal(result.engine.world.functionalPredicates.includes(CHARACTER_ALIASES), false);
    assert.deepEqual(cells(result.engine.world, 'alice', CHARACTER_ALIASES), cells(world, 'alice', CHARACTER_ALIASES));
  }
});
