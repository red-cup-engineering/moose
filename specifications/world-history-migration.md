# World and history migration through the original CAIRN supplier

Status: proposed bounded source change; implementation and receiving remain pending.
Owner: MOOSE with the original CAIRN, SignCraft and FeltOS owners.
The governing demand and theory obligations remain in
[dimension-world-coordination.md](./dimension-world-coordination.md).

The preceding gateway move is recorded in [MOOSE #14](https://github.com/red-cup-engineering/moose/pull/14)
and [FeltOS #204](https://github.com/red-cup-engineering/feltos/pull/204).
Its receiving does not qualify the World/history change specified here.
This contract introduces no implementation claim, deployment receipt or delivery date.

## 1. Exact source baseline

Both selected SignCraft archives were read from their source-declared registry.
Their downloaded bytes matched the registry SHA-1 and SHA-512 values.
This was a read-only artifact comparison; package code was not executed.

| Artifact | Registry metadata | Archive SHA-1 | Original gitHead |
| --- | --- | --- | --- |
| SignCraft `0.5.7-dev.395`, selected by the inspected FeltOS | [Metadata](https://registry.561.group/@red-cup-engineering%2fsigncraft/0.5.7-dev.395) | `0dcb144411c484be1e4e3744d94250989c9d2300` | `9eb2124fdd8c7582035b13557ff2600a17039842` |
| SignCraft `0.6.1-dev.2`, selected by the inspected CAIRN | [Metadata](https://registry.561.group/@red-cup-engineering%2fsigncraft/0.6.1-dev.2) | `6d6c53998b3b99f61f78e30184dd3781b94e8c6d` | `7da604a55f75091c11c3b8aa14dd1f335f7759f2` |

The following implementations and package export targets are identical in both archives:

| Public entry | Original file | Bytes | Git blob |
| --- | --- | --- | --- |
| `./history` | `src/history.mjs` | 44,590 | `ef4979f362ba9d3d02c0dad87c93fbadb36714a2` |
| `./thing` | `src/thing.mjs` | 27,316 | `e75270158e92c004fabd78a3e0d679de3e3cfb45` |

Pinned [history source](https://github.com/red-cup-engineering/signcraft/blob/7da604a55f75091c11c3b8aa14dd1f335f7759f2/src/history.mjs)
and [Thing source](https://github.com/red-cup-engineering/signcraft/blob/7da604a55f75091c11c3b8aa14dd1f335f7759f2/src/thing.mjs)
identify the existing producers. The version difference does not establish an API incompatibility.

CAIRN baseline is `39f68d3d25e7d49c0d070c979e8db0964ccb62d1`:
[package](https://github.com/red-cup-engineering/knowledge-system-server/blob/39f68d3d25e7d49c0d070c979e8db0964ccb62d1/package.json)
and [FARS](https://github.com/red-cup-engineering/knowledge-system-server/blob/39f68d3d25e7d49c0d070c979e8db0964ccb62d1/src/fars-codecs.mjs).
That FARS exposes authorized knowledge reads/codecs; it exposes no history/Thing port yet.

## 2. Minimal CAIRN composition ports

Add these public entries to the existing CAIRN package and retain original function objects:

| Proposed entry | Proposed source file | Actual supplier |
| --- | --- | --- |
| `./history` | `src/history.mjs` | Existing public exports of `@red-cup-engineering/signcraft/history` |
| `./thing` | `src/thing.mjs` | Existing public exports of `@red-cup-engineering/signcraft/thing` |

The files forward the identified original exports without wrapping their data or operations.
CAIRN's actual selected SignCraft dependency supplies the implementation.
MOOSE consumes CAIRN as a dependency; its Living Web Server dependency remains in place.
Neither dependency becomes a peer, callback substitute or nominal provider declaration.

These are synchronous trusted in-process composition ports, not remote authority grants.
No new history representation, occurrence registry, cache, codec or reducer is introduced.
Do not place them behind the asynchronous FARS reading method: `captureHistoryReads`
records the actual queries of a synchronous proposal in module-local capture state.
Existing host boundaries retain external authorization, lifecycle and effect admission.

The port alone is insufficient receiving. The original operations must execute through
the installed CAIRN → MOOSE → FeltOS composition under the checks below.
Keep the existing CAIRN FARS behavior and tests intact.

## 3. Relocate the existing World family together

Use the FeltOS originals at `cae43a25f2134235ab2f2f92c96374760d71074d`:

| Original | Git blob | Required change |
| --- | --- | --- |
| [src/world.mjs](https://github.com/red-cup-engineering/feltos/blob/cae43a25f2134235ab2f2f92c96374760d71074d/src/world.mjs) | `e2b77571b9f8222d86be10f18d3767481fd10181` | Move to MOOSE; route history and dynamic Thing imports through the CAIRN entries. |
| [src/world-reading.mjs](https://github.com/red-cup-engineering/feltos/blob/cae43a25f2134235ab2f2f92c96374760d71074d/src/world-reading.mjs) | `b4a10c63a8f678ee45586793ca2b09df288b3725` | Move with World; use the same CAIRN history functions for reads, derivation and frames. |
| [src/geometry.mjs](https://github.com/red-cup-engineering/feltos/blob/cae43a25f2134235ab2f2f92c96374760d71074d/src/geometry.mjs) | `cac5e1c182530fd1d6d365f3f83bdf8819410a1d` | Move the original dependency-free module; no algorithm rewrite in this placement change. |

Expose the family through MOOSE's `./world`, `./world-reading` and `./geometry` entries.
FeltOS's existing entries forward those same exports, preserving downstream consumers.
Preserve original historical record kinds, source witnesses, functional predicates,
query behavior, geometry behavior, occurrence currentness and read-only interpretation.

World already supplies `receiveComposedThingWorld(world, composed, options)`.
Its default dynamic supplier must resolve CAIRN's actual `./thing` entry.
Retain its existing `composeThings` re-admission and `readThingSpatialProjection` use,
source-identity checks, conflict refusal and no-change replay result.
Do not invent another Thing registry, World schema or projection adapter.
Its result confers neither Actor authority, Work appointment nor movement.

Record the original paths, revisions, blobs and intentional import edits in source provenance.
Carry the applicable original notices and terms, including FeltOS's `UNLICENSED` origin,
with the relocated bodies; MOOSE's surrounding license does not relicense those sources.
No new mathematical derivation is claimed for preserving the numerical geometry code.

## 4. One history module for each applicable custody domain

Add a MOOSE `./world-history` entry forwarding the original CAIRN history exports.
Route these existing FeltOS consumers through it while leaving their other responsibilities in place:

| FeltOS source | Original history operations used |
| --- | --- |
| `src/world.mjs` | Create, validate, observe, replay, continue, sections, subjects, heads, query, functional predicates and read capture. |
| `src/world-reading.mjs` | Derivation, heads, raw occurrences, sections, subject cells/keys, subjects, query, restore, captured-frame reading/rebinding/currentness. |
| `src/engine.mjs` | `captureHistoryReads`, `historyHeads`, `historySize`, `historySection`, `mergeHistories`. |
| `src/engine-snapshot.mjs` | `materializeHistory`, `restoreHistory`, `validateHistory`. |
| `src/mud-server.mjs` | `historySize`. |
| `src/operations.mjs` | `historyHeads`. |
| `src/predication.mjs` | `historyHeads`. |
| `src/federation.mjs` | `historyHeads`. |
| `src/crafting.mjs` | `historyHeads`. |
| `src/gathering.mjs` | `historyHeads`. |
| `src/work-cycle.mjs` | `historySubjectKey`. |
| `src/software-change/mission/development.mjs` | `createHistory`, `restoreHistory`, `observeHistory`, `materializeHistory`. |

The survey inspected import-bearing beginnings of all 205 FeltOS source modules and
World's late dynamic Thing import. Before receiving, search complete source/test files
for static and dynamic `signcraft/history` and `signcraft/thing` imports and classify every match.
Tests must exercise the selected route instead of accidentally constructing frames elsewhere.

History's `archives` and `occurrenceFrames` WeakMaps belong to a module instance.
Its admitted-history and derivation/capture state are private too.
Two copies of identical bytes still produce separate registries: an archive or frame
registered in one is unavailable to another. Do not rely on package-manager deduplication.

Archive binding, frame capture, World reading, currentness and snapshot materialization
must resolve the same actual original functions for a given World or shared custody domain.
Distinct Worlds remain distinct histories unless an explicitly admitted shared owner says otherwise.
The mission-history consumer does not thereby share a World's mutable custody.

## 5. Lower-provider changes to qualify

The artifact comparison established these bounded differences, not an installed-runtime result:

| Supplier change | Observed source consequence |
| --- | --- |
| SignCell `0.10.0` → `0.13.1-dev.0` | `cell.mjs` adds `claimCoordinate`, `selectCellSet`, `cellSetAddress`; existing function bodies are unchanged. |
| SignCell utterance, Mark, type system, type-system document, Thing maker and relations | Inspected entrypoint files are byte-identical between those editions. Their selected dependencies still require receiving. |
| Data FOUR `0.3.1` → `0.7.1` | Byte-identical `src/four.mjs`, blob `680fdd6f16dd1442761f03dfb99202b172026ce8`. |
| History's persistent-map supplier | Remains Data `0.3.1`; its module has no imports. |
| Semiotic-content-address `0.1.0` → `0.1.1` | Canonicalization additionally accepts getter-backed snapshots branded by its own `retainedSnapshots` registry; arbitrary external accessors still refuse. |

Source-selected metadata: [SignCell 0.10.0](https://registry.561.group/@red-cup-engineering%2fsigncell/0.10.0),
[SignCell 0.13.1-dev.0](https://registry.561.group/@red-cup-engineering%2fsigncell/0.13.1-dev.0),
[SCA 0.1.0](https://registry.561.group/@red-cup-engineering%2fsemiotic-content-address/0.1.0),
[SCA 0.1.1](https://registry.561.group/@red-cup-engineering%2fsemiotic-content-address/0.1.1).

FeltOS also directly selects older SignCell `0.4.2` and the earlier content-address owner.
Qualify the relocated family's cell/retention imports against the actual selected closure,
especially immutable byte carriers and private snapshot brands crossing supplier instances.
Stored revision/checkpoint IDs and retained representatives must survive or refuse explicitly.
Unchanged top-level source is not proof of this transitive compatibility.

CAIRN's selected SignCraft `.2` already provides the required Thing operations.
Newer `.3`/`.4` source changes Thing, including `deriveTypedThing` and spatial-obstruction handling.
Do not silently substitute those editions while claiming this comparison qualifies them.
An intentional supplier update needs its own exact artifacts and original receiving.

## 6. Finite combined receiving

Run these eight steps with actual installed original suppliers and retained public exports:

1. Create a World through FeltOS's existing public entry, backed by MOOSE and CAIRN.
   Establish original function/module identity across the routes, not merely equal names.
2. Receive actual source-derived Dimension, World, Area and Thing composition through
   CAIRN's Thing entry; preserve source witnesses and the explicit no-authority result.
3. Bind that World's real archive through CAIRN's history entry using original revisions.
   A forged, incomplete or unrelated archive must not manufacture ancestry.
4. Capture an occurrence frame through MOOSE's selected history entry and consume it
   through the relocated World-reading implementation with the genuine tracked footprint.
5. Materialize the snapshot through FeltOS's existing persistence consumer and compare
   exact heads, revisions, positive/negative witnesses and occurrence positions.
6. Change archive availability at the same history object; currentness must invalidate
   the stale operation before its effect while preserving the pending original intent.
7. Replay the same Thing composition and retained revision; no synthetic act or second
   effect may appear. Equal bytes at distinct original occurrences remain distinguishable.
8. Restore an actual older-artifact history fixture under the selected closure and compare
   original identities/readings, including Unicode and retained byte representatives.

Reuse the original SignCraft suites: `history-occurrence-frames`, `history-occurrences`,
`history-derivation`, `history-projection`, `history-retained-representatives`,
`continue-history`, `thing` and `thing-kinds` (`test/*.test.mjs`).
Reuse FeltOS's `world`, `world-reading`, `world-reading-binding-version`,
`world-reading-rebind`, `engine-occurrence-admission`, `history-checkpoint`,
`persistence` and `durable-world-state` suites at their original owners.
The combined installed case supplies the missing cross-owner identity evidence;
mock ports and source-only tests cannot substitute for it.

## 7. Completion and evidence stages

The bounded source change consists of the two CAIRN entries, the original three-file
MOOSE family, the MOOSE history entry, FeltOS forwarding/import changes, provenance
and the necessary receiving adjustments. Host lifecycle and effect admission stay in FeltOS.
No new history owner, journal, scheduler, transport or authority database is required.

Record separately: reviewed source commits; published package/catalogue selection;
the exact installed supplier closure and executed receiving; and any live host receipt.
A registry artifact or source catalogue entry establishes availability/selection only.
Existing gateway receiving does not establish this migration's acceptance.
Complete Dimension activation, World isolation and independently received cross-Dimension
federation remain governed by the broader specification and require their own actual evidence.
