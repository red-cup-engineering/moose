# Shared planar movement

## Ownership and consumers

MOOSE `src/geometry.mjs` owns the pure calculation. FeltOS `src/geometry.mjs`
forwards these same public functions. Its `src/space.mjs` uses them before
checking the destination region and committing movement. Farstone
`src/web/farstone-motion.mjs` uses them to predict an unacknowledged command.
Neither this change nor the client prediction grants movement authority.

The requirement is to keep one finite, bounded movement rule across those
callers, with no per-game geometry fork. The source-derived Requirement,
Specification, Architecture and high/low-level Design were processed by the
existing engineering-content and JavaScript Code fabrication packages.
The algorithm is authored source; the factory generates source-bound argument
contracts and executable cases, not this algorithm. See the receiving record
for exact source identities and the distinction between these stages.

## Contract

- Coordinates use metres, with x east, y north and z up. Headings use degrees
  clockwise from north. Planar movement does not choose elevation.
- `parseTarget(argument, pose)` accepts two or three finite absolute numbers,
  or an own compass-direction name followed by a signed finite distance.
  It returns `null` for malformed input, invalid relative origins or computed
  coordinate overflow. Inherited JavaScript property names are not directions.
- `stepInPlane(pose, target, maxDistance)` requires a finite three-coordinate
  pose and heading, a finite two- or three-coordinate target, and a finite
  nonnegative distance bound. Invalid coordinates throw `TypeError`; invalid
  distance bounds throw `RangeError`. Both inputs remain unchanged.
- The existing result remains `{xy, t, heading}`: `xy` is the next planar
  position, `t` is the interpolation fraction in [0, 1], and `heading` is the
  direction of travel. Reaching the target returns its coordinates exactly.
  With no movement, the previous heading is retained. A stationary subject
  already at the target has `t = 1`; a zero-distance limit elsewhere has `t = 0`.
- Finite endpoints can have an overflowing difference or length. In that
  case, scaled displacement and convex interpolation keep the result finite.
- `nearestCompass` normalizes finite headings modulo 360 before comparison.
  Nonfinite or nonnumeric headings throw `TypeError`.

`WALKING_PACE`, `VEHICLE_PACE`, `parseTarget` and `stepInPlane` remain public
bindings for existing callers. Internally, `maxDistance`, `distanceToTarget`
and `fraction` identify the standard quantities without changing the consumed
wire/result shape. A negative distance limit previously caused backwards
movement; callers supplying invalid world data now receive an explicit error.

## Verification boundaries

The native suite covers admission, signed distances, zero movement, invalid
arguments, overflowing finite endpoints, angular periodicity and 120 bounded
movement combinations. Generated cases bind the exact geometry source hash.
Actual FeltOS movement and Farstone prediction are received separately.
Passing geometry does not establish federation, the entire host dependency
closure, a new package release or a deployed game.
