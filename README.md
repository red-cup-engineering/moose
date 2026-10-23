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
public social readout and its application composition. FeltOS/world authority
and SignCell/SignGraph evidence remain upstream and are supplied through
original source readers, never inferred from a route.

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

This is a source-owned *private pre-release package*, currently declaring
ActivityPub Services `0.9.6-dev.0`, ActivityPub Server `0.1.4-dev.89` and private
Living Web Server `0.1.0-dev.0`. An independently qualified install and release are still required before deployment. It has not been published
to the private registry, imported by a received FeltOS package, installed on
Cold Red Gate, or proven interoperable with Mastodon/Misskey/Lemmy. The
Living Web Server package is currently also private source, so resolving
the declared source imports into an installable application closure is still a
required release step. MOOSE must ultimately meet then beat each appropriate
Fediverse incumbent in independently exercised social, moderation, identity,
migration, and operating workflows; these source tests establish no parity.

## Fetch-only site consumer

The package's `./fetch` entry exposes the existing live-site and source
readers without eagerly importing Node-managed ActivityPub hosting.
The `.` entry keeps the original managed node and worker lifecycle.
This is a code-level deployment prerequisite, not a claimed Worker
installation or accepted ActivityPub federation service. Its real
Causeway consumer must pass the same provider's per-Actor outbox reader.
Sampled first pages do not certify the end of an Actor's published history.

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


## Five-settlement receiving target (Leader direction 2026-10-23)

`561.group`, `science.561.group`, `engineering.561.group`,
`operations.561.group`, and `services.561.group` are intended to be five
independently configured MOOSE instances, not five pages in a single synthetic
application. Each should host admitted local Actors and refer to external
Actors through source-qualified federation. The user also requests
`https://cold-red-gate.561.group/@hai-wen` as the continuing Hai Wen Actor's
public home; this separate host requires its own installed routing and
identity/provider configuration. **No site is declared deployed here.**

Acceptance requires: real HTTPS and routing per host; original signed
ActivityPub/WebFinger source custody; public `/@handle/` resolving live
Actor profiles and public activity; source-authorized blog/Article and page
consumers; account syndication/remote participation that do not falsely
impersonate, clone or migrate Actors; safe moderation and access controls;
cross-instance interoperability exercised with real peers; independently
received browser and federation behavior. Distinguish an Actor's enduring
identity from instance-local account bindings, territorial permissions, and
public projections. Preserve original SignCraft identity and provenance
owners. Do not infer publishing rights from an accessible route.

This branch implements source-backed Actor homes, original per-Actor bounded outbox projections and a Fetch-only package boundary in the reusable MOOSE application.
It does not implement remote account syndication, publish the package,
install five host sites, or independently receive a real homepage. Keep
the draft separate from MOOSE PRs #3–#5 until owner reconciliation and
native full-dependency tests.
