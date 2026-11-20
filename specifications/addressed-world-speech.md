# Addressed speech between Worlds

A player in one Dimension can speak to an offered Group in another Dimension. The receiving World commits the utterance to its addressed room. A player there can hear it live and read it on reconnect with `listen`. The authenticated Group and the accepted World observations have independent owners. [MOOSE Dimension contract, M-MSG-1, M-ACTOR-1, M-OCC-1 and M-DIST-2](dimension-world-coordination.md)

## Room standing

The local World author places the following nonfunctional predicates on an existing Area or room. The room must belong to a current World and Dimension. A Group must resolve to exactly one room, and that room's Group must be unopposed.

| Predicate | Object | Admission |
| --- | --- | --- |
| `world-speech-group` | Local Group actor IRI | Binds that Group's inbox to this room |
| `world-speech-to` | Destination Group actor IRI | Permits registered speakers in this room to send to the destination |
| `world-speech-from` | Record with `actor`, `dimension` and `world` | Permits speech from this exact remote actor in these source contexts |

The host verifies the signed sender, the intended personal inbox and the source ActivityStreams document through ActivityPub Engineering. MOOSE checks the current local reading for the room's authority, including opposing evidence. A player can address an offered Group with `sayto <world-group-IRI> <words>`. The source Dimension and World come from that player's current territory. The host binds the account to its own actor. [ActivityPub inbox](https://www.w3.org/TR/activitypub/#inbox) and [ActivityStreams context](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-context)

## Authored city editions

A city may identify its Dimension and Worlds with a local identifier, an NI reference, or an absolute HTTP(S) IRI. Rooms and Areas refer to their declared parent. A World selecting `policy: "runtime"` uses the installed game capabilities. A World with authored actions selects its action policy from those declarations.

An edition that removes speech standing records the room, predicate, object, and exact witness that its author withdraws. The receiving World checks this withdrawal against the author's source. An independent witness for the same grant survives. A subsequent edition can grant the same terms with a fresh witness. Independent opposition still blocks speech. The same rules apply after a checkpoint and to a reading that hides the withdrawal. This uses observed-remove set semantics for authored witnesses. [Bieniusa et al., *An optimized conflict-free replicated set*](https://arxiv.org/abs/1210.3368)

## Occurrence and recovery

The ActivityPub provider returns the Create activity ID, embedded Note ID, actor, recipient Group, source Dimension, source World and original content. The room accepts up to 4096 UTF-8 bytes of nonblank text. MOOSE observes the complete record and its destination room together in one SignCraft revision. Both statements retain the same witness, including the activity IRI and original local causal frontier.

Replaying the same occurrence against the same room returns its existing World. Changing the body under an existing activity ID refuses. Two distinct activities carrying identical words retain both occurrences. A compacted World preserves this evidence in its original SignCraft checkpoint. Local receipt order determines the order presented in a room. Concurrent, inconsistent statements survive a history merge and cannot supply certain speech.

`listen [1..20]` reads the player's current place through its selected World reading. It presents up to three utterances by default. Both the phrase and its room relationship must be visible with a common witness. Terminal presentation substitutes spaces for control characters and the record retains the original content. Receiving a phrase grants the sender no local character or position.
