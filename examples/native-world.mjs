/**
 * A runnable MUD using original SignCraft Things and the original MOOSE kernel.
 * Run: node examples/native-world.mjs [--snapshot /absolute/path/world.json] [--json]
 *
 * This local example owns its actor admissions. A network host must establish
 * its own current identity/session authority before admitting an actor or intent.
 */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { composeThings, deriveComposedThing } from '@red-cup-engineering/signcraft/thing';
import { defineGame } from '@red-cup-engineering/moose/game';
import { admit, createEngine, join, submit } from '@red-cup-engineering/moose/engine';
import { decodeSnapshot, encodeSnapshot } from '@red-cup-engineering/moose/engine-snapshot';
import { historyHeads } from '@red-cup-engineering/moose/world-history';
import {
  createWorld, placeOf, receiveComposedThingWorld, REGION, tell,
} from '@red-cup-engineering/moose/world';

// Use the Utterance producer selected by the original Thing owner. This keeps
// source production on the same SignCell edition as SignCraft's native reader.
const fromSigncraft = createRequire(import.meta.resolve('@red-cup-engineering/signcraft/thing'));
const { utterance } = await import(pathToFileURL(fromSigncraft.resolve('@red-cup-engineering/signcell/utterance')));

function received(result) {
  if (result?.ok !== true) throw new TypeError(`Original Thing admission refused: ${JSON.stringify(result?.refusal)}`);
  return result.value;
}

/** Build real source Things, then retain their received history by identity. */
export async function createNativeWorldExample() {
  const typed = (typeId, name, description) => received(deriveComposedThing({
    typeId,
    source: utterance({ source: 'MOOSE native-world example author' }, { name, description }),
  }));
  const parts = {
    dimension: typed('Dimension', 'Common Ground', 'A Dimension containing two independently named Worlds.'),
    riverWorld: typed('World', 'River World', 'The World of the Inn and Garden.'),
    harborWorld: typed('World', 'Harbor World', 'Another World, even where its coordinates overlap.'),
    inn: typed('Area', 'Inn', 'A lantern rests here. An authored exit leads east to the Garden.'),
    garden: typed('Area', 'Garden', 'A quiet place east of the Inn.'),
    harbor: typed('Area', 'Harbor', 'This Area belongs to the other World.'),
    lantern: typed('Object', 'lantern', 'A portable original Thing, with its own source identity.'),
    harborToken: typed('Object', 'harbor token', 'An Object that belongs to the Harbor World.'),
  };
  const relation = (from, predicate, to, token = {}) => utterance(
    { source: 'MOOSE native-world example relation author', token },
    { subject: parts[from].thing.id, predicate, object: parts[to].thing.id },
  );
  const composed = received(composeThings({
    things: Object.values(parts).map(({ typeId, source }) => ({ typeId, source })),
    relationSources: [
      relation('riverWorld', 'located-in', 'dimension'),
      relation('harborWorld', 'located-in', 'dimension'),
      relation('inn', 'located-in', 'riverWorld'),
      relation('garden', 'located-in', 'riverWorld'),
      relation('harbor', 'located-in', 'harborWorld'),
      relation('lantern', 'located-in', 'inn'),
      relation('harborToken', 'located-in', 'harbor'),
      relation('inn', 'exits-to', 'garden', { direction: 'east' }),
      relation('garden', 'exits-to', 'inn', { direction: 'west' }),
    ],
  }));
  const projected = received(await receiveComposedThingWorld(createWorld(), composed, {
    source: 'MOOSE native-world original Thing reception',
  }));
  const ids = Object.freeze(Object.fromEntries(Object.entries(parts).map(([name, part]) => [name, part.thing.id])));
  const prism = (from, to) => ({
    body: { footprint: [[from, 0], [to, 0], [to, 10], [from, 10]], z: [0, 3] },
  });
  // Geometry is a genuine source observation. Original Area/Object kinds and
  // identities are retained; no legacy rooms or duplicate item registry arise.
  const world = tell(projected.world, [
    { subject: ids.inn, predicate: REGION, object: prism(0, 10) },
    { subject: ids.garden, predicate: REGION, object: prism(10, 20) },
    { subject: ids.harbor, predicate: REGION, object: prism(0, 10) },
  ], { source: 'MOOSE native-world geometry author' });
  const game = defineGame({
    id: 'native-world', name: 'Common Ground', worldSource: 'history',
    start: ids.inn, dimension: ids.dimension,
    capabilities: [], actorAssertions: [{ predicate: 'role', object: 'registered' }],
  });
  const engine = createEngine(game, { world });
  return Object.freeze({ ids, parts, composed, sourceWorld: world, game, engine });
}

/** Execute actual native commands and return their original receipts. */
export async function runNativeWorldExample({ snapshotFile } = {}) {
  const fixture = await createNativeWorldExample();
  const { ids } = fixture;
  let engine = join(fixture.engine, 'alice', { name: 'Alice' });
  engine = join(engine, 'bob', { name: 'Bob' });
  engine = join(engine, 'mei', { name: 'Mei', at: ids.harbor });
  const transcript = [];
  const command = (actor, text, label = text) => {
    const result = admit(submit(engine, { actor, command: text }));
    engine = result.engine;
    transcript.push(Object.freeze({ label, actor, command: text, receipt: result.receipt }));
    return result.receipt;
  };
  const look = command('alice', 'look');

  const competing = admit(submit(submit(engine,
    { actor: 'alice', command: 'take lantern' }),
  { actor: 'bob', command: 'take lantern' }));
  engine = competing.engine;
  transcript.push({ label: 'simultaneous takes', actor: 'alice and bob', command: 'take lantern (same moment)', receipt: competing.receipt });
  if (placeOf(engine.world, ids.lantern) !== ids.inn || competing.receipt.admission.admitted.length !== 0)
    throw new Error('The original conflicting takes must leave the lantern in its Area.');

  // The first round definitively refused both conflicting effects. This is a
  // new admitted intention, not a retry of work with an unknown outcome.
  const take = command('alice', 'take lantern', 'Alice takes after the resolved conflict');
  if (placeOf(engine.world, ids.lantern) !== 'alice') throw new Error('The admitted take did not retain the original Object.');
  command('alice', 'east');
  command('bob', 'go east');
  if (placeOf(engine.world, 'alice') !== ids.garden || placeOf(engine.world, 'bob') !== ids.garden)
    throw new Error('The authored native Area exit did not carry both actors to the Garden.');
  const give = command('alice', 'give lantern to Bob');
  if (placeOf(engine.world, ids.lantern) !== 'bob') throw new Error('The original give did not transfer custody to Bob.');
  const speech = command('bob', 'say The lantern is shared.');
  const drop = command('bob', 'drop lantern');
  if (placeOf(engine.world, ids.lantern) !== ids.garden) throw new Error('The original drop did not retain the Garden location.');

  const pending = submit(engine, { actor: 'bob', command: 'take lantern' });
  const encoded = encodeSnapshot(pending);
  let recoveredBytes = encoded;
  if (snapshotFile !== undefined) {
    await writeFile(snapshotFile, encoded, 'utf8');
    recoveredBytes = await readFile(snapshotFile, 'utf8');
  }
  const restored = decodeSnapshot(recoveredBytes);
  const recovery = admit(restored);
  const settledHeads = historyHeads(recovery.engine.world);
  const emptyReplay = admit(recovery.engine);
  if (placeOf(recovery.engine.world, ids.lantern) !== 'bob'
      || emptyReplay.receipt.intents.length !== 0
      || JSON.stringify(historyHeads(emptyReplay.engine.world)) !== JSON.stringify(settledHeads))
    throw new Error('Snapshot recovery did not settle the retained command exactly once.');
  transcript.push({ label: 'recovered pending take', actor: 'bob', command: 'take lantern (restored queued intention)', receipt: recovery.receipt });
  engine = emptyReplay.engine;
  // The example's file owner commits the native settled snapshot as well. A
  // later reader therefore sees the consumed queue, not the earlier pending one.
  if (snapshotFile !== undefined) await writeFile(snapshotFile, encodeSnapshot(engine), 'utf8');
  return Object.freeze({
    ...fixture, engine, transcript: Object.freeze(transcript),
    receipts: Object.freeze({ look, competing: competing.receipt, take, give, speech, drop, recovery: recovery.receipt, emptyReplay: emptyReplay.receipt }),
    pending, restored, encoded, snapshotFile,
    summary: Object.freeze({
      dimension: ids.dimension, worlds: [ids.riverWorld, ids.harborWorld],
      originalObject: ids.lantern, finalHolder: placeOf(engine.world, ids.lantern),
      actors: engine.actors, tick: engine.tick,
      conflictingTakesAdmitted: competing.receipt.admission.admitted.length,
      recoveredCommands: recovery.receipt.intents.length,
      repeatedCommands: emptyReplay.receipt.intents.length,
      snapshotMedium: snapshotFile === undefined ? 'encoded JSON' : 'filesystem',
      historyHeads: historyHeads(engine.world),
    }),
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let snapshotFile;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--json' && !json) json = true;
    else if (args[index] === '--snapshot' && snapshotFile === undefined && args[index + 1] && !args[index + 1].startsWith('--'))
      snapshotFile = resolve(args[++index]);
    else throw new TypeError('Usage: node examples/native-world.mjs [--snapshot path] [--json]');
  }
  const result = await runNativeWorldExample({ snapshotFile });
  const output = {
    ...result.summary,
    transcript: result.transcript.map(({ label, actor, command, receipt }) => ({
      label, actor, command, events: receipt.events.map(({ to, channel, text }) => ({ to, channel, text })),
    })),
  };
  if (json) console.log(JSON.stringify(output, null, 2));
  else {
    console.log('Common Ground — a native MOOSE World\nRiver World: Inn and Garden. Harbor World: Harbor.');
    for (const turn of output.transcript) {
      console.log(`\n${turn.actor}> ${turn.command}`);
      for (const event of turn.events) console.log(`[${event.to}] ${event.text}`);
    }
    console.log(`\nOriginal lantern: ${output.originalObject}`);
    console.log(`Current holder: ${output.finalHolder}. Recovered commands: ${output.recoveredCommands}; repeated commands: ${output.repeatedCommands}.`);
    console.log(snapshotFile === undefined ? 'Snapshot restored from encoded native JSON.' : `Settled native snapshot saved to ${snapshotFile}`);
  }
}
