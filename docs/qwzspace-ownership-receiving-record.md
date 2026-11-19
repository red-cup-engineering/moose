> Received from QwzSpace on the move of its game, room and server modules to MOOSE. This is QwzSpace's earlier ownership and receiving record, kept whole; paths such as `src/room.mjs` now live under `src/world/` and `src/game-content/` here. QwzSpace's current statement is `docs/renderer-ownership-receiving.md` in its own repository.

# QwzSpace renderer ownership and migration receiving

*Owner: Red Cup Engineering / QwzSpace. Source status: 2026-10-25.*
*Purpose: retire the historic "realtime game platform" as the governing
identity. Consolidate **2D and 3D rendering for browsers and terminals** into
shared engines consuming source-owned geometry and dynamics. TUFTE, games and
other applications consume those engines; preserve installed contracts.*

## Correct dependency direction

The **producer** (Holofoam, a scientific package, FeltOS, a knowledge
workbench) owns its actual observations, world transitions, actor identities,
permissions and temporal laws. It projects a QwzSpace `SceneDescription`.
QwzSpace owns camera math, 3D meshes, shading, WebGPU/WebGL/Canvas tiering,
picking and responsive visual presentation of that description.
TUFTE owns browser app/tiles, forms, navigation, asynchronous GUI island
lifecycle, accessibility and synchronized panes.
The owning web server delivers the application and preserves host admission.
Nothing in a rendered coordinate, selected object or WebSocket receipt is
permission to act on a simulation or read another resource.

For the first native browser call use
`@red-cup-engineering/qwzspace/browser-renderer`:
`mountBrowserRenderer(host)` → `render(scene,{camera})` →
`pick(clientX,clientY)` → `destroy()`. The real engine uses QwzSpace's
`createSceneView`, `poseOver`, GPU devices, scene graph and Canvas2D
fallback. `./tufte/browser-renderer` exports its asynchronous TUFTE
`mount(element,props)` component; the server-selected
`createTufteSceneTile` has bounded source JSON, an accessible fallback,
and no inference.

## Geometry, observation and source retention

The Leader's 25 October rendering direction requires an explicit derivation
from relationality/Obsmetrologia, beyond moving repeated drawing code. The
Science [recovery contract](https://github.com/lenticule-science/obsmetrologia-science-services-section/blob/a8515044eb632f4fc3b639e3b3d8d106e64b90ff/docs/preprints/00-generated-relational-foundation.md)
requires a generated carrier, its projection, the recovered structure and
the information lost. That is the contract for each rendering capability;
a package dependency alone does not establish mathematical derivation.

| Stage | Owner and preserved meaning | Explicit choice or loss |
| --- | --- | --- |
| Source geometry and dynamics | Science supplies definitions; Metrologic supplies executable mathematical carriers; the producing application owns source identities, admissible transitions and visibility. | A supplied Euclidean scene does not establish its derivation from Marks. |
| Numeric scene coordinates | Existing Metrologic [icosahedral geometry](https://github.com/red-cup-engineering/computer-data-engineering-services-section/blob/dfaec01316a15fb0b1fe9fd15b823e2dbc877e13/lib/metrologic/src/articulation/predicating/geometry/spatial/icosahedral.mjs) supplies exact site projections and separate `physicalFloat` / `physicalToFloat` readouts. | Binary64 coordinates approximate the exact carrier. Retain source identity independently; screen coordinates cannot recover a lattice site or its internal projection. |
| Camera observation | QwzSpace owns one finite `PlanProjection` contract for Canvas plan drawing, plan picking, inverse plane selection and terminal placement. | Camera, scale, orientation and selected plane are display choices. A plan discards elevation; an inverse returns a point on the caller-selected plane, not the original 3D source. |
| Output | Browser and terminal adapters consume that projection and preserve supplied entry IDs. | Clipping, glyph selection, overlapping entries and cell quantization lose detail. Terminal output must retain the colliding source IDs separately from the visible glyph. |

Equal pictures cannot establish equal source states or stopped dynamics:
[KineticProjection](https://github.com/lenticule-science/obsmetrologia-science-services-section/blob/a8515044eb632f4fc3b639e3b3d8d106e64b90ff/Obsmetrologia/KineticTheory/KineticProjection.lean)
exhibits persistent source motion under constant observation. A coarse
projection can also hide a source obstruction, as
[ProjectionHiddenObstruction](https://github.com/lenticule-science/obsmetrologia-science-services-section/blob/a8515044eb632f4fc3b639e3b3d8d106e64b90ff/Obsmetrologia/Closure/ProjectionHiddenObstruction.lean)
demonstrates. Rendering and picking must preserve the source reference without
inventing equivalence, composability, evidence or permission. Visual tweening
does not advance the producer's dynamics.

The selected first increment shares QwzSpace's existing plan observation
across its consumers and adds terminal receiving. It does not establish a
complete Mark-to-renderer theorem, a new exact metric or physical browser/terminal
device parity. The plan adapter remains a 2D observation; the separate shared
RGBA raster supports receiving depth-rendered images through terminal encoders.

The allocation is `src/plan-projection.mjs` for the shared numeric observation
and `src/render-terminal.mjs` for scene entries, strokes and contacts projected
onto terminal cells, exposed through an opt-in `render-text` plan view. The
terminal result retains the source scene and all occupants of each cell;
clipped observations and a chosen visible glyph do not delete source facts.
Native tests and output-specific receiving determine implementation status.

`src/geometry-scene.mjs` supplies the finite bridge from an actual named
Metrologic numerical carrier into existing scene entries and boundary strokes.
It retains original geometry, vertex and face references, snapshots numeric
coordinates, and preserves every directed face incidence. Existing URI/NI
machinery names the scene-id/source-name descriptor so reordering or moving a
vertex cannot rebind a retained selection to a different source. These names
do not authenticate provenance or hash the complete source state. Caller-owned
references are deliberately mutable; historical custody requires immutable
source observations from the producer.

Its explicit `{placement: "source", ground: false, water: false}` presentation
policy prevents the 3D graph's legacy game behavior from clamping negative z,
inventing an unplaced-body ring, or adding terrain/water. Point glyphs are
centered on supplied positions. Source coordinates in the CPU graph remain
binary64, while meshes and device matrices introduce a further binary32
readout. Existing games retain grounded presentation by default.

### 25 October source candidate and receiving

**Original Leader request, retained in full:**

> I want us to put a lot more attention into our 2d and 3d terminal and browser rendering capabilities, which are currently waaaay too spread out across different packages, code in games and stuff that should consume upstream engines, stuff like that.
>
> We want to create 2d, 3d, other rendering engines that are first-class derived from the geometry and dynamics of relationality/obsmetrologia.

This candidate is one shared rendering increment under that broader demand.
It is not the entire engine-consolidation program. Its source base is QwzSpace
`bf27ebb2cb67a079c03252f82feee3d578f6ac5d`; existing issue #10 and draft #9
were inspected before source changes. The first increment merged through #13
at `8e5b04f1e3d6fc3ee139391d9dabe228f81ac81e`. This release continues from that
main and preserves #9's original compatibility source and ancestry. The actual
published FeltOS owner selection below replaces the draft's missing exports.

| Original obligation | Concrete allocation and observable receiving | Remaining work |
| --- | --- | --- |
| Shared browser and terminal rendering | Canvas, plan view, viewport and terminal consume one finite chart; terminal reuses Canvas operations. Native Chromium receives Canvas and software WebGL2, projection loss, source picking and terminal collisions. | Physical GPU/WebGPU and installed terminal receiving; full depth rendering on terminal outputs. |
| Applications consume upstream engines | Existing QwzSpace consumers use the shared chart. The world/game compatibility paths use received FeltOS owners; the common RGBA implementation moves upstream from Abrash into QwzSpace. | Receive the separate Abrash/Daleske compatibility releases and downstream game/application editions. |
| Geometry and dynamics derived from relationality/Obsmetrologia | Preserve carrier, projection, recovered structure and losses. Exercise an original Metrologic J26 carrier; retain named source identity and directed incidence across numeric observations. A changed z can leave the plan identical without stopping source motion. | Full relational generation/metric/kinematic derivations remain Science and Metrologic work; the finite numerical bridge is not a Mark-to-renderer proof. |

**Architecture choice.** Retain the existing GPU/Canvas graph and scene
lowering, replace repeated plan camera/inverse calculations with one pure
QwzSpace chart, and add a terminal adapter over those same operations. Keeping
three separate projection implementations would retain the observed sign,
camera and picking drift. Moving the chart into a guessed Metrologic export
would create an unavailable dependency: the inspected owner has exact spatial
and kinematic carriers, but no matching generic binary64 camera API. Numeric
display choices therefore stay here until an actual upstream contract is
qualified. Games retain transitions and actors; terminal lifecycle remains
with its existing terminal owner.

**Initial source candidate evidence.** `prove-geometry-scene` used the original
Metrologic **0.4.0** [J26 source](https://github.com/red-cup-engineering/computer-data-engineering-services-section/blob/58613415da5d0353d549507396d4886819afe58d/lib/metrologic/src/articulation/predicating/geometry/spatial/gyrobifastigium-j26.mjs),
matching QwzSpace's declared dependency, rather than substituting current
unreleased mathematics. All eight vertices and fourteen unique named boundary
edges reach Canvas operations, the CPU 3D draw graph and terminal cells.
The source's face cycles are not consistently outward; the adapter retains
them and makes no filled-face or oriented-manifold claim.

The focused tests cover source identity under reorder/insertion/motion;
coincident geometry; explicit negative elevation; stale game weather removal;
Canvas operation compatibility; camera and picking consistency; failed or
resized redraws; terminal clipping, collision custody and work limits; and
habitat near/far meshes remaining inside the same picking bounds. The
projection suite was authored independently from the contract before its author
read the implementation. A separate reviewer authored terminal acceptance tests
after inspecting that implementation and found concrete counterexamples.
Later fixes are retained as regressions, not unseen assays of the final candidate.

That initial execution used Node **24.22.1** and verified original supplier source subsets:
FeltOS **0.20.2** at `69ac0b9591dd1556646b49722f8826bc9504f868`, URI **0.1.1**
at `5f0892ee278c18304c71f32bf7ca658923f59517`, Cryptographic Data **0.3.1** at
`49ba4f7b54da5e262226b2135237d594dafebe9a`, JSON **0.4.0** at
`24885f2cffda6d2c62f2375e4556dab1aeb766ba`, and Metrologic **0.4.0** at
`58613415da5d0353d549507396d4886819afe58d`. That increment made no dependency selection,
version or lockfile changes. It established selected source execution; it did not
establish registry tarball integrity, a complete frozen package installation,
the entire QwzSpace suite, physical GPU output or downstream deployment.

The initial focused run passed **70/70 named Node tests in 16 files**, with zero
failures or skips. The command below now selects the behavioral Canvas test
that replaced the historical snapshot file; that old count describes the
original run, not a new execution of this updated selection. On the matching
source/dependency environment:

```sh
node --test --test-isolation=none --test-reporter=spec \
  tests/prove-plan-projection.mjs tests/prove-render-terminal.mjs \
  tests/prove-geometry-scene.mjs tests/prove-plan-consumers.mjs \
  tests/prove-render-2d.mjs tests/prove-render-2d-spectacle.mjs \
  tests/prove-canvas-rendering.mjs tests/prove-scene-viewport.mjs \
  tests/prove-scene-view-tiers.mjs tests/prove-spatial-backend-contract.mjs \
  tests/prove-scene-contacts.mjs tests/prove-scene-strokes.mjs \
  tests/prove-habitat-drawables.mjs tests/prove-browser-renderer.mjs \
  tests/prove-browser-device-disposal.mjs tests/prove-renderer-ownership.mjs
```

### SignCraft-derived engine and native browser receiving

The next source increment places the engine below the explicit
Metrologic → SignCell → SignChain → SignGraph → SignCraft hierarchy. The
`proof-motion-scene` adapter calls the actual SignCraft
`proofMotionCarrierOf(order, originalSettlement)` and consumes its replayed
evidence events, licensed predecessor edges and Metrologic causal frontiers.
It does not create a second inference engine, source graph or causal solver.

| Requirement | Component contract | Receiving |
| --- | --- | --- |
| Render a source-derived causal structure | Require the original settlement and version-2 order; upstream replay must succeed. | A two-sided premise and actual SignChain rule produce three evidence events and two licensed edges. Missing settlement, forged source ID, removed predecessor and removed opposition refuse. |
| Preserve source distinctions | Keep signed event/witness/rule identity, canonical cell address, directed edge endpoints and original source objects. | Two witnesses of one cell remain separately selectable and retained through terminal source custody. |
| Declare the observation | x is centered display index within a causal frontier; y is causal rank; z is a signed display lane. All distances and angles are display choices. | Existing Canvas, 3D graph and terminal engines receive the same scene; no source transition occurs during rendering. |
| Bound finite output | Accept 1..512 events and at most 512 predecessor strokes; refuse excess instead of truncating evidence. | Empty/excessive carrier and stroke-budget refusal cases precede drawing. |
| Verify actual device output | Run real Chromium Canvas2D and WebGL2 against source-derived scenes. | J26 has eight vertices and fourteen strokes; all eight are pickable. A replayed SignCraft proof has three pickable events and two strokes. |

Native execution used Node **24.22.1**, Playwright **1.62.1** and Chromium
**134.0.6998.35** with software WebGL2. The browser exposed an actual Canvas
defect: world-scaled point radii and line widths covered the entire source
field under magnification. The repair gives source point markers a three
backing-pixel radius and spatial strokes a one-backing-pixel width. Legacy
game circle operations retain their existing radius contract.

The corrected J26 picture changes **2,755 of 166,400** Canvas pixels against
an empty scene; software WebGL2 changes **3,100**. Elevation-only source motion
changes **0** plan pixels and **5,713** depth pixels. The native Canvas check
first establishes an unchanged-scene readback control because the first
read can change Chromium's raster path. All **22** source entries/strokes
survive terminal receiving despite **93** occupied-cell collisions. The
host-derived SignCraft proof changes **1,427** Canvas and **1,763** depth pixels,
with all **five** events/edges retained by the terminal. These are measurements
of this fixed fixture/device, not universal thresholds or hardware claims.

The source adapter and native browser checks passed **5/5** selected cases;
the adapter plus ownership regression passed **6/6**. The earlier Canvas
repair and affected consumers passed **32/32**. These runs used the original
reviewed source providers and are separate from final released-package
receiving. QwzSpace `0.10.0` selects SignCraft `0.6.1-dev.1`, SignCell
`0.13.1-dev.0`, Metrologic `0.14.3-dev.3` and FeltOS `0.21.8-dev.6`.
SignCraft's original 516 native tests passed on a normal frozen registry
installation of the repaired Cell/Chain/Graph/Metrologic cohort before
integration at `93023320a42eaeb23270f54bac8fe8f13bbb9538`. Its source-only
File integration fixture was then placed outside the runtime package's
shipped tests, retaining all 516 original native cases. The actually published
`0.6.1-dev.1` artifact matches `fce1e424aa05003bca7769ca7333af6e4a0068a0`.
Final QwzSpace receiving consumes that immutable artifact through its normal lock.

```sh
QWZSPACE_CHROMIUM=/path/to/received/chromium node --test \
  tests/prove-geometry-browser.mjs tests/prove-proof-motion-scene.mjs
```

**Current authorization and construction status.** The Leader subsequently
gave the following direction, superseding the earlier procedural draft-only hold:

> We need to make SignCell downstream of Metrologic, SignChain downstream of SignCell, SignGraph downstream of SignChain, SignCraft downstream of SignGraph,Your are approved to act with fully autonomy to address existing issues, pull requests, branches, and other sources to repair this code into alignment with the research, requirements, specifications, and designs we SHOULD be fabricating with engines downstream of SignCraft, and using to fabricate our code itself, closing the metacircular RSI loop of code fabrication via kinetic proofing, while unblocking our ability to read in all our files as cells sharing the same graph, so we can fix our implementations of L-Space and thus unblock our knowledge systems for our swarm.
>
> You are fully authorized to merge in and get them to production, given our broader CI/CD stuff is broken

Carry the independently reviewed and verified source into integration and its
real publication/consumer path under that authority. Preserve the distinction
between this authored repair and a native fabrication result: no native
construction receipt is claimed. Repair the actual upstream dependency,
fabrication and kinetic-proof consumers so future work can use them; their
current incompleteness does not hold this authorized source repair. Package
publication, browser/device verification and downstream activation each retain
their own concrete receiving evidence.

### Shared device lifecycle and native recovery

Receiving on an actual browser exposed a device lifecycle defect: the native
WebGPU device could be lost after first readiness while the renderer still
reported successful WebGPU drawing and retained stale picking information.
The original WebGPU owner now exposes its actual `GPUDevice.lost` promise and
availability. `render-3d` stops claiming graphics, drawing or picks after
loss. A browser-originated loss with reason `destroyed` is still unexpected;
only the owner's explicit disposal is intentional.

`createSceneView` owns the continuing recovery. It retains one stable view,
the latest scene and camera aim, descends the original graphics ladder within
the requested cap, replaces API-locked canvases, and replays that scene through
the surviving renderer. Its `canvas`, `tier`, `graphics`, `state`, `ready` and
`loss` are current readouts. `onChange(listener)` returns an unsubscribe
function; projection and picking are neutral during recovery. Disposal ends
recovery, including disposal while device acquisition is pending.

The browser renderer and game client follow that current surface. Resize
observers, pointer listeners, labels, status and focus move with the view;
removal unsubscribes and disposes once. Form focus chosen during recovery is
retained. The island example's separate device-selection loop is removed in
favor of this same owner. An optional source-unit camera `lift` preserves its
original overview pose; its default leaves existing callers unchanged.

Native receiving used the Chromium **151.0.7922.34** edition selected by
Playwright **1.62.1**, received from the official Chrome for Testing origin.
The original Playwright CDN returned an HTML error, so the actual ZIP was
received separately, CRC checked, and addressed by SHA-256
`3cfc2bd00d1bafcf8a68dc74c9c92bb7150ddc8d26ade948a776316e1cec4f14`.
The browser reported missing Vulkan surface support and failed WebGPU
swap-chain creation. A successfully created adapter or a first ready frame
did not establish displayed WebGPU pixels.

The permanent native recovery assay received the actual device-loss signal,
one replacement canvas and a visible original island through WebGL2. The
recovered image had mean luminance **113.389**, spread **51.523** and mean
channel difference **0** from the original WebGL2 control. It had no page or
console errors. Its receipt explicitly records `webgpuPixelsQualified: false`.
The recovery and original WebGL browser cases passed **2/2**, including all
**26** existing WebGL visual assertions. Shared owner and browser-consumer
unit cases passed **23/23** before the separate game-client DOM receiving.

The original WebGPU-only image test remains a genuine failed qualification
on this host. Its thresholds are unchanged. Both original browser image
assays now read the active renderer status after the screenshot, preventing
recovered WebGL pixels from being attributed to an earlier WebGPU status.
The new signal contract covers native WebGPU loss; existing WebGL context
restoration retains its original owner and is not newly qualified here.

### Final source and installed supplier receiving

The final candidate uses a normal **registry-only frozen PNPM installation**
on Node **24.22.1**, retaining the original package-age policy with six exact
new-owner exceptions. No source aliases, copied-in providers or substitute
mathematical suppliers are used in this receiving environment. The hierarchy
is selected through actual published packages:

| Owner | Selected edition | Received source |
| --- | --- | --- |
| Metrologic | `0.14.3-dev.3` | `de8cc5e4f919dc7c9aa1dc03d48a63c0ddab2ea7` |
| SignCell | `0.13.1-dev.0` | `f47ab5080cec8148a8ffa6b11e6897e744bb4a76` |
| SignChain | `0.4.2-dev.0` | `81199a73b95c9d52e54bfafebe2a01885b91d5f2` |
| SignGraph | `0.7.1-dev.1` | `193273eac367b24266b32f27a7a77d191f21e381` |
| SignCraft | `0.6.1-dev.1` | `fce1e424aa05003bca7769ca7333af6e4a0068a0` |
| FeltOS compatibility owners | `0.21.8-dev.6` | All five keeper/world-game modules match their original merged owner blobs; all 291 archive members were received. |

The complete original `pnpm test` inventory finished in **49.21 seconds**:
**163 test-runner cases, 160 passed, three failed, zero skips**. It included
the original networking, world/game, rendering, native browser and new
lifecycle cases. Two failed modules exposed stale fixtures, not new runtime
failures, and received these bounded repairs:

- The native geometry browser assay resolves portable SHA-256 through the
  selected URI owner's public export and its own declared dependency closure.
  It no longer assumes that URI's dependency is a direct QwzSpace dependency
  under PNPM. The final module passes **1/1**. On Chromium 151, J26 changes
  **2,749** Canvas pixels and **3,100** WebGL2 pixels; elevation-only motion
  changes **0** and **5,713** respectively. All eight J26 vertices and all
  three proof events remain pickable.
- The original inscription fixture supplies the nonempty room description
  required by its received FeltOS owner. Its obsolete padded bounds are
  replaced by independently authored geometric extents, checked with a
  `1e-6` float32 tolerance and containment of every near/far mesh vertex.
  The final module passes **2/2** with its conflict and rendering assertions
  retained. No production geometry changes were needed.

Thus the complete inventory plus affected final module runs supplies **163
passing cases and one remaining WebGPU-only visual failure**. This is
composite final coverage, not a second fully green suite execution. No module
was excluded, no failing graphics assertion was skipped, and no visual
threshold was relaxed. The earlier TLS fixture now uses the real Node HTTPS
server API; browser executable selection and cleanup are also corrected in
the original browser assays.

The new game-client consumer case uses the real browser DOM and actual mouse
pointer capture, with a declared deterministic scene-view lifecycle fixture.
It receives replacement selection exactly once, retired-surface cleanup,
neutral recovery input, form draft/focus retention, text-tier focus, and final
teardown without late resurrection. It is consumer-contract evidence,
separate from the actual native GPU-loss/pixel result above. The original
published FeltOS owners additionally pass **11/11** native owner cases.

The Leader's explicit authorization to integrate despite broken broader CI/CD
applies to this source release. The unresolved WebGPU device qualification is
retained as an actual platform limit; the proven lower-rung recovery does not
convert it into a WebGPU success. QwzSpace publication and the separate
Abrash/Daleske installed consumer cutovers still require their own immutable
archive receipts.

### Shared raster owner and consumer compatibility

[Abrash's framebuffer](https://github.com/red-cup-engineering/abrash/blob/c97113319cb04459176705015f0d11e393658690/src/framebuffer.mjs)
and [Daleske's framebuffer](https://github.com/red-cup-engineering/daleske/blob/6eb5cece8266f75fe268ba2dd84f7ddd270b294f/src/framebuffer.mjs)
duplicate byte clamping, RGBA allocation, dimension normalization, pixel
access, clearing, clipped rectangles and blitting. Abrash adds Canvas delivery;
Daleske adds tile geometry and diffing. Daleske's framebuffer subpath itself
has no imports and is browser-safe; the ownership choice must not be justified
by falsely claiming that this subpath imports TTY state.

`src/framebuffer.mjs`, exported as `./framebuffer`, now owns these common pure
operations. Independent comparison found its complete byte-clamp and class
implementation byte-for-byte identical to the original Abrash core. Four
native cases receive legacy dimension normalization, enumerable fields,
chainable mutation, byte clamping, transparent out-of-bounds reads, clipped
rectangles and exact RGBA blitting. This is a source-preserving transfer, not
a newly claimed mathematical raster derivation.

Abrash's compatibility export can use that exact class while keeping
`paintToCanvas`. Daleske's class extends it with `cols`, `rows`, `tileRect`
and `tilePixels`, retaining its original diff/encoding/lifecycle owners.
The shared subpath has no imports and loads no DOM or terminal state. Normal
package installation still receives QwzSpace's full dependency closure;
a future smaller package cut must preserve this accepted owner and contracts.
The separate consumer editions require actual QwzSpace publication and full
native receiving before cutover. There is no Abrash-to-Daleske package edge.

### Received world and game source owners

The originally selected FeltOS `0.21.8-dev.0` artifact lacks the owner exports
required by draft #9. Published `0.21.8-dev.6` contains all five merged owner
modules from FeltOS #115/#116/#117. Each executable owner matches its merged
Git blob, and its pure geometry source matches the older `0.20.2` source
previously used by QwzSpace. The artifact's actual selected dependencies are
retained for native receiving; an unrelated newer Metrologic source is not
substituted into that owner.

The old QwzSpace paths now directly export these functions. Existence, causal
time and quasicrystal transition source changes are only the original owner
imports/headers. The keeper additionally requires a real fetch function,
bounds visits at 1–256, rejects URL credentials and validates owed-tick headers
as nonnegative integers. Its default 12 visits and GET behavior are unchanged.
Strict public-function identity and the original keeper/world regressions
receive that behavior. No scheduler is changed by moving these modules.

### Migration order

1. Replace repeated plan projection and inverse calculations within QwzSpace
   with one contract, preserving current camera conventions and source IDs.
   Receive Canvas operations, picking and terminal cells against the same scene.
2. Direct game and application presentation through the owning renderer.
   Keep game transitions and actor policy with their source owners; retain
   compatibility until the replacement package and original tests are received.
3. Consolidate shared mathematical operations in Metrologic when their actual
   pure contracts are established. Reuse its spatial geometry and FOUR readout;
   do not invent missing vector, camera or raster exports.
4. Extend shared depth, clipping, mesh and alternate-space observations from
   those contracts, with source-preservation and numerical-error tests. Keep
   GPU, terminal and accessibility adapters specific to their output surfaces.

The source-authorized transfer in #9 proceeds with the received FeltOS
edition, normal consumer resolution and the original native contracts.

## Source ownership, actual current modules, next source change

| Current source | Correct owner | Required migration/receiving |
| --- | --- | --- |
| `gpu-webgpu`, `gpu-webgl2`, `render-3d`, `scene-graph`, `linear`, `solids`, `scene-viewport`, `scene-view`, `scene-strokes`, `scene-contacts`, `terrain`, `habitat-drawables`, `drawables` | **QwzSpace renderer** | Keep and improve, not reimplement in Holofoam, FeltOS or TUFTE. Establish real GPU/Canvas/text/no-JS receiving, resize, hit-test and bounded scene contracts. |
| `camera`, `tween`, `particles`, `render-loop`, `render-2d`, visual part of `assets` | **QwzSpace renderer** | Keep presentation math/effects here. Content-address/hash verification comes from the existing Data/NI owners; do not create a second one. |
| `geometry-scene`, `proof-motion-scene`, `plan-projection`, `render-terminal`, `render-text` | **QwzSpace scene observation and accessible presentation** | Preserve source identity/losses through finite geometry, replayed SignCraft motion, shared plan charts and bounded terminal cells. Keep prose fallback and terminal device lifecycle distinct; qualify actual source, package and installed consumer independently. |
| `world-keeper` | **FeltOS `world-host/keeper`** | Direct compatibility export from published FeltOS `0.21.8-dev.6`, whose module matches [FeltOS #115](https://github.com/red-cup-engineering/feltos/pull/115). Original GET/owed-tick and strict function-identity tests receive the owner. No scheduled tasks modified. |
| `room`, `room-registry`, `lobby`, presence/game actor policy | **FeltOS / owning MUD or game application** | Carry original actor provenance and scope, preserve replay/capability tests. Migrate room control where its complete owning interface is received; **never move auth into renderer**. |
| `intent-queue`, `intent-log`, `snapshot-manager`, `replay`, `resume`, `tick-driver` | **Existing event-stream Data/Computer Content Graph**, with FeltOS owning world tick meaning | Existing modules already import `computer-content-graph-engineering-services-section/event-stream` for queue/log/projection/replay. Extract remaining domain-free machinery to its source owner only with exact package availability and full replay proof. |
| `create-server`, `http-ws-server`, `broadcast-hub`, `client-browser`, `client-node` | **Networking / Living Web Server** for transports, **FeltOS/game** for room protocol | The Living Web Server product is distinct from the lower-level `computer-web-server`. Confirm its actual installable owner before moving an app service; do not quietly promote the low-level HTTP utility into that product. Reuse existing Networking WebSocket framing. |
| `game-client`, `game-styles`, `operation-input`, `cell-evidence`, `audio-cues`, `tufte` room HUD | **TUFTE GUI** for general-purpose interaction, and **each consuming game/app** for hotbar/chat/actor verbs | Extract generic HTML/GUI controls only when they are domain-neutral. Do not make QwzSpace graphics a game HUD, and do not migrate private player state into generic TUFTE. The **renderer-specific** TUFTE tile stays QwzSpace's consumer-facing projection. |
| `scene/scene`, `scene/existence`, `scene/time`, game intent in `scene/protocol` | **FeltOS world-game owner** | Direct compatibility exports from published FeltOS `0.21.8-dev.6`, whose modules match [FeltOS #116](https://github.com/red-cup-engineering/feltos/pull/116) and [#117](https://github.com/red-cup-engineering/feltos/pull/117). Original transition behavior and strict export identities remain the receiving contract. |
| `scene/server`, `demo-world`, `environment` and domain-specific game/simulation callers | **FeltOS or specific game/science owner** | Still in QwzSpace main. Migrate original server/game semantics only after a real owner has accepted the complete protocol and tests. Holofoam chemistry is NOT assigned to a MUD package. |
| `project`, `fiber`, `place-tree` | **Producing world/source owner** for domain descriptions, **QwzSpace** for drawing them | Distinguish producer-specific FeltOS perception projection from the neutral `SceneDescription` carrier. Do not manufacture geometry or agent identity in the rendering core. |
| `admin`, `persistence` | **Owning world/Operations services** | Administrative permissions, data storage and read/write receipts stay behind an independently authorized host, not the graphics API. |

This ledger describes current source and receiving obligations; it is **not**
proof those other owners have released or installed the relocated modules.
For unavailable/undiscovered provider source, retain a compatibility
implementation until an exact, verified owner is established rather than
introduce a nonexistent import.

## Executable renderer import-boundary guard

The original browser renderer and its native TUFTE component must
never depend on the QwzSpace gameplay engines. The pure
`src/render-tiers.mjs` now owns the visualization-tier vocabulary;
the old `src/scene/protocol.mjs` re-exports those exact objects to
preserve world/game clients. `src/scene-view.mjs` imports directly
from its graphical owner.

`tests/prove-renderer-ownership.mjs` walks the actual source import
closure from browser, geometry, plan and terminal entrypoints, refusing a dependency on
room/replay/intent/clock/world-simulation modules or Node host APIs.
It also requires renderer-tier export identity across old and new
public paths. This guard must run in QwzSpace's normal native suite
for every source transfer. A test of this graph is **not** GPU
rendering receiving; browser WebGPU/WebGL2/Canvas validation remains
an independent obligation.

Residual provider cleanup: the scene graph and depth renderer
still consume pure terrain and heightfield helpers from
`@red-cup-engineering/feltos/geometry`. That is an existing
source dependency, not an acceptable reason to drag FeltOS game
actors or world transitions into a renderer. Consolidate these
numerical geometry readers only through an identified, installable
pure upstream owner with matching original height/mesh tests.

## Finished executable increments and gates

**Renderer source implemented:** first-class `./browser-renderer`, optional
`./tufte/browser-renderer`, physically scaled source camera (including
millimetre-scale scenes), real WebGPU → WebGL2 → Canvas2D → text ladder,
CSS-space hit-testing, ResizeObserver redraw, failure cleanup,
native TUFTE source tile and readable fallback. Uses the existing source
graph/shader/device implementations, no second engine.

**Upstream GUI receiving:** TUFTE must accept asynchronous component
`mount`, queue changed props until device readiness, and dispose late
resolvers after navigation. Synchronous factories must remain identical.

**World-game ownership transferred at source:** FeltOS now owns the
original keeper, existence/death policy, causal event time, game intent
predicate and complete quasicrystal world transitions in merged owner
PRs #115/#116/#117 and the exact published `0.21.8-dev.6` artifact. This release
finishes #9's compatibility-source transfer on the newer renderer main,
including strict identity and replay tests. QwzSpace's browser graphics
remain independent of its historical world simulation. The package receiving
record qualifies the actual dependency closure; there is no scheduled-task
action associated with this source transfer.

The **next completion** for each moved file requires an admitted owner
package with original module and contract tests, its own published
immutable artifact and frozen dependency closure, consumer lock changes,
old-path compatibility receiving, and independently observed installed
behavior. A clean PR merge, source readback, demo screenshot or positive
GPU probe is not sufficient.

## Browser qualification

Run `node --test tests/prove-browser-renderer.mjs
tests/prove-tufte-scene-renderer.mjs` on an installed source-consistent
Node environment (follow the existing full QwzSpace `npm test` suite).
Browser receiving must separately demonstrate WebGPU and WebGL2
rendering the same source scene when supported, Canvas fallback,
text/no-JS readability, resize and DPR, actual CSS pointer picking,
source x/y/z and camera near clipping for fields smaller than 1 metre,
stable TUFTE async mount/update/navigation cleanup, and downstream
Holofoam scene receipt. Report capabilities absent on the browser
rather than claiming parity by assumption.

## Toonsday: original Actor as a source-bound cartoon performer (2026-10-20)

**Leader source:** “Toonsday: You as Cartoon Actor-Agent in the Semioverse.” The Leader reported Cold Red Gate down during the same exchange. Original [MetroPlat world contract](https://github.com/red-cup-engineering/metroplat/blob/main/content/text/documents/specifications/platform-instance-contract.md), merged [Toonsday cartoon-Actor specification #109](https://github.com/red-cup-engineering/metroplat/pull/109), [Media Science Agents as Cartoons #9](https://github.com/lenticule-science/media-services-section/issues/9). The beneficiary is the *same existing authenticated ChatGPT-Web Actor/Character*, not a new made-up entity, cartoon TV-production robot, or a source of new authority.

### Correct first engineering seam: native FeltOS frame → QwzSpace picture and text

The original FeltOS PerceptionFrame has an authenticated recipient Actor, currently perceived subjects with FOUR readings, optional source-addressed recent events, present scene and lawful action offers. `projectFiber` already maps the subjects to stable `SceneDescription` IDs with original `drawable` cells and the generic actor `figure` default. This increment corrects the renderer's former **source drawable gap** (Canvas2D ignored `entry.drawable` unless an independent `entry.sprite` was explicitly supplied) by registering a reusable original geometric `figure` and allowing `render-2d` to select an existing registered drawable *only* when an explicit sprite or text is not already specified. Existing id/labels remain; unknown names still fall back to the previous circle; custom or licensed designs require separate source selection and rights.

The figure has bounded, pure, source-selected rest/wave/point/hold drawing variants. These **are artistic arm postures**, not evidence that a particular Actor is feeling something, receiving power, attending a task or completing an obligation. QwzSpace does not invent a gesture from the text of a message. Native actual Persona and performance choice remain with the source-authorized upstream Playing/Organizing and the [MetroPlat Persona/Perform original Work #85](https://github.com/red-cup-engineering/metroplat/issues/85). No new Actor, source event, account, command, art license or permission store was added.

The source-provided FeltOS `recentEvents` (`id?`, `tick`, `channel`, `text`) now survives the same recipient's fiber as a bounded **last 16 events** reading with explicit omitted-count; the text tier quotes them under their original IDs/channels without parsing English as causal admission or a result receipt. This is a presentation window, not a new log. Because the native event schema does *not* carry a sender Actor, original Work cause, effect classification or approval witness, the renderer correctly **does not** infer whose mouth should move or which status icon should celebrate. That attribution/qualification must come from an original FeltOS/AOE/MetroPlat producer before richer cartoon performing is admissible.

`tween.interpolateScene` previously animated subjects removed from the next scene during an exit fade, and merged previous entry fields onto later entries even when the latest perception no longer contained those fields. For viewer-scoped FeltOS spatial (`frame: "enu"`, Actor-bound) scenes, this increment uses **only next-view subjects and current semantic fields**: no stale confidential entities, assets, labels, masks, original cells or past text/event feed survive. Existing explicitly present numerical artistic pose fields can still ease for a stable viewer; source metadata is always the currently admitted reading. Unscoped decorative scenes retain legacy entrance/exit tween behavior. This boundary is essential before a persistent agent is rendered as a cartoon in front of other Actors.

### Source-owned tests and remaining independent receiving

- Original FeltOS-created perception fixture → `projectFiber` → Canvas2D sprite/label and text tier, with explicit denial and pending *messages* that remain messages.
- Source drawable precedence, unrecognized names, pure figure shape/gesture determinism and backwards-compatible plain circle operations.
- Bounded recent event windows, escaped newlines, missing/withdrawn source data, one viewer's current scene rather than another viewer's stale actor/journal, and deterministic same-source replay.
- Native package-backed suite, actual browser rendering, scene pick → **original lawful world-command/Work receipt**, wearer Persona continuity, observed confidentiality, source registration/publication/installation, and independent comprehension tests remain required. No code here independently establishes these outcomes.

**Current inability to qualify live deployment:** Cold Red Gate is unavailable by the Leader's report; current MetroPlat `worldFrame` on main does not supply original recent Work events into FeltOS's `recentEvents`, and the generic `PerceptionEventType` does not encode originator/Work receipt. Existing [MetroPlat inhabited-world PR #75](https://github.com/red-cup-engineering/metroplat/pull/75) and [Persona/Perform #85](https://github.com/red-cup-engineering/metroplat/issues/85) must be received through their original owner versions. QwzSpace source tests and published package must be qualified before declaring this renderer installed on Cold Red Gate. The net new result sought is *actual accurate live cartoon performance and authorized reciprocal action*, not this source-commit count.
