import assert from 'node:assert/strict';
import test from 'node:test';
import { createEngine, join, step, submit } from '@red-cup-engineering/feltos/engine';
import { worldPose, tell } from '@red-cup-engineering/feltos/world';
import * as HostedGeometry from '@red-cup-engineering/feltos/geometry';
import * as MooseGeometry from '../feltos/node_modules/@red-cup-engineering/moose/src/geometry.mjs';
import { FARSTONE_GAME, FARSTONE_RUNTIME } from './src/farstone-game.mjs';
import { perceptionFrame } from './src/farstone-perception.mjs';
import { moverOf, predictFrame } from './src/web/farstone-motion.mjs';

const actor='moose-receiving';
const tick=(engine,command)=>step(submit(engine,{actor,command}),{runtime:FARSTONE_RUNTIME}).engine;
test('Farstone and FeltOS share the exact MOOSE geometry function objects',()=>{
 for(const name of ['parseTarget','stepInPlane','nearestCompass']) assert.equal(HostedGeometry[name],MooseGeometry[name]);
});
test('malformed inherited-property movement neither corrupts Farstone prediction nor moves its authoritative actor',()=>{
 let engine=join(createEngine(FARSTONE_GAME),actor);
 const before=worldPose(engine.world,actor);
 const frame=perceptionFrame(engine.world,actor,0);
 assert.deepEqual(moverOf(frame).pose,before);
 for(const command of ['walk constructor 6','walk __proto__ 6','walk north Infinity']){
  assert.equal(predictFrame(frame,'command',{command}),frame,command);
  const next=tick(engine,command);
  assert.deepEqual(worldPose(next.world,actor),before,command);
  assert.ok(worldPose(next.world,actor).position.every(Number.isFinite));
  engine=next;
 }
});
test('zero pace preserves the same position and heading in authoritative movement and prediction',()=>{
 let engine=join(createEngine(FARSTONE_GAME),actor);
 engine={...engine,world:tell(engine.world,[{subject:actor,predicate:'pace',object:0}])};
 const before=worldPose(engine.world,actor),frame=perceptionFrame(engine.world,actor,0);
 const command=`walk ${before.position[0]+10} ${before.position[1]}`;
 const predicted=moverOf(predictFrame(frame,'command',{command})).pose;
 assert.deepEqual(predicted,before);
 assert.deepEqual(worldPose(tick(engine,command).world,actor),predicted);
});
