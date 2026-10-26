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
The surrounding MOOSE MIT license applies to the other MOOSE files as described
above. The original file was verified byte-for-byte against the publicly
retrievable source package before relocation. Retaining the original license
declaration is separate from verifying public availability.

The gateway's historical `feltos.*` data kinds and
`metroplat.subject-binding` admission identifier are retained to preserve
existing content-addressed requests and recovery handles.
