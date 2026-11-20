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
