import { cells, certainValue, declareFunctional, subjects, tell, value } from "./world.mjs";

/** "role" must supersede (like "name"/"kind"), never accumulate: a session's later register/login
 *  replaces its earlier anonymouse role, it does not sit alongside it as second contradictory
 *  evidence. Every world created now holds it in its schema (world.mjs); this admits a world saved
 *  before that, once, and is a no-op on every other. Shared with identity.mjs's register/login. */
export function withRoleFunctional(world) {
  return declareFunctional(world, ["role"]);
}

/**
 * identity-roles.mjs — the MASH anonymouse/registered role shape as feltos world facts (adapted,
 * not ported, from mash-crates-mash-library-src-mud-welcome.rs under
 * lib/legacy/.../agentic-tooling-mash/; see census-existing-code's "read a legacy/sibling
 * reference for semantics without porting it"). Role granted on connect:
 * perceive/move/depart/read-help/commune/register-self/login-self, not voice. Split from
 * identity.mjs (561-group ruling: a hull module may not reach a kernel module by a relative
 * import) so the role/voice predicate stays reachable without identity.mjs's node:crypto account
 * machinery; identity.mjs re-exports these same names for its own "./identity" subpath.
 */
export const ROLE_ANONYMOUSE = "anonymouse";

/** Role granted after register/login: everything anonymouse has, plus voice. */
export const ROLE_REGISTERED = "registered";

/** Verbatim from mash-crates-mash-library-src-mud-welcome.rs's DEFAULT_BANNER. */
export const WELCOME_BANNER = "Welcome. You arrive anonymouse. Type `help` for commands or `register <name>` to claim one.";

/**
 * Whether `actor` currently holds voice (may `say`/`chat`/`tell`).
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject.
 * @returns {boolean} true unless the actor was explicitly welcomed as anonymouse and has not since
 *   registered/logged in. An actor with no role fact at all (every actor joined before this module
 *   existed, and every actor in a game that never calls welcomeAnonymously) defaults to true — this
 *   keeps `say` open for every pre-existing game and test, matching the Group law that a new
 *   capability never silently narrows behavior nothing opted into.
 */
export function hasVoice(world, actor) {
  if (cells(world, actor, "role").length === 0) return true;
  const role = certainValue(world, actor, "role");
  return role !== null && role !== ROLE_ANONYMOUSE;
}

/**
 * Assert the anonymouse role on a freshly joined actor, once per actor.
 * @param {object} world a FeltOS world.
 * @param {string} actor an actor subject, already joined via engine.mjs's join().
 * @returns {{world: object, welcomed: boolean}} welcomed is false (world unchanged) when this
 *   actor already carries a role fact — the idempotent-per-session behavior mash-welcome.rs's own
 *   `welcome_is_idempotent_per_session` test names.
 */
export function welcomeAnonymously(world, actor) {
  if (value(world, actor, "role") !== null) return { world, welcomed: false };
  return {
    world: tell(withRoleFunctional(world), { subject: actor, predicate: "role", object: ROLE_ANONYMOUSE }, { source: "feltos.identity.welcome" }),
    welcomed: true,
  };
}

// Original account projections live with their pure role premises. Password
// handling and external identity adapters remain with the FeltOS host.
const ACCOUNT_NAME = /^[a-z][a-z0-9]*(?:[-][a-z0-9]+)*$/u;
export function certainIdentityFact(world, subject, predicate) {
  const claims = cells(world, subject, predicate).filter((claim) => claim.for.length > 0);
  return claims.length === 1 && claims[0].against.length === 0 ? claims[0].object : null;
}
export function accountSubject(name) { return `account:${name}`; }
export function registeredActorForAccount(world,name){
 if(typeof name!=='string'||!ACCOUNT_NAME.test(name)||name.length>24)return null;
 const account=accountSubject(name);
 if(certainIdentityFact(world,account,'kind')!=='account')return null;
 const actor=certainIdentityFact(world,account,'controls-actor');
 return typeof actor==='string'&&certainIdentityFact(world,actor,'role')===ROLE_REGISTERED?actor:null;
}
export function registeredAccountForActor(world,actor){
 const names=subjects(world).filter(subject=>subject.startsWith('account:')).map(subject=>subject.slice(8)).filter(name=>registeredActorForAccount(world,name)===actor);
 if(names.length!==1)throw new TypeError('actor must control exactly one current registered account');
 return names[0];
}
