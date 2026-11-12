import { canonical } from '@red-cup-engineering/json-services-section';
import { sidesOfReading } from '@red-cup-engineering/metrologic/four';
import Cell from './world-cell.mjs';
import {sha256Bytes} from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-sha256';
import {registeredAccountForActor} from './identity-roles.mjs';
import { parseNiUri } from '@red-cup-engineering/uri-services-section/ni-uri';
import { cells, settleSubject, placeOf, certainValue, territoryOf } from './world.mjs';
import { gamePlaceIsCurrent } from './game-world.mjs';

const { address } = Cell;

const record = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const identifier = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const certain = (cell) => { const [forIt,againstIt]=sidesOfReading(cell.evidence);return forIt&&!againstIt; };
const freeze = (x) => Object.freeze(x);
const utf8 = new TextEncoder();
const areaReference = value => {
 if(typeof value!=='string')return false;
 if(identifier.test(value))return true;
 try{parseNiUri({uri:value});return true;}catch{return false;}
};

/** A bounded, data-authored prerequisite. Missing or contested evidence never supplies a grant. */
export function defineRequirements(source={}) {
 if(!record(source)||Object.keys(source).some(k=>!['skills','claims','areas'].includes(k)))throw new TypeError('action requirements are skills, claims and areas');
 const skills=source.skills??{};
 if(!record(skills)||Object.entries(skills).some(([k,v])=>!identifier.test(k)||!Number.isFinite(v)||v<0||v>100))throw new TypeError('required skill levels must be within 0..100');
 const claims=source.claims??[];
 if(!Array.isArray(claims)||claims.some(c=>!record(c)||Object.keys(c).some(k=>!['on','predicate','object'].includes(k))||!['actor','place','world'].includes(c.on??'actor')||typeof c.predicate!=='string'||!c.predicate||c.object===undefined))throw new TypeError('action claims require on, predicate and object');
 const areas=source.areas??[];
 if(!Array.isArray(areas)||areas.some(x=>!areaReference(x)))throw new TypeError('action areas must be local identifiers or original Thing references');
 return freeze({skills:freeze({...skills}),claims:freeze(claims.map(c=>freeze({on:c.on??'actor',predicate:c.predicate,object:JSON.parse(canonical(c.object))}))),areas:freeze([...new Set(areas)])});
}

export function defineAction(source) {
 if(!record(source)||Object.keys(source).some(k=>!['verb','capability','remote','description','requires'].includes(k))||typeof source.verb!=='string'||!/^[a-z][a-z0-9-]*$/u.test(source.verb)||typeof source.description!=='string'||!source.description)throw new TypeError('world action requires verb and description');
 if((source.capability!==undefined)===(source.remote!==undefined))throw new TypeError('world action needs exactly one local capability or remote actor operation');
 let body;
 if(source.remote!==undefined){
  const r=source.remote;
  if(!record(r)||Object.keys(r).some(k=>!['actor','operation','verb'].includes(k))||typeof r.actor!=='string'||!r.actor.trim()||/\s/u.test(r.actor)||typeof r.verb!=='string'||!/^[a-z][a-z0-9-]*$/u.test(r.verb))throw new TypeError('remote action needs actor, operation address and verb');
  parseNiUri({uri:r.operation});
  body={remote:freeze({actor:r.actor,operation:r.operation,verb:r.verb})};
 }else{
  if(typeof source.capability!=='string'||!identifier.test(source.capability))throw new TypeError('local action needs a capability identifier');
  body={capability:source.capability};
 }
 return freeze({verb:source.verb,...body,description:source.description,requires:defineRequirements(source.requires)});
}

export const actionPredicate=action=>`offers-action:${action.verb}:${action.capability??'remote:'+sha256Bytes(utf8.encode(canonical(action.remote)))}`;

/** The very same read runs at discovery and immediately before each effect. */
export function requirementFailures(world,actor,requirements={}, {place}={}) {
 const failures=[],where=territoryOf(world,place??actor),at={actor,place:place??placeOf(world,actor),world:where.world};
 for(const [skill,minimum] of Object.entries(requirements.skills??{})){
  const held=cells(world,actor,`skill:${skill}`);
  const level=held.length===0?0:held.length===1&&certain(held[0])&&Number.isFinite(held[0].object)?held[0].object:null;
  if(level===null||level<minimum)failures.push(`requires ${skill} ${minimum}${level===null?' (current level contested or unknown)':''}`);
 }
 for(const claim of requirements.claims??[]){
  const matches=at[claim.on??'actor']?cells(world,at[claim.on??'actor'],claim.predicate).filter(c=>canonical(c.object)===canonical(claim.object)):[];
  if(matches.length!==1||!certain(matches[0]))failures.push(`requires ${claim.on??'actor'} ${claim.predicate}=${canonical(claim.object)}`);
 }
 if(requirements.areas?.length&&!requirements.areas.some(area=>where.path.includes(area)))failures.push(`requires area ${requirements.areas.join(' or ')}`);
 return freeze(failures);
}

/** Methods are read from the inhabited world's native cells. Runtime functions supply bodies. */
/** Only a source-owned same-verb set may participate in one command's choice.
 * A filtered read is advisory until its underlying exact World/Office effect is
 * admitted; 'verb' narrows possibilities and NEVER adds a method or grant.
 * Default omitted verb retains the original full player/agent discovery API. */
export function worldMethods(engine,actor,runtime,{place,reading=engine.world,verb}={}) {
 if(verb!==undefined && (typeof verb!=='string'||!/^[a-z][a-z0-9-]*$/u.test(verb)))
  throw new TypeError('world method selection requires a canonical single verb');
 if(engine.game.worldSource==='history' && !gamePlaceIsCurrent(engine.game,reading,place??placeOf(reading,actor)))return freeze([]);
 const where=territoryOf(reading,place??actor),owner=where.world;
 if(!owner)return freeze([]);
 const policy=certainValue(reading,owner,'action-policy');
 let offered;
 if(policy==='authored'){
  const prefix=verb===undefined?'offers-action:':`offers-action:${verb}:`;
  offered=settleSubject(reading,owner)
    .filter(c=>c.predicate.startsWith(prefix)&&c.object!==null&&certain(c))
    .map(c=>({...c.object,ref:address({subject:owner,predicate:c.predicate,object:c.object})}));
 }else if(policy==='runtime')offered=runtime.capabilities.filter(c=>engine.game.capabilities.includes(c.id))
   .flatMap(c=>Object.keys(c.commands).filter(method=>verb===undefined||method===verb)
     .map(method=>({verb:method,capability:c.id,description:`${method} — ${c.id}`,requires:{}})));
 else return freeze([]);
 const candidates=offered.filter(action=>(verb===undefined||action.verb===verb)
   && (action.remote!==undefined||(engine.game.capabilities.includes(action.capability)&&runtime.command(action.verb,action.capability)!==null)))
   .map(action=>freeze({...action,world:owner,failures:freeze([...requirementFailures(reading,actor,action.requires,{place}),...(action.remote&&!registeredAccountForActor(reading,actor)?['a current registered account is required']:[])])}));
 const eligible=candidates.filter(c=>c.failures.length===0);
 const eligibleCounts=new Map();
 for(const action of eligible)eligibleCounts.set(action.verb,(eligibleCounts.get(action.verb)??0)+1);
 return freeze(candidates.map(action=>freeze({...action,failures:(eligibleCounts.get(action.verb)??0)>1
   ?freeze([...action.failures,'several eligible methods have this verb; the world must disambiguate them']):action.failures})));
}
