# Native public outbox interpretation

## Requirement

The machine outbox, served object and human timeline must agree on which post is current and public, including after an edit or restart. The original activity and source IDs stay in provider custody.

## Design

MOOSE opens the anonymous actor document through ActivityPub's `openPublicActor` and reads the outbox it advertises. The Modeled Actor Protocol (ActivityPub++) delegates collection traversal, JSON-LD interpretation, current-revision selection, and registered object routes to the ActivityPub provider. MOOSE selects its local actors and orders and limits their posts for presentation. A 404 or 410 actor contributes no posts. An invalid continuation fails the reading.

## Public profile and timeline

A profile read obtains the actor description and posts from one anonymous actor lookup and its declared outbox. The site timeline reads the admitted actors' outboxes. Both request one more visible post than they display so that `hasMore` can report confirmed additional results. Reading can stop at the provider's five-page sampling limit. The human page links to the actor's original public outbox. [ActivityPub outbox](https://www.w3.org/TR/activitypub/#outbox) and [Activity Streams paging](https://www.w3.org/TR/activitystreams-core/#paging)

## Receiving

Keep the original native local-node test: publish, protocol Note read, human HTML, edit, restart, delete and refusal. Keep bounded cursor tests and public/foreign/private actor refusals. Qualify the actual installed package and FeltOS consumer before host receiving.

The [Node acceptance specification](../specification/node-acceptance.json) binds the MOOSE reader refusal and human-page example to their native tests.
