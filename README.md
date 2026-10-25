# MOOSE — MUD, Object Oriented, Socially Extended

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

MOOSE is the Semioverse's named, reusable **social application and platform**.
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

The root page is a bounded, current source reading, not a stored feed copy.
It now shows **effective public Note/Article objects**, not a noisy listing of
superseded raw Create/Update/Delete events. Editing a note updates its original
live object and its MOOSE appearance; deleting it removes the old contents from
both readouts. Its native peer at `/actors/:identifier/notes/:noteId` or
`/actors/:identifier/articles/:articleId` is dereferenceable through the
original Fedify object dispatchers when the installed protocol supplier has
public-object custody. That same URI is linked from the human timeline.

`/people/:identifier` is the standalone human actor view. With `basePath:
"/social"`, FeltOS consumes the same MOOSE site at `/social` and
`/social/people/:identifier` through the driver's **native-origin routes**.
It does not install MOOSE into MetroPlat as an enterprise application.
The actor's signed machine face remains `/actors/:identifier`, served by the
original provider. Other applications may independently contribute TUFTE pages.

## Native use

`createMoosePublicReaders({origin, provider})` projects the current actor
descriptions and effective public Note/Article readouts from the existing
signed provider. Both independent MOOSE and FeltOS use this **one** reader.

`createMooseSite({origin, provider, readPublicTimeline,
readPublicActor, authorizePublicRead, basePath, pages, kv, queue, release})`
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

This source candidate is `0.1.0-dev.1`, declaring CAIRN `0.2.5-dev.0`,
ActivityPub Services `0.9.6-dev.0`, ActivityPub Server `0.1.4-dev.89` and
Living Web Server `0.1.0-dev.9`. The CAIRN source selection requires Node 24
or later. The new CAIRN and MOOSE editions require their own native artifact
publication and complete receiving; a source dependency declaration does not
establish an installed FeltOS package, Cold Red Gate deployment or
Mastodon/Misskey/Lemmy interoperability. MOOSE must ultimately meet then beat
each appropriate Fediverse incumbent in independently exercised social,
moderation, identity, migration and operating workflows; source tests establish
no such parity.

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

The declared Living Web Server `0.1.0-dev.0` artifact did not export `./fetch`,
although the existing MOOSE source already imported it. This candidate selects
the real published `0.1.0-dev.9` artifact, whose export map supplies that exact
entrypoint (artifact source `9e6d657fda9df3bd50744294eb3bbd1412b854ad`).
Node `24.22.1` received the original application contract with that supplier.

The native result was 12 passing cases: 6 in `test/cairn-pages.test.mjs`,
2 in `test/source-page-routes.test.mjs`, and 4 in
`test/application.test.mjs`. The CAIRN page case constructs the actual
SignCraft `0.5.7-dev.395` `KnowledgeBase`, binds the actual CAIRN source
composition and checks its source document identity and authorization call.
The original application cases exercise the Living Web and ActivityPub provider
composition and exact FeltOS route declarations. These source-cohort results
do not qualify publication of the new CAIRN/MOOSE editions or installed
cross-Dimension federation.
