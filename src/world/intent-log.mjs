import { createAppendOnlyLog } from "@red-cup-engineering/computer-content-graph-engineering-services-section/event-stream";
import { canonicalJson, canonicalizeJson } from "@red-cup-engineering/json-engine/canonical-json";
import { hashPosition } from "@red-cup-engineering/game-engine/running/rules";

/**
 * Re-shape a record-like object into the fixed five-key form, coercing types so a record built
 * two different ways (e.g. by room.mjs live vs. by a test fixture) hashes identically.
 * @param {object} rec
 * @returns {{tick:number,seq:number,actorId:string,kind:string,args:object}}
 */
export function canonicalRecord(rec) {
  return {
    tick: rec.tick | 0,
    seq: rec.seq | 0,
    actorId: String(rec.actorId),
    kind: String(rec.kind),
    args: rec.args ?? {},
  };
}

export function canonicalJSON(rec) {
  return canonicalJson(canonicalRecord(rec));
}

/**
 * sha256 (via cartridge's hashPosition) over the seed plus every record in the given order.
 * Order is part of what's hashed — a replay that reordered records would not be replaying the
 * same room — plus the seed, so two different seeds with an (impossibly) identical log still
 * hash apart.
 * @param {readonly object[]} log
 * @param {unknown} [seed]
 * @returns {string}
 */
export function roomHash(log, seed = "") {
  return hashPosition({ seed, log: log.map(canonicalRecord) });
}

// The room owns the log. Copies returned to a player can be freely edited.
export function createIntentLog(seed = "") {
  const records = createAppendOnlyLog({
    canonicalize: record => canonicalizeJson(canonicalRecord(record)).value,
  });
  const through = tick => records.all().filter(record => record.tick <= tick);
  return {
    append: record => structuredClone(records.append(record)),
    all: () => structuredClone(records.all()),
    since: tick => structuredClone(records.all().filter(record => record.tick > tick)),
    upto: tick => structuredClone(through(tick)),
    length: records.length,
    hash: (uptoTick = Infinity) => roomHash(through(uptoTick), seed),
    seed,
  };
}
