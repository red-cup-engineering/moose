/** The world's authenticated entrance and its explicitly designated execution body.
 * Native actor requests carry the statement; this module grants no standing and
 * never reads a caller-selected root. See specifications/world-host/coordination-ingress.md. */
import { randomUUID } from 'node:crypto';
import { semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import { canonicalJson, requireJsonValue } from '@red-cup-engineering/json-services-section';

export const WORLD_GATEWAY_ADMISSION = 'metroplat.subject-binding';
export const WORLD_GATEWAY_LIMITS = Object.freeze({ inputBytes: 8192, resultBytes: 24576, inflight: 8, lifetimeMs: 60000, waitMs: 10000 });
const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value,name,max=4096)=>{if(typeof value!=='string'||!value.trim()||Buffer.byteLength(value)>max)throw new TypeError(`${name} must be bounded nonempty text`);return value;};
const exact=(value,keys,name)=>{if(!object(value)||Object.keys(value).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(value,key)))throw new TypeError(`${name} requires exactly ${keys.join(', ')}`);};
const actor=(value,name)=>{text(value,name,2048);const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.href!==value)throw new TypeError(`${name} must be one canonical HTTPS actor`);return value;};
const ni=(value,name)=>{if(!NI.test(value))throw new TypeError(`${name} must be a canonical content address`);return value;};
const instant=(value,name)=>{text(value,name,40);if(!Number.isFinite(Date.parse(value)))throw new TypeError(`${name} must be an instant`);return value;};
const frozen=value=>{if(object(value)||Array.isArray(value)){Object.values(value).forEach(frozen);Object.freeze(value);}return value;};
const clone=value=>JSON.parse(canonicalJson(value));

/** The revision binds the exact installed operations, not a second list of verbs. */
export function worldGatewayCatalogue(operations){
 if(!Array.isArray(operations)||operations.length===0)throw new TypeError('gateway world needs its nonempty owner catalogue');
 const refs=operations.map(operation=>ni(operation.ref,'operation'));
 if(new Set(refs).size!==refs.length)throw new TypeError('gateway world operations must be unique');
 return semanticId({kind:'feltos.world.operation-catalogue',operations:[...refs].sort()});
}

/** Inert source declaration. Selecting it is a separate deployment authority decision. */
export function worldGatewayBinding(value){
 exact(value,['world','state','issuer','recipient','catalogue'],'world gateway binding');
 const declaration={kind:'feltos.world.gateway-binding',world:text(value.world,'logical world'),state:ni(value.state,'logical state authority'),issuer:actor(value.issuer,'gateway issuer'),recipient:actor(value.recipient,'execution audience'),catalogue:ni(value.catalogue,'world catalogue')};
 if(declaration.issuer===declaration.recipient)throw new TypeError('gateway and execution actors must be distinct');
 return frozen({...declaration,id:semanticId(declaration)});
}

const callMaterial=({verb,operation,input})=>{
 if(typeof verb!=='string'||!/^[a-z][a-z0-9-]*$/u.test(verb))throw new TypeError('gateway call needs a canonical owner verb');
 ni(operation,'gateway operation');requireJsonValue(input,'gateway input');
 if(Buffer.byteLength(canonicalJson(input))>WORLD_GATEWAY_LIMITS.inputBytes)throw new TypeError('gateway input exceeds its bounded native carrier');
 return {verb,operation,input:clone(input)};
};
const sessionHand=session=>session.startsWith('harness:')?`session:${session.slice(8)}`:session.startsWith('token:')?`mcp-${session}`:`mcp-session:${session}`;

/** Call only behind the authenticated entrance. Identity never comes from tool arguments. */
export function admitWorldGatewayCall(binding,call,context,{now=()=>new Date().toISOString(),nonce=randomUUID}={}){
 const selected=worldGatewayBinding(binding),material=callMaterial(call);
 const subject=text(context?.principal?.subject,'authenticated gateway principal',2048);
 if(subject==='anonymous')throw new TypeError('gateway work requires an authenticated principal');
 // The entrance supplies its already derived selector; never accept a bearer or an arbitrary hand.
 const session=text(context?.session,'admitted gateway session',2048);
 const at=instant(now(),'gateway admission time');
 const statement={kind:'feltos.world.gateway-admission',binding:selected.id,world:selected.world,state:selected.state,
  issuer:selected.issuer,recipient:selected.recipient,catalogue:selected.catalogue,subject,session,
  call:semanticId(material),nonce:text(nonce(),'gateway request nonce',128),at,
  until:new Date(Date.parse(at)+WORLD_GATEWAY_LIMITS.lifetimeMs).toISOString()};
 return frozen({call:material,statement:{...statement,id:semanticId(statement)}});
}

/** Existing receiver execution hook. It recognizes one logical world, never a payload root.
 * All operation authorization remains the ordinary current MetroPlat authorization. */
export function worldGatewayExecution({world,state,binding,operations,authorize,recognize,now=()=>new Date().toISOString()}){
 text(world,'receiving logical world');ni(state,'receiving logical state authority');
 if(typeof binding!=='function'||typeof operations!=='function'||typeof authorize!=='function'||typeof recognize!=='function')throw new TypeError('gateway execution needs current owner binding, catalogue, session recognition and authorization');
 return async({claim,requester,recipient,subjectBinding})=>{
  const statement=subjectBinding;
  exact(statement,['kind','binding','world','state','issuer','recipient','catalogue','subject','session','call','nonce','at','until','id'],'gateway admission');
  if(statement.kind!=='feltos.world.gateway-admission')throw new TypeError('unsupported gateway admission kind');
  const {id,...said}=statement;if(semanticId(said)!==id)throw new TypeError('gateway admission content address differs');
  text(statement.subject,'gateway principal',2048);text(statement.session,'gateway session',2048);text(statement.nonce,'gateway nonce',128);
  if(statement.subject==='anonymous')throw new TypeError('gateway principal must be authenticated');
  const at=Date.parse(instant(statement.at,'admission time')),until=Date.parse(instant(statement.until,'admission expiry'));
  if(until<=at||until-at>WORLD_GATEWAY_LIMITS.lifetimeMs)throw new TypeError('gateway lifetime exceeds its contract');
  if(!Array.isArray(claim?.argv)||claim.argv.length!==1)throw new TypeError('gateway statement binds one operation, without extra argv');
  const call=callMaterial({verb:claim.argv[0],operation:claim.operation,input:JSON.parse(claim.stdin)});
  if(semanticId(call)!==statement.call)throw new TypeError('gateway statement does not bind this exact call');
  let recognized;
  const current=(invocation,operation)=>{
   const selected=worldGatewayBinding(binding());
   if(selected.world!==world||selected.state!==state||selected.id!==statement.binding
    ||statement.world!==world||statement.state!==state||statement.catalogue!==selected.catalogue
    ||selected.issuer!==requester||statement.issuer!==requester||selected.recipient!==recipient||statement.recipient!==recipient)
    throw new TypeError('signed gateway has no current authority for this audience and logical root');
   const installed=operations();
   if(worldGatewayCatalogue(installed)!==selected.catalogue||!installed.some(candidate=>candidate.ref===call.operation&&candidate.verb===call.verb))
    throw new TypeError('gateway world operation catalogue changed');
   const instantNow=Date.parse(now());
   if(!Number.isFinite(instantNow)||instantNow<at||instantNow>until)throw new TypeError('gateway admission is not current');
   const identity=recognize(statement.subject,statement.session);
   if(identity?.subject!==statement.subject||identity.hand!==sessionHand(statement.session)||typeof identity.bearer!=='string'
    ||recognized!==undefined&&identity.bearer!==recognized.bearer)throw new TypeError('gateway account/session recognition changed');
   recognized=identity;
   if(invocation&&(invocation.subject!==statement.subject||invocation.caller?.hand!==sessionHand(statement.session)
      ||operation.ref!==call.operation||operation.verb!==call.verb||canonicalJson(invocation.input)!==canonicalJson(call.input)))
    throw new TypeError('gateway execution changed the admitted principal, session or call');
  };
  current();
  return frozen({subject:statement.subject,hand:sessionHand(statement.session),subjectBinding:statement.id,once:true,
   service:{kind:'world-gateway',binding:statement.binding,world,state,session:statement.session,bearer:recognized.bearer},
   authorize:(invocation,operation,at)=>{current(invocation,operation);return authorize(invocation,operation,at);}});
 };
}

/** The entrance calls this port with authenticated context. A timeout exposes
 * only the original native receipt and observation path, never a resubmission. */
export function createWorldGateway({binding,port,identifier,now=()=>new Date().toISOString(),nonce=randomUUID,
 waitMs=WORLD_GATEWAY_LIMITS.waitMs,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),recognizeSession}){
 if(typeof binding!=='function'||typeof port?.prepare!=='function'||typeof port?.recover!=='function'||typeof port?.send!=='function'||typeof port?.result!=='function')throw new TypeError('world gateway requires its current binding and native request/reply port');
 text(identifier,'gateway actor identifier',128);
 if(!Number.isSafeInteger(waitMs)||waitMs<1||waitMs>WORLD_GATEWAY_LIMITS.waitMs)throw new TypeError('gateway wait must stay inside its bound');
 let active=0;
 // One real Actor may wear different authenticated session hands over time.
 // Recovery is READ ONLY. The host's original AOE identity consumer, not a
 // client-supplied bearer, must recognize the current hand; the completed
 // result's originally admitted bearer is checked again after the await.
 const resumingBearer=(statement,context)=>{
  if(statement.session===context?.session)return undefined;
  if(typeof recognizeSession!=='function')
   throw new TypeError('cross-session gateway observation requires the original host identity reader');
  const current=recognizeSession(statement.subject,context?.session);
  if(current?.subject!==statement.subject||current?.session!==context?.session
   ||current?.hand!==sessionHand(context.session)
   ||typeof current?.bearer!=='string'||!current.bearer||current?.then!==undefined)
   throw new TypeError('new gateway session has no one currently recognized bearer');
  return current.bearer;
 };
 const observation=(handle,context)=>{
  requireJsonValue(handle,'gateway observation handle');
  if(Buffer.byteLength(canonicalJson(handle))>WORLD_GATEWAY_LIMITS.inputBytes)throw new TypeError('gateway observation exceeds its bound');
  exact(handle,['kind','statement','submission'],'gateway observation handle');
  if(handle.kind!=='feltos.world.gateway-observation')throw new TypeError('not a gateway observation');
  const selected=worldGatewayBinding(binding()),statement=handle.statement;
  const {id,...said}=statement??{};
  if(semanticId(said)!==id||statement.world!==selected.world||statement.state!==selected.state
   ||statement.issuer!==selected.issuer||statement.recipient!==selected.recipient
   ||statement.subject!==context?.principal?.subject
   ||handle.submission?.recipient!==selected.recipient)
   throw new TypeError('gateway receipt belongs to another caller, session or logical world');
  if(handle.submission.request===undefined){exact(handle.submission,['requestNi','recipient'],'native retention handle');ni(handle.submission.requestNi,'original request identity');}
  else{exact(handle.submission,['id','request','recipient','requestNi'],'native submission handle');ni(handle.submission.requestNi,'retained request identity');ni(handle.submission.request,'original native request');}
  resumingBearer(statement,context);
  return statement;
 };
 const receive=async(handle,context)=>{
  const statement=observation(handle,context);
  if(handle.submission.request===undefined){
   const submission=await port.recover({identifier,retention:handle.submission,subjectBinding:statement.id});
   if(submission===undefined)return frozen({state:'indeterminate',handle,reason:'original native request custody is not yet observed; do not repeat this act'});
   handle=frozen({...handle,submission});observation(handle,context);
  }
  const received=await port.result({identifier,submission:handle.submission,subjectBinding:statement.id});
  if(received===undefined){resumingBearer(statement,context);return frozen({state:'pending',handle});}
  exact(received,['request','recipient','reply','result'],'addressed native reply receipt');
  if(received.request!==handle.submission.request||received.recipient!==handle.submission.recipient)
   throw new TypeError('native reply receipt differs from the retained request or audience');
  ni(received.reply,'native reply address');
  const result=received.result;
  if(result.subjectBinding!==statement.id||result.executor!==statement.subject||result.hand!==sessionHand(statement.session)
   ||result.requester!==statement.issuer||result.service?.binding!==statement.binding||result.service?.world!==statement.world
   ||result.service?.state!==statement.state||result.service?.session!==statement.session)
   throw new TypeError('native reply differs from the admitted caller, session or logical world');
  const successor=resumingBearer(statement,context);
  if(successor!==undefined&&result.service?.bearer!==successor)
   throw new TypeError('a later gateway hand does not represent the original Work bearer');
  if(Buffer.byteLength(canonicalJson(result))>WORLD_GATEWAY_LIMITS.resultBytes)throw Object.assign(new TypeError('gateway result exceeds its bound; observe original request custody, do not repeat the act'),{code:'GATEWAY_RESULT_TOO_LARGE',handle});
  return frozen({state:result.state==='executing'||result.state==='indeterminate'?'indeterminate':'terminal',handle,
   reply:received.reply,result});
 };
 return Object.freeze({
  active:()=>active,
  async observe(handle,context){
   observation(handle,context);
   if(active>=WORLD_GATEWAY_LIMITS.inflight)throw Object.assign(new Error('gateway is at its in-flight bound; no observation started'),{code:'GATEWAY_BUSY'});
   active++;
   const running=receive(handle,context).finally(()=>{active--;});
   let timer;
   const expired=new Promise(resolve=>{timer=setTimeout(()=>resolve(frozen({state:handle.submission.request===undefined?'indeterminate':'pending',handle})),waitMs);});
   try{return await Promise.race([running,expired]);}finally{clearTimeout(timer);running.catch(()=>{});}
  },
  async invoke(call,context){
   if(active>=WORLD_GATEWAY_LIMITS.inflight)throw Object.assign(new Error('gateway is at its in-flight bound; no request submitted'),{code:'GATEWAY_BUSY'});
   const admitted=admitWorldGatewayCall(binding(),call,context,{now,nonce});
   const request={identifier,address:admitted.statement.recipient,text:canonicalJson(admitted.call),subjectBinding:admitted.statement,requestKey:admitted.statement.id,reuse:true};
   const retention=port.prepare(request);
   if(retention?.then!==undefined||retention?.recipient!==admitted.statement.recipient)throw new TypeError('gateway request preparation must preserve its exact audience synchronously');
   ni(retention.requestNi,'native request identity');
   let handle=frozen({kind:'feltos.world.gateway-observation',statement:admitted.statement,submission:retention}),accepting=true,finished=false,nativeMayRetain=false;
   const retain=submission=>{
    if(submission?.recipient!==admitted.statement.recipient)throw new TypeError('native request audience differs from its admission');
    handle=frozen({kind:'feltos.world.gateway-observation',statement:admitted.statement,submission});observation(handle,context);
   };
   const uncertain=()=>frozen({state:'indeterminate',handle,reason:'native custody may be in progress; do not repeat this act'});
   active++;
   const running=(async()=>{
    let submission;
    try{submission=await port.send({...request,retention,
     admit:()=>{if(!accepting)throw new TypeError('gateway wait ended before native submission');nativeMayRetain=true;},
     onRetained:retain});}
    catch(error){if(error.submission!==undefined){retain(error.submission);return frozen({state:'pending',handle});}if(nativeMayRetain)return uncertain();throw error;}
    retain({id:submission.id,request:submission.request,recipient:submission.recipient,requestNi:submission.requestNi});
    if(submission.result!==undefined)return receive(handle,context);
    while(accepting){const read=await receive(handle,context);if(read.state!=='pending')return read;await pause(Math.min(100,waitMs));}
    return frozen({state:'pending',handle});
   })().finally(()=>{finished=true;active--;});
   // Even when transport does not settle, its slot remains occupied: a stalled
   // executor cannot create unbounded promises or permit a late duplicate send.
   let timer;
   const expired=new Promise(resolve=>{timer=setTimeout(()=>{accepting=false;resolve(handle.submission.request!==undefined?frozen({state:'pending',handle}):nativeMayRetain?uncertain():frozen({state:'not-submitted',reason:'gateway wait ended before admission; native retention and send are prevented'}));},waitMs);});
   try{return await Promise.race([running,expired]);}finally{clearTimeout(timer);accepting=false;if(!finished)running.catch(()=>{});}
  },
 });
}
