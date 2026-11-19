/**
 * Player-editable alias terms for the original FeltOS MUD command path.
 * A compiled expansion is NOT authority, a settled CHL proof or a PPA
 * certificate. Every leaf must pass the ordinary native command admission.
 */
export const CHARACTER_ALIASES = "character-alias-book";
export const MAX_ALIASES = 48;
export const MAX_ALIAS_COMMANDS = 4;
export const MAX_ALIAS_DEPTH = 6;
export const MAX_ALIAS_BYTES = 2048;

const IDENTIFIER = /^[a-z][a-z0-9-]{0,39}$/u;
const EMPTY = Object.freeze({kind:"feltos.character.alias-book/v1",revision:0,aliases:Object.freeze([])});
const RESERVED = new Set(["alias","unalias","history","register","login","quit","invoke","message","messages"]);
const utf8 = new TextEncoder();

function checkName(name, reserved=[]) {
  if(typeof name!=="string" || !IDENTIFIER.test(name) || RESERVED.has(name) || reserved.includes(name))
    throw new TypeError("alias name conflicts with a command or is not a lowercase character-alias name");
}
function checkTemplate(template) {
  if(typeof template!=="string" || template.trim().length===0 || utf8.encode(template).byteLength>MAX_ALIAS_BYTES
      || /[\r\n\u0000-\u001f]/u.test(template))
    throw new TypeError("alias template must be bounded single-line text");
  if(template.split(";").some(line=>!line.trim())) throw new TypeError("alias contains an empty command");
  if(template.split(";").length>MAX_ALIAS_COMMANDS) throw new TypeError("alias exceeds the bounded command count");
}
/** A contested or invalid retained alias record cannot silently become empty. */
export function readAliasBook(raw) {
  if(raw===undefined || raw===null)return EMPTY;
  if(raw.kind!==EMPTY.kind || !Number.isSafeInteger(raw.revision) || raw.revision<0
    || !Array.isArray(raw.aliases) || raw.aliases.length>MAX_ALIASES)
    throw new TypeError("invalid character alias book");
  const seen=new Set();
  const aliases=raw.aliases.map(entry=>{
    if(!entry || typeof entry!=="object" || Array.isArray(entry))throw new TypeError("invalid alias entry");
    checkName(entry.name);checkTemplate(entry.template);
    if(seen.has(entry.name))throw new TypeError("duplicate alias definition");
    seen.add(entry.name);return Object.freeze({name:entry.name,template:entry.template});
  });
  return Object.freeze({kind:EMPTY.kind,revision:raw.revision,
    aliases:Object.freeze(aliases.sort((a,b)=>a.name.localeCompare(b.name)))});
}
/** Replace one actor-owned functional World cell; not a parallel identity/store. */
export function changeAlias(book,name,template,{reserved=[]}={}) {
  const old=readAliasBook(book);checkName(name,reserved);
  if(template!==null)checkTemplate(template);
  if(template===null && !old.aliases.some(a=>a.name===name))throw new TypeError("no such character alias");
  if(template!==null && !old.aliases.some(a=>a.name===name) && old.aliases.length===MAX_ALIASES)
    throw new TypeError("character alias book is full");
  const aliases=old.aliases.filter(a=>a.name!==name);
  if(template!==null)aliases.push({name,template});
  return readAliasBook({kind:EMPTY.kind,revision:old.revision+1,aliases});
}
/** Supported Discworld substitutions: full, numbered, inclusive ranges, defaults. */
function substitute(template,args) {
  if(/[;\r\n\u2028\u2029]/u.test(args))throw new TypeError("alias arguments cannot introduce another command");
  const words=args.trim()?args.trim().split(/\s+/u):[];
  const escaped=template.replace(/\\\$/gu,"\uE000");
  const replaced=escaped.replace(/\$(\*|[1-9][0-9]*|[1-9][0-9]*\*|\*[1-9][0-9]*|arg(?:[1-9][0-9]*)?:[^$]*)\$/gu,(_match,token)=>{
    if(token==="*")return words.join(" ");
    if(/^[1-9][0-9]*$/u.test(token))return words[Number(token)-1]??"";
    if(/^[1-9][0-9]*\*$/u.test(token))return words.slice(Number(token.slice(0,-1))-1).join(" ");
    if(/^\*[1-9][0-9]*$/u.test(token))return words.slice(0,Number(token.slice(1))).join(" ");
    const [,ordinal,fallback]=/^arg([1-9][0-9]*)?:(.*)$/u.exec(token);
    return ordinal?(words[Number(ordinal)-1]??fallback):(words.join(" ")||fallback);
  });
  if(/\$[^\s]*\$/u.test(replaced))throw new TypeError("unsupported or unbound alias parameter");
  const hadParameter=/\$(?:\*|[1-9][0-9]*\*?|\*[1-9][0-9]*|arg(?:[1-9][0-9]*)?:[^$]*)\$/u.test(escaped);
  return {text:replaced.replace(/\uE000/gu,"$"),hadParameter};
}
/** Source path is a useful coordinate, NOT an independently proved PPA witness. */
export function compileAlias(book,line,{maxCommands=MAX_ALIAS_COMMANDS}={}) {
  const state=readAliasBook(book);const first=String(line).trim();
  const verb=first.split(/\s/u,1)[0].toLowerCase();
  const byName=new Map(state.aliases.map(a=>[a.name,a]));
  if(!byName.has(verb))return null;
  if(!Number.isSafeInteger(maxCommands)||maxCommands<1||maxCommands>MAX_ALIAS_COMMANDS)
    throw new TypeError("invalid alias command envelope");
  const expanded=[];
  const expand=(command,stack)=>{
    if(stack.length>MAX_ALIAS_DEPTH)throw new TypeError("alias depth exceeded");
    const trimmed=command.trim(),space=trimmed.search(/\s/u);
    const name=(space<0?trimmed:trimmed.slice(0,space)).toLowerCase();
    const rest=space<0?"":trimmed.slice(space).trim();
    const alias=byName.get(name);
    if(!alias) {
      if(!trimmed)throw new TypeError("alias generated an empty command");
      if(utf8.encode(trimmed).byteLength>MAX_ALIAS_BYTES)
        throw new TypeError("alias generated a command exceeding the byte envelope");
      expanded.push(Object.freeze({command:trimmed,path:Object.freeze([...stack])}));
      if(expanded.length>maxCommands)throw new TypeError("alias exceeds the current execution envelope");
      return;
    }
    if(stack.includes(name))throw new TypeError("recursive character aliases are refused");
    const parts=alias.template.split(";");
    for(let i=0;i<parts.length;i++) {
      const result=substitute(parts[i],rest);
      const next=result.text.trim()+(!result.hadParameter && rest && i===parts.length-1?" "+rest:"");
      expand(next,[...stack,name]);
    }
  };
  expand(first,[]);
  return Object.freeze({kind:"feltos.character.alias-plan/v1",name:verb,bookRevision:state.revision,
    steps:Object.freeze(expanded),commands:Object.freeze(expanded.map(s=>s.command))});
}
/** Inspect only a bounded prefix of the original actor's causal command past.
 * A partial reading is NEVER presented as the complete last-N history.
 */
export function observeCommandHistory(world,actor,limit=3,{maxRevisions=4096}={}) {
  if(!Number.isSafeInteger(limit)||limit<1||limit>20)throw new TypeError("history limit must be 1 to 20");
  if(!Number.isSafeInteger(maxRevisions)||maxRevisions<1||maxRevisions>4096)
    throw new TypeError("history revision scan must be bounded to 1..4096");
  if(!Array.isArray(world?.revisions))throw new TypeError("history requires original World revisions");
  const out=[];
  const safeArgs=new Set(["look","l","examine","x","history","journal","survey","where","worlds","character",
    "skills","score","stats","exits","inventory","i","go","move","help","commands","powers"]);
  let examined=0;
  for(let i=world.revisions.length-1;i>=0 && out.length<limit && examined<maxRevisions;i--) {
    examined++;
    const revision=world.revisions[i];
    for(let j=(revision.cells?.length??0)-1;j>=0 && out.length<limit;j--) {
      const at=revision.cells[j],entry=at.object;
      if(at.predicate!=="action-admission"||entry?.actor!==actor||entry?.source!=="player")continue;
      const verb=String(entry.command).trim().split(/\s/u,1)[0].toLowerCase();
      const command=safeArgs.has(verb)?entry.command:verb+" [arguments withheld]";
      out.push(Object.freeze({command,admitted:entry.admitted===true,
        sourceRef:typeof entry.id==="string"?entry.id:null,tick:at.subject}));
    }
  }
  const status=out.length>=limit?"requested-window-read":
    examined===world.revisions.length?"whole-source-exhausted":"bounded-partial";
  return Object.freeze({kind:"feltos.character.command-history/v1",actor,
    entries:Object.freeze(out),coverage:status,scannedRevisions:examined});
}
/** Compatibility projection for callers needing just the fully qualified entry list. */
export function recentCommands(world,actor,limit=3) {
  return observeCommandHistory(world,actor,limit).entries;
}
