import assert from 'node:assert/strict';
import test from 'node:test';
import { cell } from '@red-cup-engineering/knowledge-system-server/signcell';
import { gardenGame } from './fixtures/garden.mjs';
import { defineGame } from '../src/game.mjs';
import { admit, createEngine, join, step, submit, availableActions, routeFor } from '../src/engine.mjs';
import { composeCapabilities, defineCapability } from '../src/capabilities.mjs';
import { defineWorldReadingPolicy, readWorld } from '../src/world-reading.mjs';
import { placeOf, tell, value } from '../src/world.mjs';

// These are the original engine source-edition receiving cases. The separate
// FeltOS perception-frame consumer remains tested by its original owner.

const policy=defineWorldReadingPolicy({id:'test.engine.reading',version:'1',read:({source,edition})=>({cells:[
  ...source.subjects().flatMap(subject=>source.rawCells(subject)).filter(at=>!edition.replaced.some(([s,p])=>at.subject===s&&at.predicate===p)),
  ...edition.cells,
]})});
const edition=(cells=[],replaced=[])=>({cells,replaced});
const projected=(engine,E)=>readWorld(engine.world,{policy,edition:E});
const name=(subject,object)=>cell(subject,'name',object,{for:['edition']});
const queued=(engine,command)=>submit(engine,{actor:'alice',command});
const current=()=>true;

test('core command reads use the selected source edition without changing raw facts',()=>{
  const engine=join(createEngine(gardenGame),'alice');
  const reading=projected(engine,edition([name('garden-gate','Current Gate')],[['garden-gate','name'],['garden-gate','exit:north']]));
  const result=admit(queued(engine,'look'),{reading,isReadingCurrent:current});
  assert.match(result.receipt.events[0].text,/Current Gate/);
  assert.equal(value(result.engine.world,'garden-gate','name'),value(engine.world,'garden-gate','name'));
  assert.ok(!availableActions(engine,'alice',{reading}).some(at=>at.command==='go north'));
  assert.equal(routeFor(engine,'alice','herb-garden',{reading}),null);
});

test('each causal command branch rebinds the edition after actual history effects',()=>{
  let engine=join(createEngine(gardenGame),'alice');
  const reading=projected(engine,edition([name('lantern','current lantern')],[['lantern','name']]));
  engine=queued(queued(engine,'take lantern'),'inventory');
  const result=admit(engine,{reading,isReadingCurrent:current});
  assert.equal(placeOf(result.engine.world,'lantern'),'alice');
  assert.match(result.receipt.events.map(e=>e.text).join('\n'),/You carry: current lantern/);
  assert.equal(placeOf(engine.world,'lantern'),'garden-gate');
});

test('stale source before admission retains queued intent and invokes no handler',()=>{
  let calls=0;
  const game=defineGame({...gardenGame,capabilities:['test.touch']});
  const runtime=composeCapabilities([defineCapability({id:'test.touch',commands:{touch(){calls++;}}})]);
  const engine=queued(join(createEngine(game),'alice'),'touch');
  const reading=projected(engine,edition());
  const result=admit(engine,{runtime,reading,isReadingCurrent:()=>false});
  assert.equal(result.receipt.status,'stale-reading');assert.equal(result.engine,engine);
  assert.equal(result.engine.queue.length,1);assert.deepEqual(result.receipt.events,[]);assert.equal(calls,0);
});

test('source change during proposal derives no committed effects and does not replay handlers',()=>{
  let fresh=true,calls=0;
  const game=defineGame({...gardenGame,capabilities:['test.touch']});
  const runtime=composeCapabilities([defineCapability({id:'test.touch',commands:{touch(ctx){
    calls++;assert.equal(ctx.reading.carrier,ctx.world);fresh=false;
    return {world:tell(ctx.world,{subject:'alice',predicate:'memory',object:'uncommitted'})};
  }}})]);
  const engine=queued(join(createEngine(game),'alice'),'touch'),reading=projected(engine,edition());
  const result=admit(engine,{runtime,reading,isReadingCurrent:()=>fresh});
  assert.equal(result.receipt.status,'stale-reading');assert.equal(result.engine,engine);
  assert.equal(value(result.engine.world,'alice','memory'),null);assert.equal(calls,1);
  assert.equal(result.engine.nextIntent,engine.nextIntent);assert.equal(result.engine.queue[0],engine.queue[0]);
});

test('external source change across awaited caller work is rejected without advancing tick',async()=>{
  const engine=queued(join(createEngine(gardenGame),'alice'),'take lantern'),reading=projected(engine,edition());
  let liveVersion=reading.readingVersion;
  await Promise.resolve().then(()=>{liveVersion='next-edition';});
  const result=step(engine,{reading,isReadingCurrent:R=>R.readingVersion===liveVersion});
  assert.equal(result.receipt.status,'stale-reading');assert.equal(result.engine,engine);assert.equal(result.engine.tick,0);
  assert.equal(placeOf(result.engine.world,'lantern'),'garden-gate');
  assert.throws(()=>admit(engine,{reading}),/current-edition validator/);
});
