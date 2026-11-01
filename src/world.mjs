import { cell, certainObject, knowledgeReading, retainedCarrier } from "@red-cup-engineering/knowledge-system-server/signcell";
import { isReading, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { captureHistoryReads, createHistory, validateHistory, observeHistory, replayHistory, continueHistory, historySection, historySubjects, historyHeads, queryHistory, withFunctionalPredicates } from "@red-cup-engineering/knowledge-system-server/history";
import { deriveWorldReading, isWorldReading, rebindWorldReading } from "./world-reading.mjs";
import { bearing, bodyCentroid, boxDistance, contactOf, distance, prismContains, regionBounds, regionContains, segmentThroughPrism } from "./geometry.mjs";

// A reading is explicit read-only context; observation and persistence still require raw history.
const sectionOf = (world, subject, predicate) => isWorldReading(world)
  ? world.section(subject, predicate) : historySection(world, subject, predicate);
const subjectsOf = (world) => isWorldReading(world) ? world.subjects() : historySubjects(world);
export const queryWorld = (world, pattern) => isWorldReading(world) ? world.query(pattern) : queryHistory(world, pattern);

export const LOCATED_IN = "located-in";
/** A place's extent in space: {body, reaches} convex prisms (see geometry.mjs). */
export const REGION = "region";
/** Where a subject stands: {position: [x, y, z], heading} in metres and degrees from north. */
export const POSE = "pose";
// Every world's schema: predicates that supersede rather than accumulate. A session's role is here,
// not declared when the first session connects, so no live world widens over cells it already holds.
const DEFAULT_FUNCTIONAL = [LOCATED_IN, "description", "kind", "name", "role"];
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export const createWorld = ({ functionalPredicates = [] } = {}) => createHistory([...DEFAULT_FUNCTIONAL, ...functionalPredicates]);
export const validateWorld = validateHistory;
export const declareFunctional = withFunctionalPredicates;

function observationCells(claims, source, parents) {
  const batch = Array.isArray(claims) ? claims : [claims];
  return batch.map((claim, position) => {
    if (typeof claim.subject !== "string" || !claim.subject || typeof claim.predicate !== "string" || !claim.predicate) throw new TypeError("World claims need a subject and predicate");
    const [positive, negative] = sidesOfReading(claim.evidence ?? "potential");
    const witness = { source, parents, position };
    return cell(claim.subject, claim.predicate, claim.object, { for: positive ? [witness] : [], against: negative ? [witness] : [] });
  });
}

/** World observations use SignCell evidence and SignCraft causal history. */
export function tell(world, claims, { source = "feltos" } = {}) {
  validateWorld(world);
  return observeHistory(world, observationCells(claims, source, historyHeads(world)), { source });
}

/** Import ordered world observations with the same witnesses and causal revisions as tell. */
export function replayWorld(world, observations) {
  return replayHistory(world, observations, ({ claims, source = "feltos" }, parents) => ({
    source, cells: observationCells(claims, source, parents),
  }));
}

/** A world continued by revisions decoded from a durable save, admitted by their addresses. */
export const continueWorld = (world, revisions) => continueHistory(world, revisions);

/** The game's text reading of upstream cells; settlement belongs to SignCraft. A subject's reading
 * is carried to every later world that observes nothing of it. */
export const settleSubject = deriveWorldReading((world, subject) => Object.freeze(sectionOf(world, subject).map((at) => Object.freeze({
  ...at,
  evidence: knowledgeReading(at),
  sources: Object.freeze([...new Set([...at.for, ...at.against].map((witness) => witness.source))].sort()),
})).sort((a, b) => compareText(a.predicate, b.predicate))));
export const subjects = (world) => Object.freeze([...subjectsOf(world)].sort(compareText));
export const settledWorld = (world) => Object.freeze(subjects(world).flatMap((subject) => settleSubject(world, subject)));
export const cells = (world, subject, predicate) => Object.freeze(sectionOf(world, subject, predicate).map((at) => Object.freeze({ ...at, evidence: knowledgeReading(at) })));
export const isAffirmed = (evidence) => isReading(evidence) && sidesOfReading(evidence)[0];
/** A value whose evidence is positive and uncontradicted, with no competing cell. */
export function certainValue(world,subject,predicate) {
  return certainObject(sectionOf(world, subject, predicate));
}

/** Current graph edges, including authored changes made after the world was started. */
export const exitsOf=deriveWorldReading((world,room)=>Object.freeze(
  [...new Set(settleSubject(world,room).filter(cell=>cell.predicate.startsWith('exit:')).map(cell=>cell.predicate.slice(5)))]
    .sort(compareText).flatMap(direction=>{
      const destination=certainValue(world,room,`exit:${direction}`);
      return typeof destination==='string'?[Object.freeze({direction,destination})]:[];
    })
));

/** Inhabitation is containment in the native carrier, never a parallel location table. */
export const territoryOf=deriveWorldReading((world,actor)=>{
 const kind=certainValue(world,actor,'kind'),place=['room','area','world','dimension'].includes(kind)?actor:certainValue(world,actor,LOCATED_IN),path=[],seen=new Set();let subject=place,worldId=null,area=null,dimension=null;
 while(typeof subject==='string'&&!seen.has(subject)){
  seen.add(subject);path.push(subject);
  const kind=certainValue(world,subject,'kind');
  if(kind==='area'&&area===null)area=subject;
  if(kind==='world'&&worldId===null)worldId=subject;
  if(kind==='dimension')dimension=subject;
  subject=certainValue(world,subject,LOCATED_IN)??certainValue(world,subject,'part-of');
 }
 return Object.freeze({dimension,world:worldId,area,place,path:Object.freeze(path)});
});

export function value(world, subject, predicate) {
  const found = cells(world, subject, predicate).filter(({ evidence }) => isAffirmed(evidence));
  return found.length === 1 ? found[0].object : null;
}
export const values = (world, subject, predicate) => Object.freeze(cells(world, subject, predicate).filter(({ evidence }) => isAffirmed(evidence)).map(({ object }) => object));

export function placeOf(world, subject) {
  const place = value(world, subject, LOCATED_IN);
  return typeof place === "string" ? place : null;
}

/** Follow physical containment to the surrounding place (for example, crew on a vessel at sea). */
export function outerPlaceOf(world, subject) {
  let current = subject;
  let traversed = false;
  const seen = new Set();
  while (typeof current === "string" && !seen.has(current)) {
    seen.add(current);
    const container = placeOf(world, current) ?? value(world, current, "part-of");
    if (typeof container !== "string"||["world","area","dimension"].includes(certainValue(world,container,"kind"))) return traversed ? current : null;
    current = container;
    traversed = true;
  }
  return null;
}

export function contentsOf(world, container) {
  return Object.freeze([...new Set(queryWorld(world, { predicate: LOCATED_IN, object: container }).filter((at) => at.for.length > 0).map((at) => at.subject))].filter((subject) => placeOf(world, subject) === container).sort(compareText));
}

const isPose = (pose) => pose !== null && typeof pose === "object" && Array.isArray(pose.position)
  && pose.position.length === 3 && pose.position.every(Number.isFinite) && Number.isFinite(pose.heading);
const isRegion = (region) => region !== null && typeof region === "object" && region.body !== null && typeof region.body === "object";

export function regionOf(world, place) {
  const region = value(world, place, REGION);
  return isRegion(region) ? region : null;
}

/** Every place with an extent, as a cover {place: region}; empty in a world of rooms alone. */
export const regionsOf = deriveWorldReading((world) => {
  const regions = {};
  for (const at of queryWorld(world, { predicate: REGION })) {
    if (!(at.subject in regions) && regionOf(world, at.subject) !== null) regions[at.subject] = regionOf(world, at.subject);
  }
  return Object.freeze(regions);
});

const containerOf = (world, subject) => {
  const container = placeOf(world, subject) ?? value(world, subject, "part-of");
  return typeof container === "string" ? container : null;
};

/** The innermost place with an extent that holds a subject, through containment. */
export function regionPlaceOf(world, subject) {
  const seen = new Set([subject]);
  for (let current = containerOf(world, subject); current !== null && !seen.has(current); current = containerOf(world, current)) {
    if (regionOf(world, current) !== null) return current;
    seen.add(current);
  }
  return null;
}

/**
 * Where a subject is in space. A subject inside a posed container (a pocket, a vessel's deck)
 * is carried: it stands where its container stands. A subject held by a region stands at its
 * own pose. A subject in a place without extent is not in space, whatever pose it last held.
 */
export function worldPose(world, subject) {
  const seen = new Set([subject]);
  for (let current = containerOf(world, subject); current !== null && !seen.has(current); current = containerOf(world, current)) {
    if (regionOf(world, current) !== null) {
      const own = value(world, subject, POSE);
      return isPose(own) ? own : null;
    }
    if (isPose(value(world, current, POSE))) return worldPose(world, current);
    seen.add(current);
  }
  return null;
}

/** Where a subject entering `destination` stands: the threshold it crosses, else the place's authored arrival, else the body's floor. */
function arrivalPose(world, subject, destination, region, current) {
  const from = regionPlaceOf(world, subject);
  const contact = from === null ? null : contactOf(regionOf(world, from), region);
  if (contact !== null) {
    const position = [contact.centroid[0], contact.centroid[1], contact.z[0]];
    return { position, heading: current === null ? 0 : bearing(current.position, position) };
  }
  const arrival = value(world, destination, "arrival");
  if (isPose(arrival)) return arrival;
  const [x, y] = bodyCentroid(region);
  return { position: [x, y, region.body.z[0]], heading: current?.heading ?? 0 };
}

/**
 * Put a subject in a place. In a place with an extent the subject's pose moves with it, so
 * `located-in` and `pose` change together and the pose always lies in the place that holds it.
 */
export function move(world, subject, destination, options) {
  const located = { subject, predicate: LOCATED_IN, object: destination };
  const reading = options?.reading === undefined || options.reading === world ? world : rebindWorldReading(options.reading, world);
  const region = regionOf(reading, destination);
  if (region === null) return tell(world, located, options);
  const current = worldPose(reading, subject);
  const pose = current !== null && regionContains(region, current.position) ? current : arrivalPose(reading, subject, destination, region, current);
  const own = value(reading, subject, POSE);
  return isPose(own) && JSON.stringify(own) === JSON.stringify(pose)
    ? tell(world, located, options)
    : place(world, subject, destination, pose, options);
}

/** Set a subject's place and pose together; a pose names one point, so it is functional. A step
 * within the place that already holds the subject observes only where it now stands. */
export function place(world, subject, destination, pose, options) {
  if (!isPose(pose)) throw new TypeError("A pose needs a finite [x, y, z] position and heading");
  const posed = declareFunctional(world, [POSE]);
  const reading = options?.reading === undefined || options.reading === world ? posed : rebindWorldReading(options.reading, posed);
  return tell(posed, [
    ...(placeOf(reading, subject) === destination ? [] : [{ subject, predicate: LOCATED_IN, object: destination }]),
    { subject, predicate: POSE, object: pose },
  ], options);
}

/** Transfer physical possession and its owner claim through the same world effect. */
export function transferItem(world, item, recipient, { source = "feltos.item.transfer" } = {}) {
  return tell(declareFunctional(world, ["owner"]), [
    { subject: item, predicate: "owner", object: recipient },
    { subject: item, predicate: LOCATED_IN, object: recipient },
  ], { source });
}

export const DEFAULT_SIGHT = 300;
const EYE_HEIGHT = 1.6;

/**
 * Whether the segment between two points is clear. An enclosed region's walls stop sight:
 * a segment through an enclosed body that holds neither end is blocked, and a segment leaving
 * an enclosed body that holds one end is clear only where it leaves through one of the body's
 * reaches (a doorway, window, or open stair). Open regions do not occlude. Terrain is not yet
 * an occluder.
 */
export function lineOfSight(regions, p, q) {
  for (const region of Object.values(regions)) {
    if (region.enclosed !== true) continue;
    const inP = prismContains(region.body, p), inQ = prismContains(region.body, q);
    if (inP && inQ) continue;
    const span = segmentThroughPrism(region.body, p, q);
    if (span === null || span[1] - span[0] < 1e-9) continue;
    if (!inP && !inQ) return false;
    const t = inP ? span[1] : span[0];
    const crossing = [0, 1, 2].map((axis) => p[axis] + (q[axis] - p[axis]) * t);
    if (!(region.reaches ?? []).some((reach) => prismContains(reach, crossing))) return false;
  }
  return true;
}

const eye = (pose) => [pose.position[0], pose.position[1], pose.position[2] + EYE_HEIGHT];

const boxes = new WeakMap();
const boxOf = (region) => {
  if (!boxes.has(region)) boxes.set(region, regionBounds(region));
  return boxes.get(region);
};

/** What a place holds through containment: its contents and the rooms that are part of it, and
 * theirs in turn, down to (not into) the other places with extent, which hold their own. It reads
 * containment alone, so it is carried across every step that only moves a subject within a place. */
const holdingsOf = deriveWorldReading((world, place) => {
  const regions = regionsOf(world), held = new Set();
  const hold = (container) => {
    const rooms = queryWorld(world, { predicate: "part-of", object: container }).filter((at) => at.for.length > 0).map((at) => at.subject)
      .filter((room) => placeOf(world, room) === null && value(world, room, "part-of") === container);
    for (const subject of [...contentsOf(world, container), ...rooms]) {
      if (held.has(subject)) continue;
      held.add(subject);
      if (!Object.hasOwn(regions, subject)) hold(subject);
    }
  };
  hold(place);
  return Object.freeze([...held]);
});

// What one actor sees of one subject: the subject and, when it is a movable place, who stands in
// its rooms; nothing when it holds no pose of its own or is out of range or out of sight. Keyed by
// the pair, so a step re-reads only the pairs whose either end moved, and a pair still seeing what
// it saw leaves the actor's perception as it was.
const PAIR = "\u0000";
const sightPair = deriveWorldReading((world, pair) => {
  const [actor, subject] = pair.split(PAIR);
  if (!cells(world, subject, POSE).some((at) => at.for.length > 0)) return Object.freeze([]);
  const from = worldPose(world, actor), pose = worldPose(world, subject);
  if (from === null || pose === null) return Object.freeze([]);
  const range = Number.isFinite(value(world, actor, "sight")) ? value(world, actor, "sight") : DEFAULT_SIGHT;
  if (distance(from.position, pose.position) > range || !lineOfSight(regionsOf(world), eye(from), eye(pose))) return Object.freeze([]);
  const seen = [subject];
  // A movable place in sight shows who stands in its rooms: the crew on a deck, the driver at a wheel.
  for (const room of queryWorld(world, { predicate: "part-of", object: subject }).filter((at) => at.for.length > 0).map((at) => at.subject)) {
    if (value(world, room, "part-of") === subject) seen.push(...contentsOf(world, room).filter((rider) => rider !== actor));
  }
  return Object.freeze(seen);
});

/**
 * The posed subjects within an actor's sight range and line of sight. Sight reads the cover: a
 * subject in space stands within the place with extent that holds it, so only the places whose
 * extent comes within range can hold what the actor sees, and the rest of the island is never read.
 */
export function sightOf(world, actor) {
  const from = worldPose(world, actor);
  if (from === null) return Object.freeze([]);
  const regions = regionsOf(world);
  if (Object.keys(regions).length === 0) return Object.freeze([]);
  const range = Number.isFinite(value(world, actor, "sight")) ? value(world, actor, "sight") : DEFAULT_SIGHT;
  const seen = [];
  for (const [place, region] of Object.entries(regions)) {
    if (territoryOf(world,actor).world !== territoryOf(world,place).world) continue;
    if (boxDistance(from.position, boxOf(region)) > range) continue;
    for (const subject of holdingsOf(world, place)) {
      if (subject !== actor) seen.push(...sightPair(world, `${actor}${PAIR}${subject}`));
    }
  }
  return Object.freeze([...new Set(seen)].sort(compareText));
}

/** How far a speaking voice carries in open space, in metres. */
export const DEFAULT_EARSHOT = 40;

/**
 * Who hears a speaker: everyone in its place, and, where places have extent, every listener
 * standing within the speaker's earshot. Sound bends around what stops sight, so hearing is
 * by distance alone; a subject with a `voice-range` carries further or less far.
 */
export function earshotOf(world, speaker, listeners) {
  const place = placeOf(world, speaker);
  const from = worldPose(world, speaker);
  const range = Number.isFinite(value(world, speaker, "voice-range")) ? value(world, speaker, "voice-range") : DEFAULT_EARSHOT;
  return Object.freeze(listeners.filter((listener) => {
    if(territoryOf(world,speaker).world!==territoryOf(world,listener).world)return false;
    if (listener === speaker || (place !== null && placeOf(world, listener) === place)) return true;
    if (from === null) return false;
    const at = worldPose(world, listener);
    return at !== null && distance(from.position, at.position) <= range;
  }));
}

/** Who sees a gesture: everyone in the actor's place, and every listener with the actor in sight. */
export function witnessesOf(world, actor, onlookers) {
  const place = placeOf(world, actor);
  return Object.freeze(onlookers.filter((onlooker) => onlooker === actor
    || (place !== null && placeOf(world, onlooker) === place)
    || sightOf(world, onlooker).includes(actor)));
}

/**
 * Restrict the world to the actor, its place, inventory, co-located subjects,
 * and, where places have extent, whatever it can see. Remote state is absent
 * rather than merely hidden by presentation. A perception is a reading of one world, derived once:
 * a frame asks it of every subject it affords.
 */
export const perceive = deriveWorldReading((world, actor) => {
  const { place, subjects } = perceivedOf(world, actor);
  return Object.freeze({
    kind: "feltos.perception.v1",
    actor,
    place,
    subjects,
    cells: Object.freeze(subjects.flatMap((subject) => settleSubject(world, subject))),
  });
});

/** Which subjects an actor perceives, and its place: the perception's extent without its cells. A
 * step that changes what is seen but not who is seen leaves it as it was. */
export const perceivedOf = deriveWorldReading((world, actor) => {
  const place = placeOf(world, actor);
  const visible = new Set([actor]);
  if (place !== null) {
    visible.add(place);
    for (const subject of contentsOf(world, place)) visible.add(subject);
  }
  for (const subject of contentsOf(world, actor)) visible.add(subject);
  // Sight is an observation, not a footprint: what an actor glimpses across the
  // island does not make its action conflict with everyone who moved this tick.
  for (const subject of captureHistoryReads(() => sightOf(world, actor)).result) visible.add(subject);
  return Object.freeze({ place, subjects: Object.freeze([...visible].sort(compareText)) });
});

export function evidenceName(cellValue) {
  return (cellValue.evidence);
}

/** A priced possession in a trading place remains the shop's property until exchanged. */
export function isShopWare(world, item) {
  const holder = placeOf(world, item), price = value(world, item, "price");
  return holder !== null && typeof value(world, holder, "trades-for") === "string"
    && Number.isSafeInteger(price) && price >= 0;
}


/**
 * Receive TAB/qtOps-style composed Things into the EXISTING SignCell/SignCraft
 * World history, not a second MUD engine or separate object registry.
 *
 * The producer is SignCraft's actual Thing/EAVT implementation. CAIRN's
 * selected SignCraft supplies its Thing API; a missing runtime supplier must
 * refuse this feature without preventing the rest of World from loading.
 * This is a pure authored-world transformation, NOT admission of an Actor,
 * a Work Duty, a game command, movement or an external resource grant.
 */
export async function receiveComposedThingWorld(world, composed, { source, thingOperations } = {}) {
  validateWorld(world);
  const denied = (kind, reason) => Object.freeze({
    ok: false, refusal: Object.freeze({ kind, reason }),
  });
  if (typeof source !== "string" || !source.trim())
    return denied("missing-thing-world-source", "World projection requires a named original authoring source");
  let ops = thingOperations;
  if (ops === undefined) {
    try { ops = await import("@red-cup-engineering/knowledge-system-server/thing"); }
    catch { return denied("thing-supplier-unavailable", "The selected CAIRN SignCraft dependency does not expose an admissible Thing consumer"); }
  }
  if (!ops || typeof ops.readThingSpatialProjection !== "function")
    return denied("thing-supplier-unavailable", "The original SignCraft Thing spatial reader must be installed");
  // Retain one source reading before inspecting it. Caller accessors and
  // mutable presentations cannot change between native admission and mapping.
  let held;
  try { held = retainedCarrier(composed); }
  catch { return denied("invalid-thing-world-source", "A retained original Thing composition is required"); }
  if (held?.kind !== "signcraft.composed-things.v2"
      || !Array.isArray(held.things) || !Array.isArray(held.relationPresentations)
      || !held.relationalField || held.things.length < 1 || held.things.length > 256
      || held.relationPresentations.length > 4096)
    return denied("invalid-thing-world-source", "A bounded original SignCraft Thing composition is required");
  // SignCraft re-admits the complete original type document, Utterances,
  // Thing/Cell presentations and relation field before reading space. Give
  // that owner the held source itself: recomposing locally could discard a
  // forged presentation while retaining its borrowed content address.
  const spatial = ops.readThingSpatialProjection(held);
  if (!spatial?.ok) return denied("unqualified-thing-spatial-projection",
    "Original location, Thing kind or authored Area exits are ambiguous or unavailable");
  if (!Array.isArray(spatial.value?.things) || !Array.isArray(spatial.value?.territories)
      || !Array.isArray(spatial.value?.areaExits))
    return denied("thing-world-source-drift", "The source spatial readout is not complete");
  const roles = new Map(spatial.value.things.map(row => [row.address,row]));
  const members = new Map(), rows = [];
  for (const entry of held.things) {
    const id = entry.thing.id;
    if (members.has(id)) continue; // one version, several original Utterance presentations
    const role = roles.get(id), kind = role?.kind;
    if (role?.typeId !== entry.typeId || !["dimension","world","area","task","arena",
      "work","object","quality","behavior","container","thing"].includes(kind)
        || typeof entry.thing.attributes.name !== "string"
        || !entry.thing.attributes.name.trim())
      return denied("invalid-thing-kind", "The original typed Thing role or name was not admitted");
    members.set(id, entry);
    rows.push({ subject: id, predicate: "kind", object: kind });
    rows.push({ subject: id, predicate: "name", object: entry.thing.attributes.name });
    rows.push({ subject: id, predicate: "thing-type", object: entry.typeId });
    if (typeof entry.thing.attributes.description === "string" && entry.thing.attributes.description)
      rows.push({ subject: id, predicate: "description", object: entry.thing.attributes.description });
  }
  const subjects = new Set(spatial.value.territories.map(entry => entry.subject));
  if (roles.size !== members.size || subjects.size !== members.size
      || [...members.keys()].some(id => !subjects.has(id)))
    return denied("thing-world-source-drift", "Original spatial reading omitted or duplicated a Thing");
  const areaSubjects = new Set(rows.filter(x => x.predicate === "kind" && x.object === "area")
    .map(x => x.subject));
  const coveredAreas = new Set();
  for (const area of spatial.value.areaExits) {
    if (!areaSubjects.has(area.area) || coveredAreas.has(area.area))
      return denied("thing-world-source-drift", "Area exits do not match the source Things");
    coveredAreas.add(area.area);
    for (const exit of area.exits)
      rows.push({ subject: area.area, predicate: "exit:" + exit.direction, object: exit.destination });
  }
  if (coveredAreas.size !== areaSubjects.size)
    return denied("thing-world-source-drift", "An authored Area lacks its exit reading");
  for (const row of held.relationalField.statements)
    rows.push({ subject: row.statement.subject,
      predicate: row.statement.predicate, object: row.statement.object });
  // A complete source may repeat one relation with multiple witnesses. The
  // real World keeps one current functional value; contested destinations
  // refuse here rather than superseding another author or guessing a path.
  const functional = key => key === "kind" || key === "name" || key === "description"
    || key === LOCATED_IN || key.startsWith("exit:");
  const distinct = new Map(), additions = [];
  for (const row of rows) {
    const key = JSON.stringify([row.subject, row.predicate]);
    const prior = distinct.get(key);
    if (functional(row.predicate) && prior !== undefined && prior !== row.object)
      return denied("contested-thing-world-projection", "Authored sources disagree about one functional World coordinate");
    distinct.set(key, row.object);
    if (additions.some(entry => entry.subject === row.subject
        && entry.predicate === row.predicate && entry.object === row.object)) continue;
    const existing = cells(world, row.subject, row.predicate);
    if (existing.some(entry => entry.object !== row.object || entry.evidence !== "potential"))
      return denied("conflicting-world-source", "An existing World observation cannot be silently replaced by this Thing projection");
    if (!existing.some(entry => entry.object === row.object)) additions.push(row);
  }
  if (additions.length === 0) return Object.freeze({ ok: true, value: Object.freeze({
    world, changed: false, inserted: 0, authority: "not-conferred", movement: "not-performed",
  }) });
  const next = tell(world, additions, { source });
  return Object.freeze({ ok: true, value: Object.freeze({
    world: next, changed: true, inserted: additions.length,
    authority: "not-conferred", movement: "not-performed",
  }) });
}
