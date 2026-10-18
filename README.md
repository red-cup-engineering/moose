# MOOSE — MUD, Object Oriented, Socially Extended

MOOSE is the Semioverse's named, reusable **social application and platform**.
Its original implementation is under Computer MUD Engineering in Computer
Systems, not inside MetroPlat, an application site or the Fedify provider.

This app imports **Living Web Server** for live TUFTE human pages. It imports
the existing **ActivityPub Server** for one site-aware HTTP/ActivityPub
composition and its managed Fedify delivery lifecycle. Networking owns signed
federation, WebFinger, inboxes, outboxes, followers and delivery. MOOSE owns the
public social readout and its application composition. FellOS/world authority
and SignCell/SignGraph evidence remain upstream and are supplied through
original source readers, never inferred from a route.

The root page is a bounded, current source reading, not a stored feed copy.
`/people/:identifier` is a human actor view. The same actor's signed machine
face remains `/actors/:identifier`, served by the original provider. Extra
applications can contribute additional TUFTE page declarations.

## Native use

`createMooseSite({origin, provider, readPublicTimeline,
readPublicActor, authorizePublicRead, pages, kv, queue, release})`
accepts already-authorized source and native provider capabilities.
`createMooseEngine({sites})` constructs the original ActivityPub multi-site
engine; `serveMooseSites({sites, trustProxy, hostname, port})` starts the
managed original host with durable queue workers and source-custody shutdown.

`commissionLocalMooseSite` will bind original private-key and journal custody.
A source declaration alone cannot authorize an actor or serve private data.

## Release status and market requirement

This is a source-owned *private pre-release package*. It has not been published
to the private registry, imported by a received FeltOS package, installed on
Cold Red Gate, or proven interoperable with Mastodon/Misskey/Lemmy. The
Living Web Server package is currently also private source, so resolving
the declared source imports into an installable application closure is still a
required release step. MOOSE must ultimately meet then beat each appropriate
Fediverse incumbent in independently exercised social, moderation, identity,
migration, and operating workflows; these source tests establish no parity.
