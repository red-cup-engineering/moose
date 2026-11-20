/**
 * The agent-legible perception frame for a FeltOS game. The shape is declared once through
 * `@red-cup-engineering/computer-system-engine`'s type system; games vary only its kind and
 * clock fields, extending the latter with `specializeType` when necessary.
 *
 * `admit()`ing a constructed frame against its declared type (see `createPerceptionFrameType`)
 * is the actual point of descending from this system rather than only sharing TypeScript
 * interfaces: a shape bug is caught at runtime, in the same place every other admission refusal
 * in the Group is caught, not only erased at compile time.
 */
import { admit, defineType, specializeType } from "@red-cup-engineering/typed-content";
import { readingFamilies, readingSchema } from "@red-cup-engineering/metrologic/four";

function established(result, what) {
  if (!result.ok) throw new Error(`feltos/perception-frame: ${what} failed to establish: ${JSON.stringify(result.refusal)}`);
  return result.value;
}

export const PerceptionCellType = established(defineType({
  id: "feltos.perception.cell@1",
  name: "Perception cell",
  description: "One perceived SignCell: predicate, object, settled FOUR reading, and optional native witness sides and value. The enclosing subject supplies its subject coordinate.",
  schema: {
    type: "object",
    required: ["predicate", "object", "evidence"],
    properties: {
      predicate: { type: "string", minLength: 1 },
      object: {},
      evidence: { enum: Object.values(readingFamilies).flat() },
      for: { type: "array", items: {} },
      against: { type: "array", items: {} },
      value: readingSchema("knowledge"),
    },
    additionalProperties: false,
  },
  parents: [],
}), "PerceptionCellType");

export const PerceptionSubjectType = established(defineType({
  id: "feltos.perception.subject@1",
  name: "Perception subject",
  description: "One subject in an actor's interest set: its settled cells and the affordances it currently offers that actor.",
  schema: {
    type: "object",
    required: ["id", "cells", "affordances"],
    properties: {
      id: { type: "string", minLength: 1 },
      cells: { type: "array", items: PerceptionCellType.schema },
      affordances: { type: "array", items: { type: "string", minLength: 1 } },
    },
    additionalProperties: false,
  },
  parents: [],
}), "PerceptionSubjectType");

export const PerceptionEventType = established(defineType({
  id: "feltos.perception.event@1",
  name: "Perception event",
  description: "One discrete broadcast event (chat, world banner, ...) carried in a perception frame's recentEvents.",
  schema: {
    type: "object",
    required: ["tick", "channel", "text"],
    properties: {
      id: { type: "string", minLength: 1 },
      tick: { type: "integer" },
      channel: { type: "string", minLength: 1 },
      text: { type: "string" },
    },
    additionalProperties: false,
  },
  parents: [],
}), "PerceptionEventType");

/**
 * The clock fields every feltos world-clock reports, regardless of game. Deliberately left open
 * (`additionalProperties: true`) so a game's own clock report can `specializeType` in its own
 * extra fields (farstone's harborClosed/shellfishClosed/fireDanger) without the base declaration
 * refusing the wider value — that is what makes the intersection in `specializeType` additive
 * rather than a conflict.
 */
export const PerceptionClockType = established(defineType({
  id: "feltos.perception.clock@1",
  name: "Perception clock",
  description: "The common feltos world-clock report fields every game's perception frame carries.",
  schema: {
    type: "object",
    required: ["time", "phase", "season", "tide", "weather", "dryStreak"],
    properties: {
      time: { type: "number" },
      phase: { type: "string", minLength: 1 },
      season: { type: "string", minLength: 1 },
      tide: { type: "string", minLength: 1 },
      weather: { type: "string", minLength: 1 },
      dryStreak: { type: "integer", minimum: 0 },
    },
    additionalProperties: true,
  },
  parents: [],
}), "PerceptionClockType");

/**
 * Specialize the base clock type with a game's own extra fields. `localSchema` supplies only the
 * additional `required`/`properties` beyond the base six; the returned type's extent is the
 * intersection (a value must satisfy both).
 */
export function specializePerceptionClockType(
  id,
  name,
  description,
  localSchema,
) {
  return established(specializeType([PerceptionClockType], {
    id,
    name,
    description,
    schema: { type: "object", additionalProperties: true, ...localSchema },
  }), `specialized clock type ${id}`);
}

const PLACE_SCHEMA = {
  oneOf: [
    { type: "null" },
    {
      type: "object",
      required: ["id", "name", "description", "exits"],
      properties: {
        id: { type: "string", minLength: 1 },
        name: { type: "string" },
        description: { type: "string" },
        exits: { type: "array", items: { type: "string", minLength: 1 } },
      },
      additionalProperties: false,
    },
  ],
};

const OCCUPANT_SCHEMA = {
  type: "object",
  required: ["id", "name"],
  properties: { id: { type: "string", minLength: 1 }, name: { type: "string" } },
  additionalProperties: false,
};

/**
 * Declare one game's own top-level perception-frame type: `kindId` becomes the frame's constant
 * `kind` discriminant, `clockType` is that game's own clock type (the base `PerceptionClockType`
 * directly, or one specialized via `specializePerceptionClockType`). Every other field (place,
 * occupants, subjects, recentEvents) is the shared shape every game uses unchanged.
 */
export function createPerceptionFrameType(kindId, clockType) {
  const frameType = established(defineType({
    id: `${kindId}.frame@1`,
    name: `${kindId} perception frame`,
    description: `The agent-legible perception frame for ${kindId}.`,
    schema: {
      type: "object",
      required: ["kind", "tick", "actor", "place", "occupants", "subjects", "clock", "recentEvents"],
      properties: {
        kind: { const: kindId },
        tick: { type: "integer" },
        actor: { type: "string", minLength: 1 },
        place: PLACE_SCHEMA,
        occupants: { type: "array", items: OCCUPANT_SCHEMA },
        subjects: { type: "array", items: PerceptionSubjectType.schema },
        clock: clockType.schema,
        recentEvents: { type: "array", items: PerceptionEventType.schema },
        situation: {
          type:'object',required:['dimension','world','area','place','path','actions'],additionalProperties:false,
          properties:{
            dimension:{type:['string','null']},world:{type:['string','null']},area:{type:['string','null']},place:{type:['string','null']},
            path:{type:'array',items:{type:'string'}},
            actions:{type:'array',items:{type:'object',required:['command','description'],additionalProperties:false,properties:{command:{type:'string'},description:{type:'string'},world:{type:['string','null']},ref:{type:'string'},source:{type:'string'},scope:{type:'string'},locus:{type:'string'},category:{enum:['direct','public','office','allocation','delegation']},input:{type:'object',required:['id','schema','references'],properties:{id:{type:'string'},schema:{type:['object','boolean']},references:{type:'array',items:{type:'object'}}},additionalProperties:false},output:{type:'object',required:['id','schema','references'],properties:{id:{type:'string'},schema:{type:['object','boolean']},references:{type:'array',items:{type:'object'}}},additionalProperties:false},provider:{type:'object',required:['actor','operation','verb'],additionalProperties:false,properties:{actor:{type:'string'},operation:{type:'string'},verb:{type:'string'}}}}}},
          },
        },
      },
      additionalProperties: false,
    },
    parents: [],
  }), `perception frame type ${kindId}`);
  // The frame type is a product: its envelope (every field but subjects' members) and each subject
  // against PerceptionSubjectType. Admitting the parts admits the whole.
  envelopes.set(frameType, established(defineType({
    id: `${kindId}.frame-envelope@1`,
    name: `${kindId} perception frame envelope`,
    description: `A ${kindId} perception frame with its subjects admitted separately.`,
    schema: { ...frameType.schema, properties: { ...frameType.schema.properties, subjects: { type: "array" } } },
    parents: [],
  }), `perception frame envelope ${kindId}`));
  return frameType;
}

const envelopes = new WeakMap();
const admittedSubjects = new WeakSet();

/**
 * Admit a perception frame against its declared type. A frame type declared by
 * `createPerceptionFrameType` is admitted by parts: its envelope, then each subject, where a frozen
 * subject value already admitted is not admitted again. Any other type is admitted whole.
 */
export function admitFrame(frameType, frame) {
  const envelope = envelopes.get(frameType);
  if (envelope === undefined) return admit(frameType, frame);
  const shell = admit(envelope, frame);
  if (!shell.ok) return shell;
  for (const subject of frame.subjects) {
    if (admittedSubjects.has(subject)) continue;
    const admitted = admit(PerceptionSubjectType, subject);
    if (!admitted.ok) return admitted;
    if (Object.isFrozen(subject)) admittedSubjects.add(subject);
  }
  return Object.freeze({ ok: true, value: frame });
}

export { admit };
