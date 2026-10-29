# MOOSE — Multi-User Dimension, Object Oriented, Socially Extended

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![Source terms](https://img.shields.io/badge/license-see_NOTICE-c0392b)](NOTICE.md)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

MOOSE is the Semioverse's named, reusable **multi-user Dimension composition**:
a MUD of many Worlds, with social views and source-owned coordination. This is
the product contract; the current edition provides the reusable World, history and gateway
interfaces alongside social/source views. Full multi-World host selection remains under development.
Its original implementation is under Computer MUD Engineering in Computer
Systems, not inside MetroPlat, an application site or the Fedify provider.

This app imports **Living Web Server** for live TUFTE human pages. It imports
the existing **ActivityPub Server** for one site-aware HTTP/ActivityPub
composition and its managed Fedify delivery lifecycle. Networking owns signed
federation, WebFinger, inboxes, outboxes, followers and delivery. MOOSE owns the
public social readout and its application composition. CAIRN supplies the
source-authorized SignCraft knowledge port. FeltOS is a downstream host which
supplies its instance authority through the existing provider bindings.
SignCell/SignGraph evidence stays with its original source readers; a route
does not establish evidence or permission.

## World coordination

`./world-gateway` now owns the existing logical-World-to-execution-Actor gateway,
relocated unchanged from FeltOS. It binds the original World, state authority,
operation catalogue, issuing/receiving Actors, authenticated account and session
to one native request. Its `invoke`/`observe` API preserves the original retained
handle through lost replies, late custody and bounded timeouts. A pending or
indeterminate result is observed without resending the act.

The gateway consumes the original host-supplied `prepare`, `send`, `recover`
and `result` port. ActivityPub/native Actor services retain signed transport and
custody; the World library retains current account/session/office authorization.
FeltOS's existing `./server/world-gateway` path is the downstream migration point.
There is no second World store, queue or authorization database.

This Node-only entry uses the exact optional Content Address Services `0.2.0`
and JSON Services `0.4.0` peers. It does not enter the portable
Fetch graph.
Historical wire kinds and source terms remain intact; see [NOTICE](NOTICE.md).
The complete original request, theory-to-contract mapping, ownership decision,
verification scope and coupled Thing/World/history migration are retained in
[Dimension and World coordination](specifications/dimension-world-coordination.md).

### Original Worlds and one history supplier

`./world`, `./world-reading` and `./geometry` own the original FeltOS World
family. FeltOS's existing public paths forward these same function objects.
`./world-history` forwards CAIRN's synchronous `./history` entry; World reading,
archive bindings, occurrence frames, host admission and persistence all use
that selected original history module. No second archive or frame registry is
created. A copied frame cannot substitute for the original privately admitted
frame, even when its visible fields match.

`receiveComposedThingWorld` uses CAIRN's actual selected `./thing` operations
to re-admit the original Thing composition and its relation identities. It
projects admitted containment and exits into World observations with the
existing source, causal parents and batch positions. Replaying the same
composition produces no synthetic change. Its result confers neither an
authority grant nor a movement effect. The projection does not add per-Mark
witnesses that the original implementation did not retain.

World cells and reading policies use CAIRN’s `./signcell` port. It forwards
SignCraft’s `./cell` port, which retains the selected SignCell implementation
and that implementation’s own content-retention and addressing functions.
History consumes the same port. This explicit binding is required to retain
private byte carriers when npm installs separate physical copies of the
content provider; matching dependency versions alone is insufficient. The
clean npm World test qualifies that boundary.
Computer Data `0.2.0` remains a direct runtime dependency for the original
World operations. These entries remain separate from portable Fetch composition.
The source move and actual receiving obligations are specified in
[World and history migration](specifications/world-history-migration.md).

The root page is a bounded, current source reading, not a stored feed copy.
It now shows **effective public Note/Article objects**, not a noisy listing of
superseded raw Create/Update/Delete events. Editing a note updates its original
live object and its MOOSE appearance; deleting it removes the old contents from
both readouts. Its native peer at `/actors/:identifier/notes/:noteId` or
`/actors/:identifier/articles/:articleId` is dereferenceable through the
original Fedify object dispatchers when the installed protocol supplier has
public-object custody. That same URI is linked from the human timeline.

The public human Actor homepage is now projected at `/@identifier/` (also
`/@identifier`). It reads the same original Actor as `/people/:identifier`,
plus a bounded source-owned reading of that Actor's own ActivityPub outbox, never a filter of a globally truncated feed. Missing native reader is shown as unavailable rather than falsely empty.
The source ActivityPub Actor remains `/actors/:identifier`; the homepage is
**not** an alternate signing identity, a new account or a separate database.
A public feed preview is not complete history and is not permission to expose
private or followers-only content. The old address remains available.
Both global and per-Actor readings report bounded outbox coverage. `hasMore:
false` means that the sampled source page supplied no confirmed additional
post; it does not establish that a paginated source archive is exhausted.

`/people/:identifier` is the standalone human actor view. With `basePath:
"/social"`, FeltOS consumes the same MOOSE site at `/social` and
`/social/people/:identifier` through the driver's **native-origin routes**. The canonical `/@identifier/` stays at the origin root even when the timeline is mounted at `/social`; `/social/@identifier/` is only a secondary alias.
It does not install MOOSE into MetroPlat as an enterprise application.
The actor's signed machine face remains `/actors/:identifier`, served by the
original provider. Other applications may independently contribute TUFTE pages.

## Native use

`createMoosePublicReaders({origin, provider})` projects the current actor
descriptions and effective public Note/Article readouts from the existing
signed provider. Both independent MOOSE and FeltOS use this **one** reader.

`createMooseSite({origin, provider, readPublicTimeline,
readPublicActor, readPublicActorTimeline, authorizePublicRead, basePath, pages, kv, queue, release})`
accepts already-authorized source and native provider capabilities.
It returns exact, public read-only route declarations for an existing host
alongside the Living Web Fetch application; those declarations do not create
another HTTP listener, actor key store, social database or office authority.
`createMooseEngine({sites})` constructs the original ActivityPub multi-site
engine; `serveMooseSites({sites, trustProxy, hostname, port})` starts the
managed original host with durable queue workers and source-custody shutdown.

`commissionLocalMooseSite` will bind original private-key and journal custody.
A source declaration alone cannot authorize an actor or serve private data.

## Release status and market requirement

This source edition is `0.1.0-dev.84`, declaring the issued CAIRN `0.2.5-dev.356`,
ActivityPub Services `0.9.6-dev.0`, ActivityPub Server `0.1.4-dev.89` and
Living Web Server `0.1.0-dev.11`. The CAIRN finite reader requires Node 24.2
or later. This MOOSE candidate requires its own native artifact publication
and receiving; a source dependency declaration does not
establish an installed FeltOS package, Cold Red Gate deployment or
Mastodon/Misskey/Lemmy interoperability. MOOSE must ultimately meet then beat
each appropriate Fediverse incumbent in independently exercised social,
moderation, identity, migration and operating workflows; source tests establish
no such parity.

## Fetch-only site consumer

The package's `./fetch` entry exposes the existing live-site composition
without eagerly importing Node-managed ActivityPub hosting or protocol readers.
The original source readers are selected explicitly through `./public-readers`.
The `.` entry keeps the original managed node and worker lifecycle.
This is a code-level deployment prerequisite, not a claimed Worker
installation or accepted ActivityPub federation service. Its real
Causeway consumer must pass the same provider's per-Actor outbox reader.
Sampled first pages do not certify the end of an Actor's published history.

### Downstream application source views

`./source-application` exports `createMooseApplication({origin, home, pages,
authorizePublicRead, document})`. MOOSE social sites and ASSIST both consume
this boundary. The original Living Web Server admits the origin and asks the
host for permission before reading a page or JSON resource; TUFTE renders the
returned model. Each page declares its authority name, route and source reader.
Duplicate exact routes refuse. Route aliases can share one authority name.

This entry imports no ActivityPub provider or Node listener. A public catalogue
can therefore serve on the existing Worker without inventing a federation
Actor. Signed federation remains a separately commissioned `createMooseSite`
capability. The authored source reconciliation preserves the Actor-home branch
and current CAIRN/source-page contracts; it is not a native SignCraft fabrication
receipt.

## Source-qualified section homes and resource inventories

The optional `publicSite` input to `createMooseSite` is the owning section's
existing public `site.json` presentation, not a second source of identity,
authority or URLs. Its canonical origin, bounded name/description and safe,
unique navigation links are checked before source readers run. A supplied
`tufteTheme` is forwarded through `createMooseApplication` to the original
Living Web Server `document.theme`; it is not a new renderer or Brand registry.

An optional `readPublicResources` reads the original `PublicResourceInventory`
for the same section, **only after** an independent
`authorizePublicRead({ context, resource: "public-resource-inventory" })`
grant. The bounded projection distinguishes public GET, authorized repository
GET and POST-only interfaces; POST endpoints are never advertised as clickable
GET actions. MOOSE invents neither a `/resources.json` route nor a service
health claim. Source inventory access can be refused without denying the
already-authorized social page.

When `basePath` is `/social`, the original publisher's separately authorized
`/` page is projected as one exact native host resource alongside articles,
feeds and search. `basePath: "/"` continues to reserve `/` for MOOSE's own
home. Each projected page still runs through its source reader and Living Web
Server authorization; native route advertisement alone grants no read rights.

For installed Node hosts, MOOSE also selects matching optional/development
`@fedify/fedify` and `@fedify/vocab` 2.3.14 peers. The original
ActivityPub 0.11.2 actor dispatcher and its Fedify key dispatcher must share
the same **physical vocabulary class** for public-key serialization. A graph
which resolves two copies of version 2.3.14 can produce HTTP 500 despite
correct key material; matching version text is not sufficient. The full
installed-host test must verify actual interoperability, including the native
Group actor endpoint. This selection does not make Fedify mandatory for a
Fetch-only MOOSE consumer.

Pure section/inventory/native-route suites run without external dependencies;
the original source application tests exercise the integrated hosting contract.
The upstream renderer's real theme receiving, installed private dependencies,
browser accessibility and actual Causeway/FeltOS deployment remain distinct
qualification steps. The implementation consolidates the source work of
MOOSE #7, #8 and #10 onto current main without reintroducing their obsolete
`createLivingWebServer` and `createMooseApplication` duplication.

## Required managed hosting supplier

The receipt recovery requested by the Leader must retain FeltOS's existing,
conditional MOOSE application. MOOSE MUST consume the original ActivityPub
Server's exported `managed-sites` operation for worker lifecycle and source
custody; it must not copy that operation or create another host. The former
`0.1.3` dependency does not export that port. The exact published
`0.1.4-dev.89` carrier does, and its executable and data files match accepted
ActivityPub Server source `26acb5ebcb97f9aac3f4f2f214d86c98244e08ce` byte for byte.
The development MOOSE carrier therefore selects that exact development
supplier, while retaining its existing ActivityPub `0.9.6-dev.0` dependency.

As the Leader directed, "Our production workflow should not require a pnpm
workspace or lockfile for every repository. It should MAYBE require a
package.json". This independent provider has a package manifest and native
tests; publication must qualify its actual artifacts and dependencies without
adding a provider workspace or lockfile.

## CAIRN-backed knowledge pages

`./cairn-pages` exports the existing
`createMooseCairnPage({match,cairn,principal,documentOptions,projectDocument})`
composition. It consumes a host-bound CAIRN `cairn.fars/v1` reader and returns
one page declaration for `createMooseSite({pages})`. CAIRN authorizes the
host-selected principal before calling the original SignCraft reader. The
publishing consumer supplies its TUFTE projection; Living Web Server separately
checks the site's public-read policy before invoking the page.

The existing projection bound is 64 tiles and 128 KiB of admitted JSON. MOOSE
returns the measured representation, preserving the original protections against
later mutation and `toJSON` substitutions. The original exact-page projection
now includes eligible source pages in `site.resources`, so FeltOS receives the
same finite route declarations as the Living Web application. Regular-expression
pages remain unadvertised; unsafe, duplicate, home and protocol routes refuse.
This retains one publisher and the existing site authorization.

MOOSE declares the actual CAIRN source supplier, and native receiving binds
`composeCairnFars` to the selected SignCraft `KnowledgeBase` before invoking the
MOOSE page. The host-supplied port is an explicit capability; its shape alone is
not origin authentication or a public reading grant. No second graph, codec,
actor store, federation transport or listener is introduced. The original
cross-owner requirement remains
[CAIRN issue 14](https://github.com/red-cup-engineering/knowledge-system-server/issues/14).

### Source receiving on 2026-10-25

The earlier declared Living Web Server `0.1.0-dev.0` artifact did not export `./fetch`,
although the existing MOOSE source already imported it. Earlier source receiving selected
the real published `0.1.0-dev.9` artifact, whose export map supplies that exact
entrypoint (artifact source `9e6d657fda9df3bd50744294eb3bbd1412b854ad`).
Node `24.22.1` received the original application contract with that supplier.

The current downstream ASSIST candidate selects Living Web Server
`0.1.0-dev.10`, which selects TUFTE `0.16.5-dev.0` for the original renderer's
contact-link repair. These versions require upstream artifact publication and
receiving in dependency order. The new `./source-application` entry composes
that exact supplier without importing Node hosting or the ActivityPub provider.
Source reconciliation and locally packed qualification do not establish a
published cohort or an installed public host.

The native result was 12 passing cases: 6 in `test/cairn-pages.test.mjs`,
2 in `test/source-page-routes.test.mjs`, and 4 in
`test/application.test.mjs`. The CAIRN page case constructs the actual
SignCraft `0.5.7-dev.395` `KnowledgeBase`, binds the actual CAIRN source
composition and checks its source document identity and authorization call.
The original application cases exercise the Living Web and ActivityPub provider
composition and exact FeltOS route declarations. These source-cohort results
do not qualify publication of the new CAIRN/MOOSE editions or installed
cross-Dimension federation.

## Select the actual execution profile (0.1.0-dev.83)

The runtime suppliers are the original Living Web Server, CAIRN and Computer
Data. CAIRN retains the World family’s exact history, Thing and Cell selection. The
separate `./cairn-file-claims` entry uses CAIRN; the portable `./fetch` and
`./source-application` entries do not eagerly import that native reader.
Node hosting and federation remain exact optional peers. An ordinary ASSIST
Fetch application starts no listener, private-key custody or CAIRN host.

| Entry | Host-supplied package | Meaning |
| --- | --- | --- |
| `./source-application`, `./fetch` | None beyond Living Web Server | Source-authorized HTML/JSON or composition with an already supplied provider. |
| `./public-readers` | ActivityPub Services `0.9.6-dev.0` | Original Actor/outbox protocol interpretation. |
| `.` | ActivityPub Server `0.1.4-dev.89` and ActivityPub Services `0.9.6-dev.0` | Original managed social host and original public reader API. |
| `./local-node` | ActivityPub Services `0.9.6-dev.0` | Original local key/journal/provider commissioning. |
| `serve-moose` | The preceding host packages and JavaScript File Services `0.1.1` | Original CLI lifecycle guard. |
| `./cairn-pages` | Host-provided original `cairn.fars/v1` capability | No copied SignCraft state or new knowledge engine. |
| `./world-gateway` | JSON Services `0.4.0` and Content Address Services `0.2.0` | Original Node-only logical-World admission and recoverable native Actor coordination. |
| `./world`, `./world-reading`, `./geometry`, `./world-history` | None beyond the declared runtime suppliers | Original World observations and readings; one CAIRN-selected history and Thing implementation. |

These optional peers remain development dependencies for the existing full
social suite. The original page adapter still receives its FARS provider as
a host capability; the finite-claims export instead forwards the declared
CAIRN runtime supplier without changing the Fetch entry's import boundary.
A draft consumer that previously imported `createMoosePublicReaders` from
`./fetch` must import it from `./public-readers`; the existing managed root API
retains that export. The `test:fetch` command exercises the actual shared source
application with real Living Web Server/TUFTE suppliers. It is distinct from the
full social, signed-provider and local-node receiving suite.

# Original CAIRN finite claim capability

`@red-cup-engineering/moose/cairn-file-claims` forwards the original CAIRN
`readCairnFiniteFileClaims`, `encodeCairnFiniteFileClaims`, and
`admitCairnFiniteFileClaims` functions without wrapping or reimplementing them.
CAIRN is a runtime dependency for this export. The native host supplies its
complete finite selection and actual source/reader policies; MOOSE contributes
no filesystem root, reader identity, graph, codec, or grant. FeltOS can use this
port in its original one-shot child without constructing a graph in the
serving parent. The existing Living Web/public page authorization remains an
independent interface and does not authorize the finite source population.
