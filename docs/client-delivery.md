# Realtime client delivery and lifecycle

The shared browser and Node clients use the WebSocket `readyState` contract:
`CONNECTING = 0`, `OPEN = 1`, `CLOSING = 2`, `CLOSED = 3`.

- `sendIntent(socket, sequence, kind, args)` returns `true` only when an OPEN
  socket's `send` returns normally. Other states return `false` without a write.
- `client.sendIntent(kind, args)` has the same boolean result. A refused send
  does not consume a sequence or register an optimistic prediction. A thrown
  transport write still throws and registers no prediction.
- `true` means local transport acceptance, not server delivery or execution.
  Only the original protocol acknowledgement reconciles pending predictions.
  Accepted but unacknowledged commands survive an automatic reconnect.
- Events are scoped to the connection that installed them. Late open, message,
  error and close callbacks from an obsolete connection cannot affect the
  replacement connection, view, predictions or reconnect schedule.
- Explicit `close()` is idempotent, cancels reconnection, clears disposable
  predictions and rejects outstanding controls. All later transport callbacks
  are inert. It does not change server state or replay an uncertain command.

This is a correction in the existing QwzSpace compatibility client, not a new
networking implementation. Browser and Node wrappers continue sharing it.
The wire envelope, session protocol and authentication policy are unchanged.

## Farstone receiving scenario

Farstone's original `src/web/farstone-client.mjs` limits held-key movement to
two unacknowledged predictions. Previously, pressing movement keys while the
socket was connecting or closed registered unsent commands and could fill
that window. Its actual `movementCommand`, `moverOf` and `predictFrame`
functions now receive only transport-accepted movement predictions through
the shared `connectRoom` client. Native and bundled consumer checks exercise
walk, acknowledgement, drop, refused strides, resume, next movement and a
late obsolete frame. This source check is not a deployed Farstone upgrade.

## Qualification

`node --test tests/prove-client.mjs tests/prove-client-delivery.mjs` checks the
unchanged resume/control behavior and the delivery/lifecycle contract.
The existing Specification-to-Code fabrication route also observes the
original `sendIntent` export at its exact source digest: positional JSON cases
for all three non-OPEN states return false, and an OPEN object without the
required `send` method throws. Callback-bearing sockets and live lifecycle
tests remain native JavaScript tests; JSON cases do not claim to model them.

Standard reference: https://websockets.spec.whatwg.org/#dom-websocket-readystate
