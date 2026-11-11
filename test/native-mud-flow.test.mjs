import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import * as OriginalHistory from '@red-cup-engineering/signcraft/history';
import * as History from '@red-cup-engineering/moose/world-history';
import { defineGame } from '@red-cup-engineering/moose/game';
import { admit, createEngine, join, submit } from '@red-cup-engineering/moose/engine';
import { restoreEngine, snapshotEngine } from '@red-cup-engineering/moose/engine-snapshot';
import {
  cells, certainValue, contentsOf, LOCATED_IN, perceive, placeOf, tell, territoryOf,
} from '@red-cup-engineering/moose/world';
import { createNativeWorldExample, runNativeWorldExample } from '../examples/native-world.mjs';

const stepCommand = (engine, actor, command) => admit(submit(engine, { actor, command }));
const texts = receipt => receipt.events.map(event => event.text).join('\n');

async function inhabited() {
  const fixture = await createNativeWorldExample();
  let engine = join(fixture.engine, 'alice', { name: 'Alice' });
  engine = join(engine, 'bob', { name: 'Bob' });
  engine = join(engine, 'mei', { name: 'Mei', at: fixture.ids.harbor });
  return { ...fixture, engine };
}

// An independent source observation enters through the original history owner.
// Restoring through the original snapshot API preserves the admitted actors and
// queue while selecting that actually changed history; no fake engine executes.
function withOpposition(engine, subject, predicate, object) {
  const world = tell(engine.world, { subject, predicate, object, evidence: 'stable' }, {
    source: 'native MUD receiving: independent contrary evidence',
  });
  const cell = cells(world, subject, predicate).find(candidate => JSON.stringify(candidate.object) === JSON.stringify(object));
  assert.ok(cell.for.length > 0 && cell.against.length > 0, 'the original Cell retains both evidence sides');
  assert.equal(certainValue(world, subject, predicate), null, 'opposition is not a certain effect premise');
  return restoreEngine(snapshotEngine(engine, { world }));
}

test('native MUD selects original Dimension/World/Area/Object history without rebuilding legacy rooms', async () => {
  const f = await createNativeWorldExample();
  assert.equal(History.createHistory, OriginalHistory.createHistory);
  assert.equal(History.restoreHistory, OriginalHistory.restoreHistory);
  assert.equal(f.engine.world, f.sourceWorld, 'the original carrier itself is selected');
  assert.equal(f.game.worldSource, 'history');
  assert.equal(Object.keys(f.game.rooms ?? {}).length, 0, 'source selection introduces no dummy rooms');
  for (const id of [f.ids.inn, f.ids.garden, f.ids.harbor]) assert.equal(certainValue(f.engine.world, id, 'kind'), 'area');
  for (const id of [f.ids.lantern, f.ids.harborToken]) assert.equal(certainValue(f.engine.world, id, 'kind'), 'object');
  assert.equal(territoryOf(f.engine.world, f.ids.lantern).world, f.ids.riverWorld);
  assert.equal(territoryOf(f.engine.world, f.ids.harborToken).world, f.ids.harborWorld);
  assert.equal(territoryOf(f.engine.world, f.ids.harborToken).dimension, f.ids.dimension);
  assert.throws(() => createEngine(f.game), /history|source|World/iu);
  const invalid = defineGame({ id: 'wrong-start', name: 'Wrong start', worldSource: 'history', start: f.ids.lantern, dimension: f.ids.dimension });
  assert.throws(() => createEngine(invalid, { world: f.sourceWorld }), /start|Area|place|source/iu);
});

test('native players look, contend for one Object, walk, give, drop and recover one pending command', async t => {
  const directory = await mkdtemp(joinPath(tmpdir(), 'moose-native-mud-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const snapshotFile = joinPath(directory, 'world.json');
  const f = await runNativeWorldExample({ snapshotFile });
  assert.match(texts(f.receipts.look), /Inn/);
  assert.match(texts(f.receipts.look), /lantern/);
  assert.doesNotMatch(texts(f.receipts.look), /harbor token/i);
  assert.equal(f.receipts.competing.intents.length, 2);
  assert.equal(f.receipts.competing.admission.admitted.length, 0, 'the original concurrency owner refuses both competing effects');
  assert.ok(f.receipts.competing.admission.contested.length > 0);
  assert.ok(f.receipts.competing.admission.contested.every(conflict => conflict.witnesses.length > 0));
  assert.deepEqual(f.receipts.competing.events.map(event => event.to).sort(), ['alice', 'bob']);
  assert.match(texts(f.receipts.competing), /conflict/iu);
  assert.match(texts(f.receipts.take), /take.*lantern/iu);
  assert.match(texts(f.receipts.give), /give.*lantern.*Bob/iu);
  assert.match(texts(f.receipts.drop), /drop.*lantern/iu);
  assert.equal(placeOf(f.engine.world, f.ids.lantern), 'bob');
  assert.equal(certainValue(f.engine.world, f.ids.lantern, 'owner'), 'bob');
  assert.equal(certainValue(f.engine.world, f.ids.lantern, 'kind'), 'object');
  assert.equal(placeOf(f.engine.world, 'alice'), f.ids.garden);
  assert.equal(placeOf(f.engine.world, 'bob'), f.ids.garden);
  assert.equal(placeOf(f.engine.world, 'mei'), f.ids.harbor);
  assert.equal(placeOf(f.engine.world, f.ids.harborToken), f.ids.harbor);
  assert.equal(f.engine.tick, 0, 'player admission does not silently advance the heartbeat');
  assert.ok(!perceive(f.engine.world, 'alice').subjects.includes(f.ids.harborToken));
  assert.ok(!f.receipts.speech.events.some(event => event.to === 'mei'), 'speech does not cross overlapping World coordinates');
  assert.ok(f.receipts.speech.events.some(event => event.to === 'alice' && event.text.includes('The lantern is shared.')));
  const stored = JSON.parse(await readFile(snapshotFile, 'utf8'));
  assert.equal(stored.game.worldSource, 'history');
  assert.equal(stored.game.start, f.ids.inn);
  assert.equal(stored.game.dimension, f.ids.dimension);
  assert.equal(JSON.parse(f.encoded).queue.length, 1, 'the pre-recovery file contained the pending intention');
  assert.equal(stored.queue.length, 0, 'the example commits the consumed queue after settlement');
  assert.deepEqual(f.restored.queue, f.pending.queue);
  assert.equal(f.receipts.recovery.intents.length, 1);
  assert.equal(f.receipts.emptyReplay.intents.length, 0);
  assert.equal(f.engine.queue.length, 0);
  assert.deepEqual(f.engine.actors, ['alice', 'bob', 'mei']);
  const afterDiskRestart = admit(restoreEngine(stored));
  assert.equal(afterDiskRestart.receipt.intents.length, 0);
  assert.deepEqual(History.historyHeads(afterDiskRestart.engine.world), History.historyHeads(f.engine.world));
  const final = restoreEngine(JSON.parse(JSON.stringify(snapshotEngine(f.engine))));
  assert.deepEqual(perceive(final.world, 'alice'), perceive(f.engine.world, 'alice'));
  assert.deepEqual(History.historyHeads(final.world), History.historyHeads(f.engine.world));
  assert.equal(placeOf(final.world, f.ids.lantern), 'bob');
});

test('separate native Worlds refuse foreign-object interaction and keep their speech and inventory local', async () => {
  const f = await inhabited();
  const alice = stepCommand(f.engine, 'alice', 'take harbor token');
  assert.equal(placeOf(alice.engine.world, f.ids.harborToken), f.ids.harbor);
  assert.ok(!contentsOf(alice.engine.world, 'alice').includes(f.ids.harborToken));
  assert.match(texts(alice.receipt), /cannot take|do not see/iu);
  const mei = stepCommand(alice.engine, 'mei', 'say Harbor only.');
  assert.ok(mei.receipt.events.some(event => event.to === 'mei' && event.text.includes('Harbor only.')));
  assert.ok(!mei.receipt.events.some(event => ['alice', 'bob'].includes(event.to)));
  assert.throws(() => submit(mei.engine, { actor: 'unadmitted', command: 'take lantern' }), /joined/iu);
});

test('opposed native exit, place and Object kinds do not become movement or take authority', async () => {
  const f = await inhabited();
  const exit = withOpposition(f.engine, f.ids.inn, 'exit:east', f.ids.garden);
  const walking = stepCommand(exit, 'alice', 'east');
  assert.equal(placeOf(walking.engine.world, 'alice'), f.ids.inn);
  const location = withOpposition(f.engine, 'alice', LOCATED_IN, f.ids.inn);
  const takingWithoutPlace = stepCommand(location, 'alice', 'take lantern');
  assert.equal(placeOf(takingWithoutPlace.engine.world, f.ids.lantern), f.ids.inn);
  assert.equal(placeOf(takingWithoutPlace.engine.world, 'alice'), null);
  const kind = withOpposition(f.engine, f.ids.lantern, 'kind', 'object');
  const takingOpposedObject = stepCommand(kind, 'alice', 'take lantern');
  assert.equal(placeOf(takingOpposedObject.engine.world, f.ids.lantern), f.ids.inn);
  const area = withOpposition(f.engine, f.ids.garden, 'kind', 'area');
  const walkingOpposedArea = stepCommand(area, 'alice', 'east');
  assert.equal(placeOf(walkingOpposedArea.engine.world, 'alice'), f.ids.inn);
  assert.throws(() => join(area, 'latecomer', { at: f.ids.garden }), /unknown|contested|Area|place/iu);
});

test('opposed original ownership and explicit voice-role evidence refuse give and speech effects', async () => {
  const f = await inhabited();
  const taken = stepCommand(f.engine, 'alice', 'take lantern').engine;
  assert.equal(placeOf(taken.world, f.ids.lantern), 'alice');
  const owner = withOpposition(taken, f.ids.lantern, 'owner', 'alice');
  const giving = stepCommand(owner, 'alice', 'give lantern to Bob');
  assert.equal(placeOf(giving.engine.world, f.ids.lantern), 'alice');
  assert.equal(certainValue(giving.engine.world, f.ids.lantern, 'owner'), null);
  assert.match(texts(giving.receipt), /belongs|owner|contested|cannot/iu);
  const role = withOpposition(f.engine, 'alice', 'role', 'registered');
  const speech = stepCommand(role, 'alice', 'say This must not be broadcast.');
  assert.ok(!speech.receipt.events.some(event => event.to !== 'alice' && event.text.includes('This must not be broadcast.')));
  assert.ok(!speech.receipt.events.some(event => event.channel === 'say'));
  assert.ok(cells(speech.engine.world, 'alice', 'role').some(cell => cell.for.length && cell.against.length));
});
