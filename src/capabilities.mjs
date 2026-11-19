const IDENTIFIER = /^[a-z][a-z0-9]*(?:[-.:][a-z0-9]+)*$/u;
const COMMAND = /^[a-z][a-z0-9-]*$/u;
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function fail(message) {
  throw new TypeError(message);
}

/**
 * Define executable policy separately from serializable game data and engine
 * state. A capability may own command reducers, a tick reducer, or both, and
 * declares the predicates it writes as superseding (`functionalPredicates`):
 * that is part of the world's schema, fixed before any such cell is observed.
 */
export function defineCapability(source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) fail("capability must be a record");
  if (typeof source.id !== "string" || !IDENTIFIER.test(source.id)) fail("capability id must be a stable lowercase identifier");
  const commands = {};
  for (const [name, handler] of Object.entries(source.commands ?? {}).sort(([a], [b]) => compareText(a, b))) {
    if (!COMMAND.test(name)) fail(`invalid capability command: ${name}`);
    if (typeof handler !== "function") fail(`capability command ${name} must be a function`);
    commands[name] = handler;
  }
  if (source.onTick !== undefined && typeof source.onTick !== "function") fail("capability onTick must be a function");
  if (source.onElapse !== undefined && typeof source.onElapse !== "function") fail("capability onElapse must be a function");
  if (source.proposeActions !== undefined && typeof source.proposeActions !== "function") fail("capability proposeActions must be a function");
  if (source.functionalPredicates !== undefined && !Array.isArray(source.functionalPredicates)) fail("capability functionalPredicates must be a sequence");
  for (const predicate of source.functionalPredicates ?? []) {
    if (typeof predicate !== "string" || predicate.length === 0) fail("capability functional predicates must be non-empty strings");
  }
  return Object.freeze({
    kind: "feltos.capability.v1",
    id: source.id,
    commands: Object.freeze(commands),
    functionalPredicates: Object.freeze([...new Set(source.functionalPredicates ?? [])].sort(compareText)),
    ...(source.onTick === undefined ? {} : { onTick: source.onTick }),
    ...(source.onElapse === undefined ? {} : { onElapse: source.onElapse }),
    ...(source.proposeActions === undefined ? {} : { proposeActions: source.proposeActions }),
  });
}

export function composeCapabilities(capabilities = []) {
  const ordered = [...capabilities];
  const ids = new Set();
  const commands = new Map();
  for (const capability of ordered) {
    if (capability?.kind !== "feltos.capability.v1") fail("runtime contains an undefined capability");
    if (ids.has(capability.id)) fail(`duplicate capability: ${capability.id}`);
    ids.add(capability.id);
    for (const [name, handler] of Object.entries(capability.commands)) {
      const methods=commands.get(name)??[];
      methods.push(Object.freeze({ capability: capability.id, handler }));
      commands.set(name,methods);
    }
  }
  return Object.freeze({
    kind: "feltos.runtime.v1",
    ids: Object.freeze([...ids]),
    capabilities: Object.freeze(ordered),
    functionalPredicates: Object.freeze([...new Set(ordered.flatMap((capability) => capability.functionalPredicates))].sort(compareText)),
    commands: Object.freeze([...commands.keys()].sort(compareText)),
    command(name,capability) {
      const candidates=(commands.get(name)??[]).filter(method=>capability===undefined||method.capability===capability);
      return candidates.length===1?candidates[0]:null;
    },
  });
}

export const EMPTY_RUNTIME = composeCapabilities();

