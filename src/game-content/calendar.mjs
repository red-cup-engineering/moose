/** The world clock's calendar: pure arithmetic from a world time to its phase, season and tide.
 * The clock capability (world-clock.mjs) keeps the time in the world; anything that only needs to
 * read a time (a renderer in a browser, a report) reads it here without the world. */
export const PHASE_LENGTH = 6;
export const DAY_LENGTH = PHASE_LENGTH * 4;
export const SEASON_LENGTH = DAY_LENGTH * 30;
export const TIDE_LENGTH = 8;
export const TIDE_CYCLE = TIDE_LENGTH * 4;

export const PHASES = Object.freeze(["dawn", "day", "dusk", "night"]);
export const SEASONS = Object.freeze(["spring", "summer", "autumn", "winter"]);
export const TIDES = Object.freeze(["low", "rising", "high", "falling"]);

export function integer(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a nonnegative integer`);
  return value;
}

export function phaseAt(time) {
  return PHASES[Math.floor(integer(time, "time") / PHASE_LENGTH) % PHASES.length];
}

export function seasonAt(time, profile) {
  if (profile !== undefined) return seasonReadingAt(time, profile).season;
  return SEASONS[Math.floor(integer(time, "time") / SEASON_LENGTH) % SEASONS.length];
}

export function tideAt(time) {
  return TIDES[Math.floor(integer(time, "time") / TIDE_LENGTH) % TIDES.length];
}


/**
 * A season profile is an authored calendrical convention for ONE world, not an observed
 * climate, a civil UTC calendar, an astronomical claim or a civic observance. Names here
 * are local semantic IDs; the world or paracosm supplies their meaning and provenance.
 * The historical four equal seasons remain the default unless the World explicitly
 * authors a different profile. An empty seasons list explicitly means "seasonless".
 */
// Authored *simulation rules*, not measurements of temperature or rainfall.
const LEGACY_SEASON_EFFECTS = Object.freeze({
  spring: Object.freeze({ rainBias: 0.16 }),
  summer: Object.freeze({ heatSpell: true }),
  autumn: Object.freeze({}),
  winter: Object.freeze({ rainBias: 0.10, coldExposure: true }),
});

export const DEFAULT_SEASON_PROFILE = Object.freeze({
  offset: 0,
  seasons: Object.freeze(SEASONS.map((id) => Object.freeze({
    id, hours: SEASON_LENGTH, effects: LEGACY_SEASON_EFFECTS[id],
  }))),
});

export function normalizeSeasonProfile(profile) {
  if (profile === null || typeof profile !== "object" || Array.isArray(profile)) {
    throw new TypeError("season profile must be an object");
  }
  if (Object.keys(profile).some((key) => !["offset", "seasons", "cycleHours"].includes(key))) {
    throw new TypeError("unknown season profile field");
  }
  const offset = integer(profile.offset ?? 0, "season offset");
  if (!Array.isArray(profile.seasons) || profile.seasons.length > 64) {
    throw new TypeError("seasons must be an array of at most 64 entries");
  }
  const names = new Set();
  let cycleHours = 0;
  const seasons = profile.seasons.map((part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)
      || Object.keys(part).some((key) => !["id", "hours", "effects"].includes(key))
      || typeof part.id !== "string" || part.id.trim() !== part.id || !part.id.length
      || part.id.length > 256 || names.has(part.id)) {
      throw new TypeError("each season requires a unique nonempty semantic id and hours");
    }
    if (!Number.isSafeInteger(part.hours) || part.hours <= 0
      || cycleHours > Number.MAX_SAFE_INTEGER - part.hours) {
      throw new RangeError("season durations and cycle must be positive safe integers");
    }
    let effects;
    if (part.effects !== undefined) {
      if (part.effects === null || typeof part.effects !== "object" || Array.isArray(part.effects)
        || Object.keys(part.effects).some((key) => !["coldExposure", "rainBias", "heatSpell"].includes(key))) {
        throw new TypeError("season effects must be a recognized record");
      }
      if ((part.effects.coldExposure !== undefined && typeof part.effects.coldExposure !== "boolean")
        || (part.effects.heatSpell !== undefined && typeof part.effects.heatSpell !== "boolean")
        || (part.effects.rainBias !== undefined
          && (typeof part.effects.rainBias !== "number" || !Number.isFinite(part.effects.rainBias)
            || part.effects.rainBias < 0 || part.effects.rainBias > 0.75))) {
        throw new TypeError("invalid authored seasonal effects");
      }
      effects = Object.freeze({ ...part.effects });
    }
    names.add(part.id);
    cycleHours += part.hours;
    return Object.freeze({ id: part.id, hours: part.hours, ...(effects ? { effects } : {}) });
  });
  if (profile.cycleHours !== undefined && profile.cycleHours !== cycleHours) {
    throw new RangeError("authored cycleHours disagrees with season durations");
  }
  return Object.freeze({ offset, seasons: Object.freeze(seasons), cycleHours });
}

/**
 * Project an author's season-cycle onto the original nonnegative world-hour coordinate.
 * Deliberately never claims ecological arrival, weather, an epoch correspondence, or
 * that different Worlds at the same tick share a season.
 */
export function seasonReadingAt(time, profile = DEFAULT_SEASON_PROFILE) {
  integer(time, "time");
  const { offset, seasons, cycleHours } = normalizeSeasonProfile(profile);
  if (cycleHours === 0) {
    return Object.freeze({
      temporalBasis: "world-local-calendrical-cycle", status: "seasonless",
      season: null, index: null, elapsed: null, duration: null, progress: null,
      remaining: null, nextTransitionAt: null, cycleHours: 0, effects: null,
    });
  }
  // Sum modulo cycle without overflowing JS safe integers near the upper bound.
  const left = time % cycleHours, right = offset % cycleHours;
  const position = left >= cycleHours - right ? left - (cycleHours - right) : left + right;
  let first = 0;
  for (const [index, part] of seasons.entries()) {
    if (position < first + part.hours) {
      const elapsed = position - first, remaining = part.hours - elapsed;
      return Object.freeze({
        temporalBasis: "world-local-calendrical-cycle", status: "projected",
        season: part.id, index, elapsed, duration: part.hours,
        effects: part.effects ?? null, progress: elapsed / part.hours, remaining,
        nextTransitionAt: time <= Number.MAX_SAFE_INTEGER - remaining ? time + remaining : null,
        cycleHours,
      });
    }
    first += part.hours;
  }
  throw new Error("season profile violated its normalized cycle");
}
