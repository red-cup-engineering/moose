# Source terms and provenance

MOOSE's existing source, and new MOOSE documentation and tests in this change,
retain the MIT terms in [LICENSE](LICENSE).

## Original World gateway

`src/world-gateway.mjs` is relocated without changes from Red Cup Engineering's
FeltOS source:

- Repository: `https://github.com/red-cup-engineering/feltos`
- Revision: `cae43a25f2134235ab2f2f92c96374760d71074d`
- Original path: `src/server/world-gateway.mjs`
- Git blob: `919345f6a627b17a76b5e4cc62b49bde360a7d2f`
- Published original package: `@red-cup-engineering/feltos@0.21.9-dev.1014`
- Original package license declaration: `UNLICENSED`

The original gateway retains that declared status. Its inclusion here does not
grant MIT rights to that file or change its copyright, authorship or terms.
The surrounding MOOSE MIT license applies to the MOOSE-authored files as
described above; the original World family below also retains its source terms. The original file was verified byte-for-byte against the publicly
retrievable source package before relocation. Retaining the original license
declaration is separate from verifying public availability.

The gateway's historical `feltos.*` data kinds and
`metroplat.subject-binding` admission identifier are retained to preserve
existing content-addressed requests and recovery handles.

## Original World, World reading and geometry

The following implementation bodies are relocated from
`red-cup-engineering/feltos` at revision
`2cdc8ab5747c386db1f2eee70245d1c16cca9242`. The original package declares
`UNLICENSED`; that status is retained for these bodies and their modifications.
Their inclusion does not grant MIT rights or change original authorship.

| Original and current path | Original Git blob | Intentional changes |
| --- | --- | --- |
| `src/world.mjs` | `e2b77571b9f8222d86be10f18d3767481fd10181` | Imports the original history and Thing operations through CAIRN; supplier comment and refusal wording follow that selection. |
| `src/world-reading.mjs` | `b4a10c63a8f678ee45586793ca2b09df288b3725` | Imports the original history operations through CAIRN. |
| `src/geometry.mjs` | `cac5e1c182530fd1d6d365f3f83bdf8819410a1d` | None; the original body is byte-for-byte unchanged. |

Historical `feltos.*` record kinds, policy identities, sources, causal revisions
and witness positions remain intact. The new `src/world-history.mjs` is a
MOOSE-authored direct export of CAIRN's selected original history functions.
The authored source normalization and its receiving tests are not a claim of
new mathematical derivation or a native semantic fabrication receipt.
