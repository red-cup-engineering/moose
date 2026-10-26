/**
 * A transient read context over an admitted world and one immutable source edition.
 * It is neither a history nor an effect. The supplied policy owns interpretation;
 * SignCraft still owns raw observations, evidence combination and causal history.
 */
import { admitCell, coincides, retainedCarrier, semanticId } from '@red-cup-engineering/knowledge-system-server/signcell';
import {
  historyDerivation, historyHeads, historyRawOccurrences, historySection, historySectionOfCells,
  historySubjectCells, historySubjectKey, historySubjects, queryHistory, restoreHistory,
  readCapturedHistoryOccurrences, isHistoryOccurrenceFrameFor, rebindHistoryOccurrenceFrame, historyOccurrenceFrameIsCurrent,
} from '@red-cup-engineering/knowledge-system-server/history';

const policies = new WeakMap(), readings = new WeakMap(), capturedBindings = new WeakSet(), bindingVersions = new WeakMap();
const frozen = values => Object.freeze([...values]);
const text = (value, label) => {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be nonempty text`);
  return value;
};

/**
 * A pure policy receives tracked read operations, not an untracked raw carrier.
 * `read({source, edition})` returns {cells, metadata?}; cells are raw SignCells.
 * The immutable edition contains all external inputs. A policy must not consult
 * mutable closure state or reinterpret projected counterevidence as a raw fact.
 */
export function defineWorldReadingPolicy({id, version, read} = {}) {
  text(id, 'reading policy id'); text(version, 'reading policy version');
  if (typeof read !== 'function') throw new TypeError('reading policy requires a read function');
  const policy = Object.freeze({kind:'feltos.world-reading-policy.v1', id, version});
  const derive = historyDerivation((history, key) => {
    const binding = capturedBindings.has(key) ? key : null;
    const edition = binding ? binding.edition : key, occurrenceFrame = binding?.occurrenceFrame;
    const source = Object.freeze({
      subjects: () => historySubjects(history),
      rawCells(subject, predicate) {
        // Raw-cell access itself is not a tracked SignCraft query. Record the
        // complete requested range, including its absent part, before reading it.
        historySection(history, subject, predicate);
        const cells = historySubjectCells(history, subject);
        return predicate === undefined ? cells : frozen(cells.filter(at => coincides(at.predicate, predicate)));
      },
      // SignCraft owns occurrence identity, archive uncertainty and dependency tracking.
      rawOccurrences(subject, predicate, options) {
        if (!occurrenceFrame) return historyRawOccurrences(history, subject, predicate, options);
        if (options?.archive !== undefined && (options.archive === true) !== occurrenceFrame.archive.requested)
          throw new TypeError('occurrence request differs from the bound frame capture');
        return readCapturedHistoryOccurrences(occurrenceFrame, subject, predicate);
      },
      section: (subject, predicate) => historySection(history, subject, predicate),
      query: pattern => queryHistory(history, pattern),
    });
    const result = read(Object.freeze({source, edition, ...(occurrenceFrame ? {occurrenceVersion:occurrenceFrame.id} : {})}));
    if (!result || !Array.isArray(result.cells)) throw new TypeError('reading policy must return raw cells');
    const raw = result.cells.map(admitCell);
    const grouped = new Map();
    for (const cell of raw) {
      const key = historySubjectKey(cell.subject);
      if (!grouped.has(key)) grouped.set(key, {subject:cell.subject, raw:[]});
      grouped.get(key).raw.push(cell);
    }
    const entries = frozen([...grouped.values()].map(({subject, raw}) => Object.freeze({
      subject, cells:historySectionOfCells(history.functionalPredicates, subject, raw),
    })));
    return Object.freeze({entries, metadata:retainedCarrier(result.metadata ?? {})});
  });
  policies.set(policy, derive);
  return policy;
}

const identity = defineWorldReadingPolicy({
  id:'feltos.identity', version:'1',
  read:({source}) => ({cells:source.subjects().flatMap(subject => source.rawCells(subject))}),
});

/**
 * Bind one edition for all consumers of a turn/frame. Every query recalls the
 * tracked derivation inside the caller's read-capture scope, even if this context
 * was constructed earlier. Changing the edition creates a distinct cache key.
 */
export function readWorld(history, {policy = identity, edition = null, occurrenceFrame} = {}) {
  const carrier = restoreHistory(history);
  if (occurrenceFrame !== undefined && !isHistoryOccurrenceFrameFor(occurrenceFrame, carrier))
    throw new TypeError('occurrence frame requires its exact admitted carrier');
  return bindWorldReading(carrier, {policy, edition:retainedCarrier(edition), ...(occurrenceFrame ? {occurrenceFrame} : {})});
}

function bindWorldReading(history, binding) {
  const {policy, edition:retainedEdition, occurrenceFrame} = binding;
  if (occurrenceFrame && !isHistoryOccurrenceFrameFor(occurrenceFrame, history))
    throw new TypeError('occurrence frame requires its exact admitted carrier');
  if (occurrenceFrame) capturedBindings.add(binding);
  const derive = policies.get(policy);
  if (!derive) throw new TypeError('readWorld requires a defined reading policy');
  // The private binding contains only admitted immutable policy/edition/frame inputs.
  // Recalling a derived helper does not create a new source identity or admission.
  let versions = bindingVersions.get(binding);
  if (!versions) {
    versions = Object.freeze({sourceVersion:semanticId(retainedEdition),
      readingVersion:semanticId({policy:{id:policy.id, version:policy.version}, edition:retainedEdition,
        ...(occurrenceFrame ? {occurrenceFrame:occurrenceFrame.id} : {})})});
    bindingVersions.set(binding,versions);
  }
  const {sourceVersion,readingVersion}=versions;
  const read = () => derive(history, occurrenceFrame ? binding : retainedEdition);
  const section = (subject, predicate) => {
    if (policy === identity) return historySection(history, subject, predicate);
    const found = read().entries.find(entry => coincides(entry.subject, subject));
    const cells = found?.cells ?? frozen([]);
    return predicate === undefined ? cells : frozen(cells.filter(at => coincides(at.predicate, predicate)));
  };
  const context = Object.freeze({
    kind:'feltos.world-reading.v1', carrier:history, carrierHeads:historyHeads(history),
    policy:Object.freeze({id:policy.id, version:policy.version}), sourceVersion, readingVersion,
    ...(occurrenceFrame ? {occurrenceVersion:occurrenceFrame.id} : {}),
    subjects() { return policy === identity ? historySubjects(history) : frozen(read().entries.map(entry => entry.subject)); },
    section, cells:section,
    query(pattern) {
      if (policy === identity) return queryHistory(history, pattern);
      // Match SignCraft's candidate-selection order before inspecting arbitrary
      // query roles. An absent subject/predicate must not inspect unrelated cells
      // (and an unsupported role cannot make those unrelated cells throw).
      let entries = read().entries;
      if (Object.hasOwn(pattern, 'subject')) {
        const key = historySubjectKey(pattern.subject);
        entries = entries.filter(entry => historySubjectKey(entry.subject) === key);
      } else if (Object.hasOwn(pattern, 'predicate')) {
        const key = historySubjectKey(pattern.predicate);
        const reference = Object.hasOwn(pattern, 'object') && typeof pattern.object === 'string';
        entries = entries.filter(entry => entry.cells.some(at => historySubjectKey(at.predicate) === key
          && (!reference || coincides(at.object, pattern.object))));
      }
      const roles = Object.entries(pattern);
      const match = at => roles.every(([role, term]) => coincides(at[role], term));
      return frozen(entries.flatMap(entry => entry.cells).filter(match));
    },
    metadata() { return read().metadata; },
  });
  readings.set(context, binding);
  return context;
}

/** Bind the same immutable policy/edition after a genuine carrier effect. */
export function rebindWorldReading(reading, history) {
  const source = readings.get(reading);
  if (!source) throw new TypeError('expected a bound world reading');
  const carrier = restoreHistory(history);
  // Same-carrier rebinding is structural reuse, never an archive freshness check.
  // Operation admission still verifies the bound occurrence frame explicitly.
  if (carrier === reading.carrier) return reading;
  if (!source.occurrenceFrame) return bindWorldReading(carrier, source);
  return bindWorldReading(carrier, {...source, occurrenceFrame:rebindHistoryOccurrenceFrame(source.occurrenceFrame, carrier)});
}

/** True only for a read context made here, never a lookalike history envelope. */
export const isWorldReading = world => readings.has(world);

/**
 * A derived world reader with SignCraft's own caching, frame and capture laws.
 * Raw histories use the unchanged provider derivation. Projected readings bind
 * a provider derivation to their immutable policy/edition; only the genuine H
 * ever enters that derivation. Rebinding H preserves that opaque binding.
 */
export function deriveWorldReading(derive) {
  if (typeof derive !== 'function') throw new TypeError('world reading derivation requires a function');
  const raw = historyDerivation(derive), projected = new WeakMap();
  return (world, key) => {
    const binding = readings.get(world);
    if (!binding) return raw(world, key);
    let operation = projected.get(binding);
    if (!operation) {
      operation = historyDerivation((history, at) => derive(bindWorldReading(history, binding), at));
      projected.set(binding, operation);
    }
    return operation(world.carrier, key);
  };
}

/** Explicit effect-boundary access. The reading itself is never writable history. */
export function carrierOfWorldReading(reading) {
  if (!readings.has(reading)) throw new TypeError('expected a bound world reading');
  return reading.carrier;
}

/** Freshly compare the operation's archive/occurrence observation before admission.
 * This does not establish external source-edition or authority currentness.
 */
export function worldReadingOccurrenceFrameIsCurrent(reading) {
  const binding = readings.get(reading);
  if (!binding) throw new TypeError('expected a bound world reading');
  return !binding.occurrenceFrame || historyOccurrenceFrameIsCurrent(binding.occurrenceFrame);
}
