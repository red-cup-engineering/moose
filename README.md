# MOOSE — Multi-User Dimension, Object Oriented, Socially Extended

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![Source terms](https://img.shields.io/badge/license-see_NOTICE-c0392b)](NOTICE.md)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

MOOSE is the Semioverse's reusable multi-user Dimension: a MUD of many Worlds,
with the social views and recoverable coordination those Worlds share. It sits
in the Group's supplier chain as Metrologic → SignCell → SignChain → SignGraph
→ SignCraft → CAIRN → **MOOSE** → FeltOS. MetroPlat is a World library that
FeltOS hosts.

Package: `@red-cup-engineering/moose` on `https://registry.561.group`. Source:
[`red-cup-engineering/moose`](https://github.com/red-cup-engineering/moose),
mounted once in the forest at
`computer-mud-engineering-services-section/apps/moose`.

## What MOOSE owns, and what it does not

| Owner | Responsibility |
| --- | --- |
| SignCraft and its upstream providers | Thing identity, witnessed relations, causal history and semantic computation. |
| CAIRN (`knowledge-system-server`) | Source custody, authorized knowledge reads and codecs, and the history, Thing and Cell ports MOOSE uses. |
| **MOOSE** | Composing a multi-user Dimension: Worlds, World readings, the logical-World gateway, and public social views over a site's own ActivityPub Actors. |
| ActivityPub Server / Services | Signed federation, WebFinger, inboxes, outboxes, followers, keys and delivery. |
| Living Web Server and TUFTE | Live human pages, authority checks before each read, and rendering. |
| FeltOS | Hosting, process lifecycle, World and library selection, local state and effect admission. |
| MetroPlat or another World library | World policy, account and office recognition, and the operations a World offers. |

MOOSE keeps no second journal, scheduler, Actor registry, archive, renderer or
authorization database. A route it declares grants no read right: every page
still runs through its source reader and the host's `authorizePublicRead`.

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
| [`web-page-tiling-engine`](https://github.com/red-cup-engineering/web-page-tiling-engine) | `@red-cup-engineering/web-page-tiling-engine` | TUFTE, the Tiling User Form Topology Engine: page tiling and rendering. | Indirect, through Living Web Server's runtime dependency. |
| [`computer-web-server`](https://github.com/red-cup-engineering/computer-web-server) | `@red-cup-engineering/computer-web-server` | The house HTTP listener. | Indirect: an optional peer of Living Web Server and a dependency of ActivityPub Server. MOOSE must not depend on it directly (`test/fetch-dependency.test.mjs`). |
| [`knowledge-system-server`](https://github.com/red-cup-engineering/knowledge-system-server) | `@red-cup-engineering/knowledge-system-server` | CAIRN: source custody, authorized reads, codecs, and the `./history`, `./thing`, `./signcell`, `./fars` and `./finite-file-claims` ports. | Runtime dependency. |
| [`signcraft`](https://github.com/red-cup-engineering/signcraft) | `@red-cup-engineering/signcraft` | SignCraft: Thing identity, witnessed relations, causal history, Cells. | Not a runtime dependency. MOOSE reaches SignCraft only through CAIRN, which depends on it and exposes its history, Thing and Cell modules through `./history`, `./thing` and `./signcell`. MOOSE lists it as a devDependency, used directly only by `test/cairn-pages.test.mjs`; `test/world-history.test.mjs` resolves it from CAIRN's copy. |
| [`activitypub-server`](https://github.com/red-cup-engineering/activitypub-server) | `@red-cup-engineering/activitypub-server` | The managed ActivityPub multi-site host. | Optional peer, for `.` and `serve-moose`. |
| [`activitypub-engineering-services-section`](https://github.com/red-cup-engineering/activitypub-engineering-services-section) | `@red-cup-engineering/activitypub-services-section` | The ActivityPub services section: AS2, signed federation, journal custody, public posts. | Optional peer, for `./public-readers`, `./local-node` and `.`. |
| [`computer-data-engineering-services-section`](https://github.com/red-cup-engineering/computer-data-engineering-services-section) | `@red-cup-engineering/computer-data-engineering-services-section` | The data services section. | Runtime dependency (`./four`). |

The runtime `dependencies` are Living Web Server, CAIRN and Computer Data. The
optional peers (also devDependencies) are ActivityPub Server, ActivityPub
Services, JSON Services, Content Address Services, JavaScript File Services, and
`@fedify/fedify` and `@fedify/vocab`. [`package.json`](package.json) has the
exact versions.

Where each is mounted in the Group's repository tree:

| Repository | Mount |
| --- | --- |
| `moose` | [`computer-mud-engineering-services-section`](https://github.com/red-cup-engineering/computer-mud-engineering-services-section) `apps/moose` |
| `living-web-server` | [`web-system-engineering-services-section`](https://github.com/red-cup-engineering/web-system-engineering-services-section) `apps/living-web-server` |
| `web-page-tiling-engine` (TUFTE) | [`web-tufte-gui-engineering-services-section`](https://github.com/red-cup-engineering/web-tufte-gui-engineering-services-section) `apps/web-page-tiling-engine` |

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
| `./world` | `createWorld`, `tell`, `move`, `place`, `perceive`, `receiveComposedThingWorld`, … | Nothing beyond the runtime dependencies. |
| `./world-reading` | `readWorld`, `defineWorldReadingPolicy`, `rebindWorldReading`, … | Nothing beyond the runtime dependencies. |
| `./world-history` | CAIRN's `./history`, re-exported unchanged | Nothing beyond the runtime dependencies. |
| `./geometry` | Polygon, prism, region and sight geometry | Nothing. |
| `./world-gateway` | `createWorldGateway`, `admitWorldGatewayCall`, `worldGatewayExecution`, … | Optional peers JSON Services and Content Address Services; a native `prepare`/`send`/`recover`/`result` port. |
| `./fetch` | `createMooseSite`, `createMooseApplication` | An already-built ActivityPub provider and readers. No Node listener. |
| `./source-application` | `createMooseApplication` | Living Web Server only. |
| `./public-readers` | `createMoosePublicReaders`, `readPublicTimelineAtSource` | Optional peer ActivityPub Services. |
| `.` | `createMooseSite`, `createMooseApplication`, `createMoosePublicReaders`, `createMooseEngine`, `serveMooseSites` | Optional peers ActivityPub Server and Services, and `@fedify/fedify` / `@fedify/vocab`. |
| `./local-node` | `commissionLocalMooseSite` | Optional peer ActivityPub Services; original private-key and journal custody. |
| `./cairn-pages` | `createMooseCairnPage` | A host-bound CAIRN `cairn.fars/v1` reader. |
| `./cairn-file-claims` | CAIRN's finite file-claim functions, unwrapped | The host's finite selection and reader policies. |
| `serve-moose` (bin) | Managed host CLI | The `.` peers and JavaScript File Services. |

Runtime dependencies are Living Web Server, CAIRN and Computer Data. Hosting and
federation packages are exact optional peers, so a Fetch-only consumer (a
Worker, ASSIST) starts no listener, key custody or CAIRN host. Exact versions
live in [`package.json`](package.json); this README does not repeat them.

## Worlds and World history

`./world`, `./world-reading` and `./geometry` are the World family moved from
FeltOS. FeltOS's public paths forward these same function objects. Every World
operation, reading, archive binding and occurrence frame uses the one history
module CAIRN selects, and World cells use CAIRN's `./signcell` port, which
forwards SignCraft's selected Cell implementation. A host must resolve that same
CAIRN instance for a World's history: equal version text across two installed
copies does not share private carriers.

`receiveComposedThingWorld` re-admits a SignCraft Thing composition through
CAIRN's `./thing` operations and projects containment and exits as World
observations with their source, causal parents and batch positions. Replaying
the same composition changes nothing. The result grants no authority and
performs no movement.

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

`createMooseEngine({sites})` builds the ActivityPub multi-site engine and
`serveMooseSites({sites, trustProxy, hostname, port})` runs the managed host.
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
