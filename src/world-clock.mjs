import { sha256 } from "@red-cup-engineering/semiotic-content-address-system";
import { canonicalJson } from "@red-cup-engineering/json-engine/canonical-json";
import { integer, PHASE_LENGTH, SEASON_LENGTH, phaseAt, tideAt, normalizeSeasonProfile, seasonReadingAt } from "./game-content/calendar.mjs";
import { defineCapability } from "./capabilities.mjs";
import { cells, declareFunctional, tell, value } from "./world.mjs";
import { isReading, sidesOfReading } from "@red-cup-engineering/metrologic/four";

export { DAY_LENGTH, PHASE_LENGTH, SEASON_LENGTH, TIDE_LENGTH, phaseAt, seasonAt, tideAt } from "./game-content/calendar.mjs";

export const CLOCK = "feltos:clock";

export function clockTime(world) {
  return integer(Number(value(world, CLOCK, "world-time") ?? 0), "world time");
}

export function clockSeed(world) {
  const seed = value(world, CLOCK, "world-seed");
  return typeof seed === "string" ? seed : "feltos";
}

function unitHash(seed, time) {
  const bytes = Buffer.from(sha256(canonicalJson([seed, time])));
  return bytes.readUInt32BE(0) / 0x1_0000_0000;
}

/** Weather holds for a spell of one phase: it is sampled at the spell's first hour.
 * A non-Earth author profile supplies independently declared environmental
 * effects; its season NAME never creates temperature or rain by coincidence.
 * Unsettled calendars grant no inferred seasonal weather bias. This is simulation,
 * not a real environmental observation. */
export function weatherAt(seed, time, profile) {
  const spell = Math.floor(integer(time, "time") / PHASE_LENGTH) * PHASE_LENGTH;
  const sample = unitHash(seed, spell);
  const seasonalEffects = profile === null ? null : seasonReadingAt(spell, profile).effects;
  const rainBias = seasonalEffects?.rainBias ?? 0;
  if (sample < 0.05 + rainBias / 3) return "storm";
  if (sample < 0.25 + rainBias) return "rain";
  if (sample > 0.92 && seasonalEffects?.heatSpell === true) return "heat";
  return "clear";
}

const wet = (weather) => weather === "rain" || weather === "storm";

/**
 * Hours since the last wet hour, read from the weather law rather than kept: the world's first
 * hour counts as wet, and a streak longer than a season reads as a season.
 */
export function dryStreakAt(seed, time, profile) {
  integer(time, "time");
  if (wet(weatherAt(seed, time, profile))) return 0;
  const floor = Math.max(0, time - SEASON_LENGTH);
  for (let spell = Math.floor(time / PHASE_LENGTH) * PHASE_LENGTH - PHASE_LENGTH; spell >= floor; spell -= PHASE_LENGTH) {
    if (wet(weatherAt(seed, spell, profile))) return time - (spell + PHASE_LENGTH - 1);
  }
  return time - floor;
}

/**
 * A world may author one calendar profile as its original clock evidence.
 * Missing evidence preserves the historical default. Conflicting, denied
 * or malformed evidence is UNKNOWN, never silently relabeled "spring".
 */
export function seasonProfileOf(world) {
  const claims = cells(world, CLOCK, "season-profile");
  if (claims.length === 0) return Object.freeze({ status: "default", profile: undefined });
  if (claims.length !== 1 || !isReading(claims[0].evidence)) {
    return Object.freeze({ status: "uncertain", profile: null });
  }
  const [forIt, againstIt] = sidesOfReading(claims[0].evidence);
  if (!forIt || againstIt) return Object.freeze({ status: "uncertain", profile: null });
  try {
    const normalized = normalizeSeasonProfile(claims[0].object);
    return Object.freeze({
      status: "authored",
      profile: Object.freeze({ offset: normalized.offset, seasons: normalized.seasons }),
    });
  } catch {
    return Object.freeze({ status: "uncertain", profile: null });
  }
}

export function seasonReadingOf(world, time = clockTime(world)) {
  const selected = seasonProfileOf(world);
  return selected.status === "uncertain" ? null : seasonReadingAt(time, selected.profile);
}

export function dryStreak(world) {
  return dryStreakAt(clockSeed(world), clockTime(world), seasonProfileOf(world).profile);
}

const CLOCK_PREDICATES = Object.freeze(["world-time", "world-seed", "weather", "season-profile"]);

export function initializeClock(world, { seed = "feltos", time = 0, seasonProfile } = {}) {
  if (typeof seed !== "string" || seed.length === 0) throw new TypeError("world seed must be non-empty text");
  integer(time, "world time");
  const normalized = seasonProfile === undefined ? null : normalizeSeasonProfile(seasonProfile);
  const authored = normalized === null ? undefined : { offset: normalized.offset, seasons: normalized.seasons };
  // World-authored calendar claims already present at initialization belong to
  // the original World. The initializer must use them for its *first* weather
  // reading; silently assuming Earth's default until tick two is a causal bug.
  const selected = authored === undefined ? seasonProfileOf(world).profile : authored;
  world = declareFunctional(world, CLOCK_PREDICATES);
  return tell(world, [
    { subject: CLOCK, predicate: "world-seed", object: seed },
    { subject: CLOCK, predicate: "world-time", object: time },
    ...(authored === undefined ? [] : [{ subject: CLOCK, predicate: "season-profile", object: authored }]),
    { subject: CLOCK, predicate: "weather", object: weatherAt(seed, time, selected) },
  ], { source: "feltos.world-clock" });
}

/** The hour is the clock's one per-tick fact; the sky is told only when its spell turns. */
export function advanceClock(world, steps = 1) {
  integer(steps, "clock steps");
  const time = clockTime(world) + steps;
  const weather = weatherAt(clockSeed(world), time, seasonProfileOf(world).profile);
  return tell(declareFunctional(world, CLOCK_PREDICATES), [
    { subject: CLOCK, predicate: "world-time", object: time },
    ...(value(world, CLOCK, "weather") === weather ? [] : [{ subject: CLOCK, predicate: "weather", object: weather }]),
  ], { source: "feltos.world-clock" });
}

/** A local clock reading is not a civil instant or a Body-relative rhythm.
 * The containing World/host supplies its own original identity and epoch;
 * neither the deterministic weather seed nor the tick number identifies a
 * globally comparable clock. */
export function clockReport(world) {
  const time = clockTime(world);
  const selected = seasonProfileOf(world);
  const seasonReading = selected.status === "uncertain" ? null : seasonReadingAt(time, selected.profile);
  return Object.freeze({
    temporalBasis: "world-local-logical-hour-tick",
    clockSubject: CLOCK,
    time,
    phase: phaseAt(time),
    season: seasonReading?.season ?? null,
    seasonSource: selected.status,
    seasonReading,
    tide: tideAt(time),
    weather: value(world, CLOCK, "weather") ?? weatherAt(clockSeed(world), time, selected.profile),
    dryStreak: dryStreak(world),
  });
}

export const worldClockCapability = defineCapability({
  id: "feltos.world-clock",
  functionalPredicates: CLOCK_PREDICATES,
  onTick(ctx) {
    const initialized = value(ctx.world, CLOCK, "world-seed") === null
      ? initializeClock(ctx.world, { seed: ctx.game.id })
      : ctx.world;
    return { world: advanceClock(initialized) };
  },
  // Time is its own closed form: the hour jumps and the sky is the weather law at the new hour.
  onElapse(world, hours, ctx) {
    const initialized = value(world, CLOCK, "world-seed") === null
      ? initializeClock(world, { seed: ctx.game.id })
      : world;
    return advanceClock(initialized, hours);
  },
});
