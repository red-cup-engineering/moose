/**
 * FeltOS's projection of an actor's observable world into a validated perception frame. A game
 * supplies only its own frame type, kind, clock report, and affordances policy; FeltOS performs
 * the world reading, assembly, and admission once.
 */
export * from "./perception-frame-types.mjs";

import { deriveWorldReading, rebindWorldReading } from "./world-reading.mjs";
import { contentsOf, evidenceName, exitsOf as currentExitsOf, perceivedOf, settleSubject, value } from "./world.mjs";

import { availableActions } from './engine.mjs';
import { territoryOf } from './world.mjs';
import { validateFrame } from "./perception-frame-types.mjs";

/** @typedef {{ tick: number, channel: string, text: string }} PerceptionEvent */

/** A subject's display name, falling back to its own id when it declares none. */
export function displayName(world, subject) {
  const name = value(world, subject, "name");
  return typeof name === "string" ? name : subject;
}

/** The canonical current edges, projected to the existing sorted direction strings. */
export function exitsOf(world, room) {
  return currentExitsOf(world, room).map(({ direction }) => direction).sort();
}

// A place as anyone in it perceives it: its name, description and exits.
const placeView = deriveWorldReading((world, place) => Object.freeze({
  id: place,
  name: displayName(world, place),
  description: String(value(world, place, "description") ?? ""),
  exits: Object.freeze(exitsOf(world, place)),
}));

// Who shares a place with an actor, keyed by the pair: each occupant's id and name.
const occupantsOf = deriveWorldReading((world, pair) => {
  const [actor, place] = pair.split(PAIR);
  return Object.freeze(contentsOf(world, place).filter((id) => id !== actor).map((id) => Object.freeze({ id, name: displayName(world, id) })));
});

// An actor's view (its place, who shares it, and every subject it perceives with that subject's
// affordances) is a reading of the world alone, derived once per game's affordances policy and
// carried to every later world in which nothing it read has changed. Each part is itself carried,
// so a view re-derived because one subject changed re-reads only that subject.
const views = new WeakMap();
function viewOf(affordancesFor) {
  if (!views.has(affordancesFor)) views.set(affordancesFor, deriveWorldReading((world, actor) => {
    const view = perceivedOf(world, actor);
    const place = view.place;
    const item = itemOf(affordancesFor);
    return Object.freeze({
      place: place === null ? null : placeView(world, place),
      occupants: place === null ? Object.freeze([]) : occupantsOf(world, `${actor}${PAIR}${place}`),
      subjects: Object.freeze(view.subjects.map((id) => item(world, `${actor}${PAIR}${id}`))),
    });
  }));
  return views.get(affordancesFor);
}

// One subject as an actor perceives it, keyed by the pair: its settled cells and what the actor
// can do with it, carried while neither the subject nor what its affordances read has changed.
const PAIR = "\u0000";
const items = new WeakMap();
function itemOf(affordancesFor) {
  if (!items.has(affordancesFor)) items.set(affordancesFor, deriveWorldReading((world, pair) => {
    const [actor, id] = pair.split(PAIR);
    return Object.freeze({
      id,
      cells: Object.freeze(settleSubject(world, id).map((cell) => Object.freeze({
        predicate: cell.predicate, object: cell.object, evidence: evidenceName(cell),
        for: cell.for, against: cell.against,
        ...(cell.value === undefined ? {} : { value: cell.value }),
      }))),
      affordances: Object.freeze([...affordancesFor(world, actor, id)]),
    });
  }));
  return items.get(affordancesFor);
}

// The last frame admitted over each view. A frame is its view at a moment with the clock and the
// actor's recent events; asked again of the same view, moment, clock and events, it is that frame.
const framed = new WeakMap();
const eventsMark = (events) => `${events.length}:${events.at(-1)?.id ?? events.at(-1)?.tick ?? ""}`;

/**
 * The one algorithm every feltos/qwzspace perception frame is built by: perceive() the actor's
 * subjects, settle each one's cells, compute affordances per subject, assemble the shared frame
 * shape, and admit() it against the game's own frameType before returning — never construct a
 * frame object by hand and skip the admission check. A frame whose view, moment, clock and
 * events are unchanged is the frame already admitted, the same value.
 */
export function buildPerceptionFrame(options) {
  const { frameType, kind, world, actor, tick, recentEvents = [], clock, affordancesFor } = options;
  const reading = options.reading === undefined ? world : rebindWorldReading(options.reading, world);
  const view = viewOf(affordancesFor)(reading, actor);
  const situation=options.situation??(options.engine?Object.freeze({...territoryOf(reading,actor),actions:availableActions({...options.engine,world},actor,{runtime:options.runtime,reading:options.reading})}):undefined);
  const mark = `${kind}\n${tick}\n${eventsMark(recentEvents)}\n${JSON.stringify(clock)}\n${JSON.stringify(situation)}`;
  const last = framed.get(view);
  if (last?.frameType === frameType && last.mark === mark) return last.frame;
  const frame = { kind, tick, actor, place: view.place, occupants: view.occupants, subjects: view.subjects, clock, recentEvents: [...recentEvents],...(situation===undefined?{}:{situation}) };
  const validated = validateFrame(frameType, frame);
  if (!validated.ok) throw new Error(`feltos/perception-frame: perception frame shape refused: ${JSON.stringify(validated.refusal)}`);
  // admit() validates frame against frameType without transforming it; frameType's own DataType<>
  // generic can't carry the caller's specific schema through this function's non-generic
  // `frameType: DataType` parameter, so admitted.value's inferred type is wider than reality —
  // the cast reasserts what is actually true at runtime.
  framed.set(view, { frameType, mark, frame: validated.value });
  return validated.value;
}

/** The qwzspace snapshot-manager entry shape: `{ id, ...buildPerceptionFrame(options) }` so `id`
 *  matches the actor subject and the whole frame rides verbatim inside snapshot.e / delta.c. */
export function perceptionSnapEntry(options) {
  return { id: options.actor, ...buildPerceptionFrame(options) };
}
