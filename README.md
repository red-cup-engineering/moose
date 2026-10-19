# MOOSE — MUD, Object Oriented, Socially Extended

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

This is a source-owned *private pre-release package*, currently declaring
ActivityPub Services `0.9.6-dev.0`, ActivityPub Server `0.1.3` and private
Living Web Server `0.1.0-dev.0`. The hosting supplier's dependency manifest
is updated to the new ActivityPub source, but its committed lock still names
the older registry revision: a real locked install and release qualification
are required before deployment. It has not been published
to the private registry, imported by a received FeltOS package, installed on
Cold Red Gate, or proven interoperable with Mastodon/Misskey/Lemmy. The
Living Web Server package is currently also private source, so resolving
the declared source imports into an installable application closure is still a
required release step. MOOSE must ultimately meet then beat each appropriate
Fediverse incumbent in independently exercised social, moderation, identity,
migration, and operating workflows; these source tests establish no parity.
