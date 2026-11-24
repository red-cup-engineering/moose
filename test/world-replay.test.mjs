import test from 'node:test';
import assert from 'node:assert/strict';
import { closeWorld } from '@red-cup-engineering/moose/predication';
import { createWorld, cells, tell } from '@red-cup-engineering/moose/world';
import { restoreHistory } from '@red-cup-engineering/moose/world-history';
import { decodeCanonical, encodeCanonical, semanticId } from '@red-cup-engineering/semiotic-content-address-system';
import { createIntentLog } from '@red-cup-engineering/moose/world/intent-log';
import { verifyRoomHistory } from '@red-cup-engineering/moose/world/replay';

test('room history owns accepted intents and reproduces its earlier Gaming hashes', async () => {
  const log = createIntentLog('world-seed');
  const move = { tick: 1, seq: 1, actorId: 'player', kind: 'move', args: { direction: 'west' } };
  const accepted = log.append(move);
  for (const copy of [move, accepted, log.all()[0], log.since(0)[0], log.upto(1)[0]]) {
    copy.args.direction = 'east';
  }
  const logHash = '948c022e5d13a12145a96aaaf99c3792f5d3a4474d7fd85b09f0f38a77485ae1';
  const liveStateHash = '037726c3297d075dced946393ffcf2631829337665c79bd283241119fa9b4d5b';
  assert.equal(log.hash(), logHash);
  let room = 'start';
  const result = await verifyRoomHistory({
    seed: log.seed, log: log.all(), totalTicks: 2, liveStateHash,
    subjectsOf: () => ['player'],
    snapOf: id => ({ id, room }),
    runTick(tick, intents) {
      for (const intent of intents) room = intent.args.direction;
      return { dirty: ['player'] };
    },
  });
  assert.equal(result.replayedLogHash, logHash);
  assert.equal(result.replayedStateHash, liveStateHash);
  assert.equal(result.ok, true);
});

test('a World restores the original witness for a byte-valued rule received through canonical CBOR', () => {
  const payload = { bytes: Uint8Array.of(0, 128, 255) };
  const premise = { subject: 'seal', predicate: 'observed', object: payload };
  const conclusion = { subject: 'seal', predicate: 'recognized', object: payload };
  const wire = encodeCanonical({
    kind: 'signchain.rule', name: 'recognize-seal',
    antecedent: [{ cell: premise, atLeast: 'potential' }],
    consequent: { cell: conclusion, reading: 'potential' },
  });
  const received = decodeCanonical(wire);
  const ruleId = semanticId(received);
  const world = tell(createWorld(), premise, { source: 'original observation' });
  const result = closeWorld(world, [received]);
  payload.bytes.fill(9);
  received.consequent.cell.object.bytes.fill(8);

  const restored = restoreHistory(structuredClone(result.world));
  assert.deepEqual(restored.revisions.map(revision => revision.id), result.world.revisions.map(revision => revision.id));
  const [claim] = cells(restored, 'seal', 'recognized');
  assert.equal(result.added.length, 1);
  assert.deepEqual([...claim.object.bytes], [0, 128, 255]);
  assert.ok(claim.for.some(witness => witness.ruleId === ruleId));
  assert.equal(closeWorld(restored, [decodeCanonical(wire)]).world, restored);
});

test('failed room rounds leave no intent and concurrent replay verifies the captured round', async () => {
  const { createRoom } = await import('@red-cup-engineering/moose/world/room');
  let instances = 0;
  const started = Promise.withResolvers(), resume = Promise.withResolvers();
  const room = createRoom({
    id: 'floor',
    validate: input => input,
    world() {
      const replaying = instances++ > 0;
      let count = 0;
      return {
        subjectsOf: () => ['counter'], snapOf: id => ({ id, count }),
        async runTick(tick, intents) {
          if (replaying && tick === 1) { started.resolve(); await resume.promise; }
          for (const intent of intents) {
            if (intent.kind === 'reject') throw new Error('round unavailable');
            count += intent.args.count;
            intent.args.count = 0;
          }
          return { dirty: ['counter'] };
        },
      };
    },
  });
  try {
    await room.ready;
    await assert.rejects(room.admitHost('reject'), /round unavailable/);
    assert.equal(room.tickNow(), 0);
    assert.deepEqual(room.log.all(), []);
    await room.admitHost('add', { count: 2 });
    const firstHash = room.log.hash();
    const checking = room.verify();
    await started.promise;
    await room.admitHost('add', { count: 5 });
    resume.resolve();
    const result = await checking;
    assert.equal(result.ok, true);
    assert.equal(result.tick, 1);
    assert.equal(result.logHash, firstHash);
    assert.equal(result.replayedLogHash, firstHash);
    assert.equal((await room.verify()).ok, true);
    assert.deepEqual(room.log.all().map(record => record.args.count), [2, 5]);
  } finally { resume.resolve(); room.destroy(); }
});

test('HTTP room streams the initial snapshot and accepted action over SSE', async () => {
  const { createServer } = await import('@red-cup-engineering/moose/world/create-server');
  let place = 'entrance';
  const server = createServer({
    subjectsOf: () => ['player'], snapOf: id => ({ id, place }),
    validate: input => input.kind === 'move' ? input : null,
    runTick(_tick, intents) {
      for (const move of intents) place = move.to;
      return { dirty: ['player'] };
    },
  });
  await server.ready;
  const request = (path, init) => server.app.fetch(new Request('http://localhost' + path, init));
  const stream = await request('/events');
  assert.match(stream.headers.get('content-type'), /text\/event-stream/);
  const reader = stream.body.getReader();
  const frame = async () => {
    const text = new TextDecoder().decode((await reader.read()).value);
    assert.match(text, /^data: /);
    return JSON.parse(text.slice(6));
  };
  try {
    assert.deepEqual((await frame()).entities, [{ id: 'player', place: 'entrance' }]);
    const response = await request('/act', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'move', to: 'tables' }) });
    assert.equal(response.status, 204);
    await server.step();
    const delta = await frame();
    assert.equal(delta.tick, 1);
    assert.deepEqual(delta.entities, [{ id: 'player', place: 'tables' }]);
  } finally { await reader.cancel(); }
});

test('verification waits for the whole room projection when entity reads are asynchronous', async () => {
  const { createRoom } = await import('@red-cup-engineering/moose/world/room');
  const held = Promise.withResolvers(), release = Promise.withResolvers();
  let instances = 0;
  const room = createRoom({
    id: 'two-tables', validate: input => input,
    world() {
      const live = instances++ === 0;
      let round = 0;
      return {
        subjectsOf: () => ['left', 'right'],
        async snapOf(id) {
          if (live && round === 1 && id === 'right') { held.resolve(); await release.promise; }
          return { id, round };
        },
        runTick() { round++; return { dirty: ['left', 'right'] }; },
      };
    },
  });
  try {
    await room.ready;
    const round = room.admitHost('advance');
    await held.promise;
    const verifying = room.verify();
    release.resolve();
    await round;
    const result = await verifying;
    assert.equal(result.tick, 1);
    assert.equal(result.ok, true);
    assert.equal(result.logHash, room.log.hash());
  } finally { release.resolve(); room.destroy(); }
});
