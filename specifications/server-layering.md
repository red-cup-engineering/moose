# MOOSE server layering

## Requirement and allocation

The Leader's 2026-11-11 direction requires MOOSE to consume Living Web Server,
Living Web Server to consume Web Server, and Web Server to consume Computer
Systems Server. These are responsibility and runtime dependencies. A package
name in a manifest, an unused import or a prose arrow is insufficient evidence.

| Layer | Responsibility | Original source owner |
| --- | --- | --- |
| MOOSE | Compose Worlds, public social views and the original federation site applications. | `moose`, `src/host.mjs`, `src/fetch.mjs` and the World modules. |
| Living Web Server | Admit exact application origins, compile their Web routes and commission one listener. | `living-web-server`, `src/host.mjs`; source-backed TUFTE views remain in `src/fetch.mjs`. |
| Web Server | Compile request handling and bind it to the original HTTP implementation under a Systems-owned lifetime. | `computer-web-server`, root and `./node` exports. |
| Computer Systems Server | Start and release the listener capability once, retain ownership until actual release completes, and report failure. | The existing `computer-system-platform/capability-lifecycle` implementation. This is a server role of that runtime, not a newly invented package or second supervisor. |
| ActivityPub | Own signed protocol routes, independent provider/queue custody, worker startup and ordered release. | `activitypub-server`; the listener is supplied through its existing `serve` port. |

The CAIRN/SignCraft dependency chain supplies knowledge, World cells and history.
It is orthogonal to the hosting chain and remains intact. FeltOS and ASSIST may
continue to consume MOOSE's portable Fetch application without commissioning a
MOOSE listener.

## Architectural decision

Previously, MOOSE's pages consumed Living Web Server, but `createMooseEngine`
and `serveMooseSites` directly selected ActivityPub's multisite host. That made
Living Web Server a parallel renderer rather than the hosting supplier.

Retaining that arrangement does not satisfy the required hosting chain.
Moving federation workers or key custody into Living Web Server would give the
generic platform domain-specific responsibilities. The selected change retains
ActivityPub's per-site protocol and lifecycle contracts, extracts its existing
per-site application, and uses the existing listener injection to select Living
Web Server. This preserves provider identity and avoids copying lifecycle logic.

The Web/Systems connection uses the original Systems capability lifecycle and
original HTTP listener. Systems receives the listener's start and close
capabilities; it must not import Web Server to implement that lifetime. A
managed close must await actual listener completion. The finite timeout policy
that can report an abandoned optional service is unsuitable for releasing an
owned listening socket, so this binding uses explicit unbounded start/stop.

## Component contracts

### MOOSE composition

- **M-HOST-1:** `createMooseEngine({sites})` shall require a nonempty site array
  and return the original host admitted by `createLivingWebHost`.
- **M-HOST-2:** Each site shall pass through ActivityPub's original per-site
  application admission, including provider/origin equality and protocol-route
  precedence. MOOSE shall not implement another federation router.
- **M-HOST-3:** Origin selection shall use the admitted Request URL. An unknown
  origin shall return 421 before any site reader or provider is invoked.
- **M-HOST-4:** The default `serveMooseSites` listener shall call
  `serveLivingWebHost` with the exact admitted MOOSE host. It shall preserve
  `hostname`, `port` (including port zero), and `trustProxy`.
- **M-HOST-5:** ActivityPub shall retain its existing independent-origin,
  queue, KV and custody admission. MOOSE shall forward the original site
  objects and preserve the existing explicit `serve` test-injection contract.
- **M-HOST-6:** Shutdown shall stop delivery workers and the listener before
  releasing durable custody, including interrupted startup. Repeated close
  calls shall share the original close operation.
- **M-HOST-7:** `./fetch` and `./source-application` shall not import managed
  hosting, Node transport, World machinery or federation custody. `./host`
  shall not eagerly import page rendering or World machinery.

### Supplier expectations

Living Web Server must provide `createLivingWebHost` and `serveLivingWebHost`
from `./host`; ActivityPub Server must provide
`createActivityPubSiteApplication` and the existing managed `serve` port.
The actual selected Web Server must bind its listener to the selected Systems
lifecycle. Matching version strings without the corresponding source or
artifact bytes do not establish these expectations.

The native Node listener supplies plain HTTP. Public HTTPS origins require
explicit trusted TLS ingress, and trusting forwarded origin headers requires a
loopback listener. No new public ingress, account, secret, queue or storage
format is introduced by this change.

## Verification and migration

The unchanged public MOOSE factory names remain exported from the root; `./host`
also permits consumers to select the hosting surface independently. Existing
Fetch consumers keep their original entrypoints and require no data migration.

| Scenario | Receiving evidence |
| --- | --- |
| Two sites, identical Actor handle, distinct origins | Actual MOOSE engine serves each original site; unregistered origin never calls either. |
| Website catch-all overlaps protocol namespace | Actor, inbox, outbox, WebFinger and unknown Actor routes remain with the original provider. |
| Real local listener | The MOOSE host is accepted by Living Web Server and returns the site's content over a loopback HTTP connection. |
| Managed startup and normal close | Exactly one delivery worker starts; worker stop and listener close precede custody release; repeated close does not repeat release. |
| Listener refusal | Invalid TLS/proxy policy opens no listener or worker; after custody admission, listener failure releases the commissioned resources. |
| Shared Web/Systems lifetime | Original Web and Systems tests show actual socket/stream drain, unbounded close, error propagation and no reverse runtime Web dependency. |
| Existing page and World consumers | Original MOOSE application and source suites, plus available native consumer tests, retain their behavior at the candidate revisions. |

`test/host.test.mjs` exercises the first five scenarios through the actual
Living Web and ActivityPub modules. It uses an in-memory provider to observe
host lifetime; it does not establish signed federation. ActivityPub's native
server and multi-actor tests supply that separate evidence.

The source changes require a dependency-ordered release: Systems lifecycle,
then Web Server, then Living Web Server. ActivityPub Server can release
independently with its existing Web supplier. MOOSE follows both Living Web
Server and ActivityPub Server. Candidate tests against linked exact source
establish source composition. Publication, clean registry installation and an
installed production instance require their own observations and are not
inferred from those tests.
