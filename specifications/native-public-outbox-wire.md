# Native public outbox interpretation

## Requirement

The Leader requires useful upstream fixes to be published and received in Bare Cedar Fog. The original local-node acceptance test retains a public post and serves its Note, but its human timeline omits the post because Fedify emits a compact JSON-LD Public IRI. MOOSE shall interpret the original provider’s wire document through the context-aware ActivityPub reader before projecting the public timeline. It shall preserve original custody, actor/object identity, latest-update/delete behavior and public-read admission.

## Design

Use projectPublicActorPostsFromWire from the independently owned ActivityPub package. The existing async timeline reader awaits that producer. Keep the synchronous canonical projector at its existing upstream interface. No local alias map, remote context fetching, second feed database or unconditional public addressing is introduced. An explicit context that rebinds a prefix retains its original meaning. Exact package selection must include the exported native wire reader.

## Receiving

Keep the original native local-node test: publish, protocol Note read, human HTML, edit, restart, delete and refusal. Keep bounded cursor tests and public/foreign/private actor refusals. Qualify the actual installed package and FeltOS consumer before host receiving.
