import {copyJson,freezeJson,requireJsonValue} from '@red-cup-engineering/json-services-section';

/** Opaque immutable transport-origin data. Domain owners alone interpret/admit it. */
export function admitIntentOrigin(source) {
  const seen=new Set();
  const visit=value=>{
    if(value===null || typeof value!=='object')return;
    if(seen.has(value))throw new TypeError('intent origin must be acyclic JSON');
    const prototype=Object.getPrototypeOf(value);
    if(!Array.isArray(value) && prototype!==Object.prototype && prototype!==null)throw new TypeError('intent origin requires plain JSON records');
    seen.add(value);
    const keys=Reflect.ownKeys(value);
    for(const key of keys){
      if(Array.isArray(value) && key==='length')continue;
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(typeof key!=='string' || !descriptor.enumerable || !Object.hasOwn(descriptor,'value'))throw new TypeError('intent origin requires enumerable JSON data properties');
      if(Array.isArray(value) && (!/^(0|[1-9][0-9]*)$/u.test(key) || Number(key)>=value.length))throw new TypeError('intent origin arrays require indexed members');
      visit(descriptor.value);
    }
    if(Array.isArray(value))for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))throw new TypeError('intent origin arrays must be dense');
    seen.delete(value);
  };
  if(source===null || typeof source!=='object' || Array.isArray(source))throw new TypeError('intent origin must be a JSON record');
  visit(source);requireJsonValue(source,'intent origin');
  return freezeJson(copyJson(source));
}

/** Only a current domain decision admits origin-bearing intent. Validation is pure. */
export function intentIsCurrent(intent,validate) {
  if(validate===undefined)return !Object.hasOwn(intent,'origin');
  if(typeof validate!=='function')return false;
  try{return validate(intent)===true;}catch{return false;}
}
