# MOOSE — MUD, Object Oriented, Socially Extended

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![Source terms](https://img.shields.io/badge/license-see_NOTICE-c0392b)](NOTICE.md)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

MOOSE is the Semioverse's reusable multi-user MUD: participants inhabit original
SignCraft Worlds, observe and move among their Areas, use their Objects, and
communicate through the same witnessed history. Its pure command engine retains
causal command order, concurrent action admission and recoverable pending work.
It consumes SignCraft's World semantics and CAIRN's source custody and authorized
knowledge views. SignCraft retains its original SignCell, SignChain, SignGraph
and Metrologic suppliers. FeltOS hosts MOOSE with selected World libraries such
as MetroPlat.

Package: `@red-cup-engineering/moose` on `https://registry.561.group`. Source:
[`red-cup-engineering/moose`](https://github.com/red-cup-engineering/moose),
mounted once in the forest at
`computer-mud-systems-engineering-services-section/apps/moose`.

## What MOOSE owns, and what it does not

| Owner | Responsibility |
| --- | --- |
| SignCraft and its upstream providers | Thing identity, witnessed relations, causal history and semantic computation. |
| CAIRN (`cairn`) | Source custody, authorized knowledge reads, finite file claims and codecs. |
| **MOOSE** | World-facing MUD behavior: source-backed game selection, command interpretation, pure action admission, perception, possession, speech, native inference, engine snapshots, the logical-World gateway and public social views. |
| ActivityPub Server / Services | Signed federation, WebFinger, inboxes, outboxes, followers, keys and delivery. |
| Living Web Server and TUFTE | Live human pages, authority checks before each read, and rendering. |
| FeltOS | Hosting, process lifecycle, World and library selection, mutable state custody, authenticated sessions and commitment of admitted effects. |
| MetroPlat or another World library | World policy, account and office recognition, and the operations a World offers. |

MOOSE keeps no second journal, scheduler, Actor registry, archive, renderer or
authorization database. A route it declares grants no read right: every page
still runs through its source reader and the host's `authorizePublicRead`.

## Run a native World

The executable example composes a native Dimension with two Worlds, original
Areas, witnessed exits and portable Objects. It uses the same MUD engine exposed
to hosts, including competing commands, movement, possession, speech and a
snapshot with pending work:

```sh
npm run demo:world
npm run test:world
```

See [examples/native-world.mjs](examples/native-world.mjs) for the complete
source composition. A host that already has an admitted World selects it with:

```js
import { defineGame } from '@red-cup-engineering/moose/game';
import { createEngine, join, submit, admit } from '@red-cup-engineering/moose/engine';

const game = defineGame({
  id: 'native-world', name: 'Our World', worldSource: 'history',
  start: entranceAreaId, dimension: dimensionId,
});
let engine = createEngine(game, { world: admittedHistory });
engine = join(engine, 'alice');
engine = submit(engine, { actor: 'alice', command: 'look' });
const result = admit(engine);
engine = result.engine;
```

`createEngine` retains the original admitted history. The starting Area and its
World/Dimension ancestry must be current and unopposed. `join` uses a local actor
handle; source-addressed Area and Object identities remain intact. Host-owned
session authorization precedes that call. Existing authored room-based games
continue through `defineGame` and `createEngine` with their existing format.

`admit` processes current commands without advancing the clock; `step` adds a
heartbeat and autonomous inhabitants. Original Gaming proposal admission
coordinates simultaneous actors against a shared history boundary. Accepted
branches join through native SignCraft history. `snapshotEngine` and
`restoreEngine` retain actor state, the causal history and queued commands.
FeltOS owns durable storage and commits the resulting engine state.

`closeWorld` from `./predication` accepts original SignChain rules and delegates
closure to SignCraft. Native settlement retains rule and premise witnesses,
adds changed Cells in one revision, and preserves history identity when nothing
changes. Functional state changes remain admitted commands; historical derived
testimony retains SignCraft's own semantics after a premise changes.

## The MOOSE stack

Everything MOOSE needs is in GitHub repositories under
[`red-cup-engineering`](https://github.com/red-cup-engineering) and packages on
`https://registry.561.group`. MOOSE and Living Web Server are public; the other listed repositories
currently require organization access. GitHub visibility is distinct from
package-registry read permission.

| Repository | Package | What it owns | How MOOSE uses it |
| --- | --- | --- | --- |
| [`moose`](https://github.com/red-cup-engineering/moose) | `@red-cup-engineering/moose` | This package. | — |
| [`living-web-server`](https://github.com/red-cup-engineering/living-web-server) | `@red-cup-engineering/living-web-server` | Live TUFTE pages over the house HTTP listener: authority check before each read, Fetch application. | Runtime dependency (`./fetch`). |
| [`tufte`](https://github.com/red-cup-engineering/tufte) | `@red-cup-engineering/tufte` | TUFTE, the Tiling User Form Topology Engine: page tiling and rendering. | Indirect, through Living Web Server's runtime dependency. |
| [`computer-web-server`](https://github.com/red-cup-engineering/computer-web-server) | `@red-cup-engineering/computer-web-server` | The house HTTP listener. | Indirect: an optional peer of Living Web Server and a dependency of ActivityPub Server. MOOSE must not depend on it directly (`test/fetch-dependency.test.mjs`). |
| [`cairn`](https://github.com/red-cup-engineering/cairn) | `@red-cup-engineering/cairn` | CAIRN: source custody, authorized reads, codecs, and the `./history`, `./thing`, `./signcell`, `./fars` and `./finite-file-claims` ports. | Runtime dependency. |
| [`signcraft`](https://github.com/red-cup-engineering/signcraft) | `@red-cup-engineering/signcraft` | Thing identity, witnessed relations, causal history, Cells and native inference. | Direct runtime owner of the complete World family. The Node `./world-cell` binding resolves the actual Cell supplier selected by its history implementation. |
| [`gaming`](https://github.com/red-cup-engineering/gaming) | `@red-cup-engineering/gaming` | Concurrent proposal admission. | Runtime dependency used by the original MUD engine. |
| [`activitypub-server`](https://github.com/red-cup-engineering/activitypub-server) | `@red-cup-engineering/activitypub-server` | The managed ActivityPub multi-site host. | Optional peer, for `.` and `serve-moose`. |
| [`activitypub-engineering-services-section`](https://github.com/red-cup-engineering/activitypub-engineering-services-section) | `@red-cup-engineering/activitypub-services-section` | The ActivityPub services section: AS2, signed federation, journal custody, public posts. | Optional peer, for `./public-readers`, `./local-node` and `.`. |
| [`computer-data-engineering-services-section`](https://github.com/red-cup-engineering/computer-data-engineering-services-section) | `@red-cup-engineering/computer-data-engineering-services-section` | The data services section. | Runtime dependency (`./four`). |

Runtime dependencies include Living Web Server, CAIRN, SignCraft, Gaming and
the original data, content-address, JSON, cryptographic and URI suppliers used
by the MUD core. Optional peers are ActivityPub Server, ActivityPub Services,
JavaScript File Services, `@fedify/fedify` and `@fedify/vocab`.
[`package.json`](package.json) contains the exact selections.

Where each is mounted in the Group's repository tree:

| Repository | Mount |
| --- | --- |
| `moose` | [`computer-mud-systems-engineering-services-section`](https://github.com/red-cup-engineering/computer-mud-systems-engineering-services-section) `apps/moose` |
| `living-web-server` | [`web-system-engineering-services-section`](https://github.com/red-cup-engineering/web-system-engineering-services-section) `apps/living-web-server` |
| `tufte` (formerly `web-page-tiling-engine`) | [`web-tufte-gui-engineering-services-section`](https://github.com/red-cup-engineering/web-tufte-gui-engineering-services-section) `apps/web-page-tiling-engine` |

### Installing from registry.561.group

All Group packages are installed from the house registry. Point the
`@red-cup-engineering` scope at it, in a project `.npmrc` or on the command line:

```ini
@red-cup-engineering:registry=https://registry.561.group
```

```sh
npm install @red-cup-engineering/moose --registry=https://registry.561.group
```

CI installs this way with no credentials. If your install is refused, ask a
maintainer for read access. Never commit a registry `_auth` or `_authToken`.

### Known consumers

Consumer tests for MOOSE live in the consumer's repository, not here.

- [FeltOS](https://github.com/red-cup-engineering/feltos) (the MUD driver) hosts
  Worlds, the World gateway and social sites. Tests:
  `test/moose-world-gateway.test.mjs`, `test/moose-world-history.test.mjs`,
  `test/moose-social-lifecycle.test.mjs`.
- [ASSIST](https://github.com/red-cup-engineering/assist) uses the Fetch-only
  application. Test: `test/moose-application.test.mjs`.
- Causeway's public web sites
  ([`causeway-services/public-web-services-section`](https://github.com/causeway-services/public-web-services-section))
  are the intended users of section homes (`publicSite`, `tufteTheme`,
  `readPublicResources`). On 2026-10-31 none of their manifests imported the
  package.

## Entries

| Entry | Exports | Needs from the host |
| --- | --- | --- |
| `./game` | `defineGame`, `instantiateGame`, `admitGameWorld`, `evolveGameWorld` | A source-backed selection and admitted history, or an authored game definition. |
| `./engine` | `createEngine`, `join`, `submit`, `admit`, `step`, `elapse`, discovery and routing | Current actor/session admission and commitment of the returned immutable engine. |
| `./engine-snapshot` | `snapshotEngine`, `restoreEngine`, World snapshot/restore | Durable storage; decoded history is re-admitted by SignCraft. |
| `./actions`, `./capabilities`, `./predication` | Original action definitions, capability composition, affordances, possession and `closeWorld` | Installed executable selections and current World policy. |
| `./world-settlement` | `settleHistory`, native `settlementAdmits` | Original SignChain rules and MOOSE's selected SignCraft history instance. |
| `./world` | `createWorld`, `tell`, `move`, `place`, `perceive`, `receiveComposedThingWorld`, … | Node and the declared original SignCraft family. |
| `./world-reading` | `readWorld`, `defineWorldReadingPolicy`, `rebindWorldReading`, … | The same Node World binding. |
| `./world-history` | SignCraft's `./history`, re-exported unchanged | The declared SignCraft dependency. |
| `./world-cell` | Default export: SignCraft's complete original Cell namespace | Node's public package resolver, used to retain the actual selected supplier instance. |
| `./geometry` | Polygon, prism, region and sight geometry | Nothing. |
| `./world-gateway` | `createWorldGateway`, `admitWorldGatewayCall`, `worldGatewayExecution`, … | A native `prepare`/`send`/`recover`/`result` port. |
| `./fetch` | `createMooseSite`, `createMooseApplication` | An already-built ActivityPub provider and readers. No Node listener. |
| `./source-application` | `createMooseApplication` | Living Web Server only. |
| `./public-readers` | `createMoosePublicReaders`, `readPublicTimelineAtSource` | Optional peer ActivityPub Services. |
| `.` | `createMooseSite`, `createMooseApplication`, `createMoosePublicReaders`, `createMooseEngine`, `serveMooseSites` | Optional peers ActivityPub Server and Services, and `@fedify/fedify` / `@fedify/vocab`. |
| `./local-node` | `commissionLocalMooseSite` | Optional peer ActivityPub Services; original private-key and journal custody. |
| `./cairn-pages` | `createMooseCairnPage` | A host-bound CAIRN `cairn.fars/v1` reader. |
| `./cairn-file-claims` | CAIRN's finite file-claim functions, unwrapped | The host's finite selection and reader policies. |
| `serve-moose` (bin) | Managed host CLI | The `.` peers and JavaScript File Services. |

The MUD World family uses Node to bind SignCraft's actual installed Cell provider.
The Fetch and geometry entries keep separate portable import closures. Hosting and
federation packages are exact optional peers; a Fetch-only consumer (a Worker,
ASSIST) starts no listener, key custody or CAIRN host.

## Worlds and World history

`./world`, `./world-reading` and `./geometry` are the World family moved from
FeltOS. FeltOS's public paths forward these same function objects. Every World
operation, reading, archive binding and occurrence frame uses MOOSE's selected
SignCraft history module. World Cells use that history owner's actual SignCell
instance. The `./world-cell` binding resolves the original public Cell export
from SignCraft's package context and verifies native Cell admission by identity.
CAIRN can retain its independently installed suppliers for knowledge services;
its sibling Cell port does not select the MUD's Cell owner. Equal version text
across two installed copies does not share private retained-byte custody.

`receiveComposedThingWorld` retains the native `signcraft.composed-things.v2`
carrier and asks the same selected SignCraft spatial reader to re-admit its
complete original Thing, Cell, relation and Utterance presentations. A borrowed
content address does not admit altered source evidence. The retired v1 dialect
is refused. Native relation Cells enter the history with their original witness
lanes and Cell identities. World-facing kind/name/type and directional-exit
projections explicitly retain their original Utterance or relation-statement
identity. Replaying the same composition and evidence changes nothing.

The optional `sourceCells` input carries independently supplied, typed relation
evidence through the original spatial reader. Opposed spatial premises return
its native refusal and witnesses before observation. Non-spatial opposition
joins the original Cell and remains inspectable. Physical containment, regions
and poses require positive, uncontradicted evidence. A running World continues
from its retained history; replaying its initial composition after an Object
moves cannot overwrite the current location.

World settlement checks actual function identity across MOOSE's history port
and the directly selected SignCraft history namespace. Equal version text alone
does not share private archive or occurrence custody. A split installation
refuses closure before reading its input; ordinary World reads remain usable.

## Shared movement geometry

MOOSE's `./geometry` entry owns the pure planar movement used by FeltOS's
authoritative movement commands and Farstone's client prediction. A movement
limit is a distance in metres per command, not a speed in metres per second.
`parseTarget` returns finite coordinates or `null`; `stepInPlane` advances by
at most a finite, nonnegative distance and preserves heading when stationary.
FeltOS retains responsibility for terrain, collisions and admission into a
region. The [movement contract](specifications/shared-planar-movement.md)
documents the public bindings, numeric boundaries and consumer evidence.

`npm run test:geometry` runs without installing any dependencies and is also
part of the source-contract CI job.

Polygon area and area centroid use vertex-relative shoelace products, so a
small room far from the coordinate origin retains its area, shared thresholds
and arrival point. Signed area, counter-clockwise prism footprints and the
positive-volume adjacency rule are unchanged. Geometry still uses JavaScript
numbers: offsets or dimensions already lost when coordinates are represented
cannot be recovered by this calculation.

## The World gateway

`./world-gateway` binds a logical World, its state authority, operation
catalogue, issuing and receiving Actors, account and session to one native
request. `invoke` and `observe` keep the original handle through lost replies,
late custody and timeouts. A pending or indeterminate result is observed, never
resent. Historical `feltos.*` wire kinds and `metroplat.subject-binding` are
kept so durable request identity is unchanged.

## Social sites

`createMoosePublicReaders({origin, provider})` reads current Actor descriptions
and effective public Notes and Articles from the site's signed provider. Edits
and deletes show through; superseded Create/Update/Delete events do not.

`createMooseSite({origin, provider, readPublicTimeline, readPublicActor,
readPublicActorTimeline, authorizePublicRead, basePath, pages, publicSite,
tufteTheme, readPublicResources, kv, queue, release, custodyRoot})` returns the
Living Web Fetch application plus exact, public, read-only route declarations
for an existing host. It creates no listener, key store or social database.

- `/` (or `basePath`) is a bounded current reading of the public timeline.
- `/@identifier/` is the human homepage of an Actor, on every MOOSE origin, with
  a bounded reading of that Actor's own outbox. `/people/:identifier` is the
  standalone view. The signed machine face stays `/actors/:identifier`.
- `hasMore: false` means the sampled page had no confirmed further post, not
  that the archive is exhausted.

`createMooseEngine({sites})` returns the admitted Living Web host of the original
ActivityPub site applications. Its frozen `origins` lists the registered sites;
`fetch` serves only those origins. `serveMooseSites({sites, trustProxy, hostname,
port})` uses that host and the original ActivityPub delivery/custody lifecycle.
Its default listener always goes through Living Web Server. The previously
supported explicit `serve` injection remains available to host tests.
The ActivityPub actor dispatcher and Fedify key dispatcher must load the same
physical `@fedify/vocab` module; two copies of the same version make Actor
endpoints fail with HTTP 500, so MOOSE pins the Fedify peers exactly.

### Section homes, themes and resource inventories

`publicSite` is the owning section's existing `site.json` presentation. MOOSE
checks that `publicSite.baseIri` is exactly this origin, and that its name,
description and navigation links are bounded, HTTPS, unique and not private,
before any source reader runs. `tufteTheme` is forwarded unchanged as Living Web
Server's `document.theme`.

`readPublicResources` reads that section's `PublicResourceInventory`, and only
after a separate `authorizePublicRead({context, resource:
"public-resource-inventory"})` grant. Public GET links become navigation,
repository links say authorization is required, and POST-only interfaces are
described, never shown as links.

### Native routes for FeltOS

`site.resources` lists exact routes a native host (FeltOS) may mount: the
social home, Actor pages and each exact source page. Regular-expression pages
are not advertised; unsafe, duplicate and protocol routes are refused. With
`basePath: "/social"`, a source page at `/` is advertised only when an admitted
`publicSite` holds this origin, as on a house website; otherwise `/` stays the
host's, and FeltOS's root cannot be taken by MOOSE.

## CAIRN knowledge pages and file claims

`createMooseCairnPage({match, cairn, principal, documentOptions,
projectDocument})` turns a host-bound CAIRN reader into one page for
`createMooseSite({pages})`. CAIRN authorizes the host's principal before reading;
the projection is bounded to 64 tiles and 128 KiB of admitted JSON.
`./cairn-file-claims` forwards CAIRN's `readCairnFiniteFileClaims`,
`encodeCairnFiniteFileClaims` and `admitCairnFiniteFileClaims` unchanged.

## Testing

```sh
npm install --registry=https://registry.561.group
npm test
```

`npm run test:pack` independently checks npm's actual offline dry-run archive: it
requires every exported entry and CLI file, original source terms, and exactly
the declared packaged receiving tests. Development-only test sources must stay
out of the published archive; the check itself is source-only.

CI ([`fetch-dependency.yml`](.github/workflows/fetch-dependency.yml)) runs on
every pull request and on `main`: the dependency-free source contract
(Fetch boundary, section site, resource inventory and native route suites), the
World gateway and World history suites with their exact suppliers, and the
whole suite on a clean install of the declared provider graph.

`npm run test:world` receives original Thing evidence, current action premises,
native rule settlement, multi-user commands and durable pending-command recovery.
The native-world CI job also runs the original engine behavior and occurrence
admission regressions against the same declared semantic suppliers.

## Specifications

- [Dimension and World coordination](specifications/dimension-world-coordination.md):
  the governing requirement (M-DIM, M-THING, M-OCC, M-MOD, M-LEDGER, M-MSG,
  M-CHAN, M-ACTOR, M-DIST, M-REC, M-FMT, M-AUTO), its theory and what is still
  open.
- [World and history migration](specifications/world-history-migration.md).
- [Native public outbox wire](specifications/native-public-outbox-wire.md).
- [World host coordination ingress](specifications/world-host/coordination-ingress.md).

Source tests do not establish a deployed Dimension, cross-Dimension federation
between independent hosts, or parity with Fediverse incumbents; those are
received separately, and MOOSE must meet and then beat those incumbents in
exercised social, moderation, identity, migration and operating workflows.

Publication follows the Leader's direction that "our production workflow should
not require a pnpm workspace or lockfile for every repository": MOOSE has a
package manifest and native tests, and no provider workspace or lockfile.
