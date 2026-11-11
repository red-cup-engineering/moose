import assert from 'node:assert/strict';
import test from 'node:test';
import {gardenGame} from './fixtures/garden.mjs';
import {defineGame} from '../src/game.mjs';
import {createEngine,join,submit,admit} from '../src/engine.mjs';
import {defineCapability,composeCapabilities} from '../src/capabilities.mjs';
import {readWorld,defineWorldReadingPolicy} from '../src/world-reading.mjs';
import {tell,value} from '../src/world.mjs';
import {checkpointHistory,restoreHistory,bindHistoryArchive,captureHistoryOccurrences} from '@red-cup-engineering/moose/world-history';
const game=defineGame({...gardenGame,capabilities:['test.frames']});
const policy=defineWorldReadingPolicy({id:'test.operation-frames',version:'1',read:({source})=>({cells:source.subjects().flatMap(s=>source.rawOccurrences(s,undefined,{archive:true}).rows.map(r=>r.cell))})});
const bind=H=>readWorld(H,{policy,edition:{v:1},occurrenceFrame:captureHistoryOccurrences(H,{archive:true})});
const cut=H=>restoreHistory({...checkpointHistory(H),revisions:[]});
function fixture(change){
 let available=true,visits=0;
 const runtime=composeCapabilities([defineCapability({id:'test.frames',commands:{
  first:ctx=>{
   const full=tell(ctx.world,{subject:'fixture',predicate:'name',object:'written'}),branch=cut(ctx.world);
   bindHistoryArchive(branch,()=>available?ctx.world.revisions:[]);
   const next=tell(branch,{subject:'fixture',predicate:'name',object:'written'});
   bindHistoryArchive(next,()=>available?full.revisions:[]);
   return {world:next};
  },second:ctx=>{visits++;assert.equal(value(ctx.reading,'fixture','name'),'written');if(change)available=false;return {packages:[{to:ctx.actor,name:'Test.Frame',data:{ok:true}}]};}
 }})]);
 const engine=submit(submit(join(createEngine(game),'alice'),{actor:'alice',command:'first'}),{actor:'alice',command:'second'});
 return {engine,runtime,reading:bind(engine.world),visits:()=>visits};
}

test('late archive change on a consulted rebound branch refuses the whole uncommitted operation',()=>{
 const f=fixture(true),result=admit(f.engine,{runtime:f.runtime,reading:f.reading,isReadingCurrent:()=>true});
 assert.equal(result.receipt.status,'stale-reading');assert.equal(result.engine,f.engine);assert.equal(result.engine.queue.length,2);assert.equal(f.visits(),1);assert.deepEqual(result.receipt.events,[]);assert.ok(!Object.hasOwn(result.receipt,'packages'));
});

test('unchanged consulted branch commits once without confusing frame change with external edition change',()=>{
 const f=fixture(false),result=admit(f.engine,{runtime:f.runtime,reading:f.reading,isReadingCurrent:R=>R.sourceVersion===f.reading.sourceVersion&&R.policy.version===f.reading.policy.version});
 assert.equal(result.receipt.kind,'feltos.admission-receipt.v1');assert.equal(result.engine.queue.length,0);assert.equal(f.visits(),1);assert.equal(result.receipt.packages.length,1);assert.equal(value(result.engine.world,'fixture','name'),'written');
});

test('archive observation change before execution preserves pending intent without invoking handlers',()=>{
 let calls=0;const started=join(createEngine(game),'alice'),H=cut(started.world),engine=submit({...started,world:H},{actor:'alice',command:'read'}),reading=bind(H);
 const runtime=composeCapabilities([defineCapability({id:'test.frames',commands:{read:()=>{calls++;return {};}}})]);
 bindHistoryArchive(H,()=>started.world.revisions);
 const result=admit(engine,{runtime,reading,isReadingCurrent:()=>true});assert.equal(result.engine,engine);assert.equal(result.receipt.status,'stale-reading');assert.equal(calls,0);
});
