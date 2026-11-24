import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cells, tell, value } from "./world.mjs";
import { ROLE_REGISTERED, withRoleFunctional, accountSubject, certainIdentityFact } from "./identity-roles.mjs";

const ACCOUNT_NAME = /^[a-z][a-z0-9]*(?:[-][a-z0-9]+)*$/u;
const SCRYPT_KEY_LENGTH = 32;

function derivePasswordKey(password, salt) {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH);
}

/** Register an unclaimed account for an actor and return its initial password. */
export function registerAccount(world, actor, rawName) {
  const name = typeof rawName === "string" ? rawName.trim().toLowerCase() : rawName;
  if (typeof name !== "string" || !ACCOUNT_NAME.test(name) || name.length > 24) {
    throw new TypeError("account name must be a lowercase identifier");
  }
  const account = accountSubject(name);
  if (value(world, actor, "role") === ROLE_REGISTERED) throw new TypeError("this character already has an account");
  if (cells(world, account, "kind").length > 0) throw new TypeError(`account name already claimed: ${name}`);
  const password = randomBytes(8).toString("hex");
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = derivePasswordKey(password, passwordSalt).toString("hex");
  const next = tell(withRoleFunctional(world), [
    { subject: account, predicate: "kind", object: "account" },
    { subject: account, predicate: "password-salt", object: passwordSalt },
    { subject: account, predicate: "password-hash", object: passwordHash },
    { subject: account, predicate: "controls-actor", object: actor },
    { subject: actor, predicate: "role", object: ROLE_REGISTERED },
    { subject: actor, predicate: "name", object: name },
  ], { source: "feltos.identity.register" });
  return { world: next, password };
}

/** Verify an account credential and resolve the persistent character it controls. */
export function loginAccount(world, rawName, password) {
  if (typeof rawName !== "string" || typeof password !== "string") throw new TypeError("login requires a name and a password");
  const account = accountSubject(rawName.trim().toLowerCase());
  const passwordSalt = certainIdentityFact(world, account, "password-salt");
  const passwordHash = certainIdentityFact(world, account, "password-hash");
  const actor = certainIdentityFact(world, account, "kind") === "account" ? certainIdentityFact(world, account, "controls-actor") : null;
  // Do the same password work for unknown names. No plaintext enters world history.
  const candidate = derivePasswordKey(password, typeof passwordSalt === "string" ? passwordSalt : "00000000000000000000000000000000");
  const expected = typeof passwordHash === "string" && /^[0-9a-f]{64}$/u.test(passwordHash) ? Buffer.from(passwordHash, "hex") : Buffer.alloc(SCRYPT_KEY_LENGTH);
  const authenticated = timingSafeEqual(candidate, expected) && typeof actor === "string";
  return { authenticated, actor: authenticated ? actor : null };
}
