// wire — the message shapes a MOOSE room speaks to its clients, as plain constructor helpers, plus
// the (de)serialization boundary. Lifted from an earlier game server's shared protocol and encoding
// modules and generalized: the game-specific constructors (combat, codex, dispute, altar…) are dropped, and what remains is the
// transport-neutral spine every realtime webapp-game needs — hello, the client's join, a per-tick
// SNAPSHOT (the whole interest set) and DELTA (only what changed, plus what left view), a generic
// EVENT envelope (chat, and anything else a game broadcasts), and the join-ack/bye bookends.
//
// Pure and browser-safe: no `node:` anything, so the identical file ships to the browser and runs
// on the server (one source of truth keeps client decode and server encode in agreement). Messages
// are flat JSON `{ k, ... }` where `k` names the kind. The encoding is deliberately separated from
// the shapes so the transport can later swap JSON for a binary packing without touching call sites.
//
// A "view entry" here is whatever the game's snapshot-manager projected — MOOSE does not own the
// shape of an entity's render state (that is the game's snapshot function), it only carries it. The
// entries ride INSIDE snapshot.e / delta.c; this layer never inspects them.

export const PROTOCOL_VERSION = 1;

// the wire message kinds MOOSE defines. A game MAY ride its own event kinds through `event`
// (k:"event", t:<game-kind>, ...) rather than minting a new top-level k, so this set stays small.
export const MSG = Object.freeze({
  hello: "hello", // server -> client, once on connect: protocol version + your id + world meta
  join: "join", // client -> server, once after hello: a desired name/handle
  intent: "intent", // client -> server: one game intent (validated server-side by the intent-queue)
  control: "control", // client -> server: live session operation, outside the replayable intent log
  controlResult: "control-result", // server -> client: correlated result of a live control request
  snapshot: "snapshot", // server -> client: the full interest set (sent on join / re-sync)
  delta: "delta", // server -> client: per-tick changes to the interest set (changed + gone)
  event: "event", // server -> client: a discrete broadcast (chat, world banner, …) carried by `t`
  bye: "bye", // server -> client: an entity left view / the world
});

// --- server -> client -------------------------------------------------------------------------

// hello — sent once on connect. `id` is the client's own subject id (null until it joins), `world`
// is opaque per-game meta (e.g. { tick }).
export const hello = (id, world = null) => ({ k: MSG.hello, v: PROTOCOL_VERSION, id, world });

// snapshot — the full interest set. `you` is the recipient's own subject id; `e` is the list of
// view entries (each is whatever the game's snapshot-manager projected — carried verbatim).
export const snapshot = (tick, you, entries) => ({ k: MSG.snapshot, tick, you, e: entries });

// delta — the per-tick change set: `c` are changed/added view entries, `g` are ids that left the
// interest set (the client drops them). `ack` echoes the last client intent seq for reconciliation.
export const delta = (tick, ack, changed, gone) => ({ k: MSG.delta, tick, ack: ack | 0, c: changed, g: gone });

// event — a discrete broadcast keyed by `t` (the game's event-kind, e.g. "chat"), with the rest of
// the payload spread in. This is the one extension point: a game adds an event kind without minting
// a new top-level message k. chat() below is the canonical instance.
export const event = (t, payload = {}) => ({ k: MSG.event, t: String(t), ...payload });

// chat — the canonical event: a line of chat. Capped so one client cannot flood the stream.
export const chat = (from, line) => event("chat", { from, line: String(line).slice(0, 200) });

// bye — an entity left view / the world.
export const bye = (id) => ({ k: MSG.bye, id });

// --- client -> server -------------------------------------------------------------------------

// join — the client asks to enter with a handle. The server's intent-queue / session decides what
// joining means (spawn, re-enroll); this is only the request shape.
export const join = (name) => ({ k: MSG.join, name: String(name ?? "wanderer").slice(0, 24) || "wanderer" });

// intent — one game action. `seq` lets the server ack the last-processed intent (delta.ack) for
// client reconciliation; `body` is the game-specific intent the intent-queue's validator shapes.
export const intent = (seq, body) => ({ k: MSG.intent, seq: seq | 0, ...body });

// control — an operation on the live transport session (for example account registration/login).
// It deliberately has no tick or sequence: rooms must not append it to replayable game history.
export const control = (requestId, payload) => ({ k: MSG.control, requestId: String(requestId), payload });
export const controlResult = (requestId, ok, value) => ({
  k: MSG.controlResult,
  requestId: String(requestId),
  ok: Boolean(ok),
  ...(ok ? { result: value } : { error: String(value ?? "Request failed") }),
});

// === entry packing =============================================================================
// The wire-format seam the Wave2 ledger's item 1 named: a snapshot's `e` and a delta's `c` are lists
// of entry objects that mostly share one key signature, and flat JSON repeats every key name per
// entry. `packEntries` groups entries by exact key signature and emits one `[keys, rows]` group per
// signature under a marker key -- lossless (an absent key stays absent, `null` stays `null`, nested
// values ride verbatim), schema-free (the keys travel with the frame, so a client needs no
// negotiation to read it), and skipped when it would not pay (fewer than two entries share any
// signature). Entry order within a frame carries no meaning to any consumer in this package -- the
// snapshot-manager's delta is a set of changed subjects and every reader keys by `id` -- so grouping
// is free to reorder. Server-side use is opt-in (`createServer({ pack: true })`); `decode` always
// understands both shapes.

export const PACKED_ENTRIES = "$p";

const packableValue = (value) => value !== undefined && typeof value !== "function";

export function packEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 2) return entries;
  const groups = new Map(); // signature -> { keys, rows }
  const order = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entries; // not an entry list: leave it
    // Only the keys JSON itself would emit, so absent-vs-null survives the round trip.
    const keys = Object.keys(entry).filter((key) => packableValue(entry[key]));
    const signature = JSON.stringify(keys);
    let group = groups.get(signature);
    if (!group) {
      group = { keys, rows: [] };
      groups.set(signature, group);
      order.push(group);
    }
    group.rows.push(keys.map((key) => entry[key]));
  }
  if (!order.some((group) => group.rows.length >= 2)) return entries; // nothing shared: packing would cost bytes
  return { [PACKED_ENTRIES]: order.map((group) => [group.keys, group.rows]) };
}

export function unpackEntries(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object" || !Array.isArray(value[PACKED_ENTRIES])) return [];
  const out = [];
  for (const group of value[PACKED_ENTRIES]) {
    if (!Array.isArray(group) || !Array.isArray(group[0]) || !Array.isArray(group[1])) continue;
    const [keys, rows] = group;
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const entry = {};
      for (let index = 0; index < keys.length && index < row.length; index++) entry[keys[index]] = row[index];
      out.push(entry);
    }
  }
  return out;
}

// packMessage/unpackMessage touch only the two entry-bearing kinds; every other message is returned
// as-is (same object), so a caller can cheaply tell whether packing applied.
export function packMessage(msg) {
  if (!msg || typeof msg !== "object") return msg;
  if (msg.k === MSG.snapshot && Array.isArray(msg.e)) {
    const e = packEntries(msg.e);
    return e === msg.e ? msg : { ...msg, e };
  }
  if (msg.k === MSG.delta && Array.isArray(msg.c)) {
    const c = packEntries(msg.c);
    return c === msg.c ? msg : { ...msg, c };
  }
  return msg;
}

export function unpackMessage(msg) {
  if (!msg || typeof msg !== "object") return msg;
  if (msg.k === MSG.snapshot && msg.e && !Array.isArray(msg.e)) return { ...msg, e: unpackEntries(msg.e) };
  if (msg.k === MSG.delta && msg.c && !Array.isArray(msg.c)) return { ...msg, c: unpackEntries(msg.c) };
  return msg;
}

// === the (de)serialization boundary ===========================================================
// encode returns a string; decode parses one and returns null on garbage (a bad frame must never
// throw into the socket loop). `encode(msg, { pack: true })` applies entry packing; decode always
// unpacks, so a packed and a flat frame are indistinguishable once read.

export const encode = (msg, { pack = false } = {}) => JSON.stringify(pack ? packMessage(msg) : msg);

export function decode(text) {
  try {
    const m = JSON.parse(text);
    return m && typeof m === "object" && typeof m.k === "string" ? unpackMessage(m) : null;
  } catch {
    return null;
  }
}
