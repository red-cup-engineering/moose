/**
 * Small reusable inhabited-world forms for QwzSpace's native 3D scene graph.
 * Geometry only: a temple, court, grove or glass-sponge has NO ERP authority.
 * Calling applications place these projections beside separately owned world state.
 */
import { box, cone, cylinder, disc, octahedron, segments, sphere, transformed } from "@red-cup-engineering/qwzspace/geometry";

const shift = ([x, y, z]) => Float32Array.of(
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1,
);
const moved = (mesh, xyz) => transformed(mesh, shift(xyz));
const piece = (mesh, colour, extra = {}) => ({ mesh, colour, ...extra });
const pillar = (x, y, height, radius = .11) =>
  piece(moved(cylinder(radius, height, 8), [x, y, height / 2]), 0xb8cecb);
const pond = (x, y, z, r, colour = 0x42b9cb) =>
  piece(moved(disc(r, 16), [x, y, z]), colour, { opacity: .76, depthWrite: false, lit: false });

function temple() {
  const pieces = [
    piece(box([3.8, 3.2, .35], [0, 0, .18]), 0x4c6270),
    piece(box([3.25, 2.8, .3], [0, 0, 2.38]), 0x184350),
    piece(box([4, 3.4, .19], [0, 0, 2.58]), 0x5ed1c2),
    piece(box([3.35, 2.7, .17], [0, 0, 2.78]), 0x193d63),
    piece(moved(cone(1.5, 1.35, 4, Math.PI / 4), [0, 0, 3.37]), 0x5aa7b8),
    piece(box([2.6, .3, .3], [0, -1.65, .12]), 0x9aa99e),
  ];
  for (const x of [-1.32, 1.32]) for (const y of [-1.05, 1.05]) pieces.push(pillar(x, y, 2.28));
  pieces.push(piece(moved(octahedron(.32), [0, 0, 4.2]), 0xc6f7e3, { lit: false }));
  return pieces;
}

function court() {
  const pieces = [
    piece(box([4.5, 3.7, .2], [0, 0, .1]), 0x6b8385),
    piece(box([4.3, 3.3, .22], [0, 0, 2.48]), 0xd7bc89),
    piece(box([3.85, 2.85, .12], [0, 0, 2.69]), 0x375965),
    piece(box([2, 1.2, .5], [0, .55, .52]), 0x6a5864),
  ];
  for (const x of [-1.65, -.55, .55, 1.65]) {
    pieces.push(pillar(x, -1.25, 2.4, .10), pillar(x, 1.25, 2.4, .10));
  }
  for (const y of [-.15, .4, .95]) pieces.push(piece(box([.95, .14, .13], [0, y, .82]), 0xb9a586));
  return pieces;
}

function grove() {
  const pieces = [
    piece(moved(disc(2.8, 16), [0, 0, .06]), 0x234d42, { opacity: .65, depthWrite: false }),
  ];
  for (const [x, y, h, green] of [
    [-1.3, -.6, 2.5, 0x3b947e], [1.1, -.85, 2.8, 0x367a68], [.2, 1.3, 3.2, 0x61a38a],
  ]) {
    pieces.push(piece(moved(cylinder(.16, h * .73, 7), [x, y, h * .365]), 0x554b46));
    pieces.push(piece(moved(cone(.78, h * .65, 9), [x, y, h * .72]), green));
    pieces.push(piece(moved(cone(.57, h * .54, 9), [x, y, h * .98]), green));
  }
  return pieces;
}

function watercourse() {
  const pieces = [];
  for (const [x, y, width] of [[-.75, -1.4, 1.2], [.3, -.45, 1.3], [-.25, .55, 1.0], [.55, 1.45, 1.1]]) {
    pieces.push(piece(box([width, 1.23, .055], [x, y, .075]), 0x177a97, { opacity: .76, depthWrite: false, lit: false }));
    pieces.push(piece(box([width * .45, .07, .065], [x - width * .1, y + .27, .11]), 0xb4f1de, { lit: false }));
  }
  for (const [x, y] of [[-1.65, 0], [1.7, .9], [1.5, -1.3]]) {
    pieces.push(piece(moved(cone(.27, 1.35, 7), [x, y, .82]), 0x447c67));
  }
  return pieces;
}

function glassSponge() {
  const pairs = [], sides = 8, levels = 6, radius = 1.04;
  const point = (s, z) => {
    const a = 2 * Math.PI * (s / sides + (z % 2) / (2 * sides));
    const r = radius * (1 - .13 * Math.abs(z - (levels - 1) / 2));
    return [r * Math.cos(a), r * Math.sin(a), .25 + z * .48];
  };
  for (let z = 0; z < levels; z++) for (let s = 0; s < sides; s++) {
    pairs.push([point(s, z), point((s + 1) % sides, z)]);
    if (z < levels - 1) {
      pairs.push([point(s, z), point(s, z + 1)]);
      pairs.push([point(s, z), point((s + 1) % sides, z + 1)]);
    }
  }
  return [
    piece(moved(sphere(1.25, 16, 8), [0, 0, 1.54]), 0x6cb9cb, { opacity: .13, depthWrite: false }),
    piece(segments(pairs), 0xc2fcf1, { mode: "lines", lit: false, depthWrite: false }),
    piece(moved(octahedron(.42), [0, 0, 1.45]), 0xaad2f9, { lit: false }),
    pond(0, 0, .04, 1.32, 0x397a9d),
  ];
}

/**
 * A physical note or work inscription in the same native 3D scene as the
 * player. The content lives on the world subject's SignCells; this is only
 * its addressed, pickable geometry, reused by games and enterprise worlds.
 */
function inscription() {
  return [
    piece(box([.85, .14, .95], [0, 0, .62]), 0x42535c),
    piece(box([.73, .035, .78], [0, -.09, .64]), 0xd8d0aa),
    piece(box([.9, .26, .13], [0, 0, .15]), 0x827c6b),
    ...[-.24, -.1, .04, .18].map((z, i) =>
      piece(box([i === 3 ? .37 : .52, .02, .025], [i === 3 ? -.07 : 0, -.118, .65 + z]), 0x445b62)),
    piece(moved(octahedron(.10), [0, -.13, 1.05]), 0xa9e0db, { lit: false }),
  ];
}

function seafoam() {
  const pieces = [pond(0, 0, .07, 2.25)];
  for (const [x, y, z, r] of [
    [-1.1, -.7, .42, .47], [-.25, -1.25, .47, .38],
    [1.0, -.5, .65, .58], [.7, .88, .45, .32],
    [-.8, .8, .59, .49], [0, 0, .98, .66],
  ]) pieces.push(piece(moved(sphere(r, 10, 7), [x, y, z]), 0x8ad8e2,
    { opacity: .56, depthWrite: false, lit: false }));
  return pieces;
}

function abyssalCurrent() {
  const pieces = [
    pond(0, 0, .07, 2.5, 0x0e507e),
    piece(moved(cone(.7, 2.8, 9), [0, 0, 1.48]), 0x233b64),
    piece(moved(octahedron(.43), [0, 0, 3.05]), 0x75b8e5, { lit: false }),
  ];
  const spiral = [];
  for (let i = 0; i < 48; i++) {
    const angle = i * Math.PI / 7, next = (i + 1) * Math.PI / 7;
    const p = (a, height) => [Math.cos(a) * (.85 + height * .2), Math.sin(a) * (.85 + height * .2), .4 + height * 2.9];
    spiral.push([p(angle, i / 48), p(next, (i + 1) / 48)]);
  }
  pieces.push(piece(segments(spiral), 0xa0e9e7, { mode: "lines", lit: false, depthWrite: false }));
  return pieces;
}

/** Reusable, explicitly named scene objects. Callers supply site/scale but no authority. */
export const HABITAT_DRAWABLES = Object.freeze({
  "temple": temple,
  "court": court,
  "grove": grove,
  "watercourse": watercourse,
  "glass-sponge": glassSponge,
  "seafoam": seafoam,
  "abyssal-current": abyssalCurrent,
  // A model organism is a readable scene object, never a real-world agent.
  "inscription": inscription,
  "semiotic-cell": () => [
    { mesh: moved(sphere(.42, 10, 7), [0, 0, .44]), opacity: .63, depthWrite: false },
    piece(moved(octahedron(.17), [0, 0, .44]), 0xf6dcb3, { lit: false }),
  ],
});

/** Bounds of the actual local mesh positions, including every translated part.
 * Hand-maintained approximations drift when a shape changes: the temple's
 * steps, for example, extend below the former zero-height picking floor.
 * Scan each factory once at module initialization, never during frame/pick.
 * Factories retain their existing fresh-mesh behavior for calling renderers.
 */
function drawableBounds(kind, build) {
  const lower = [Infinity, Infinity, Infinity], upper = [-Infinity, -Infinity, -Infinity];
  let vertices = 0;
  for (const { mesh } of build()) {
    const positions = mesh.positions;
    if (!positions.length || positions.length % 3 !== 0)
      throw new TypeError(`habitat drawable ${kind} requires nonempty position triples`);
    for (let index = 0; index < positions.length; index++) {
      const value = positions[index], axis = index % 3;
      if (!Number.isFinite(value))
        throw new TypeError(`habitat drawable ${kind} requires finite mesh positions`);
      lower[axis] = Math.min(lower[axis], value);
      upper[axis] = Math.max(upper[axis], value);
    }
    vertices += positions.length / 3;
  }
  if (!vertices) throw new TypeError(`habitat drawable ${kind} requires visible geometry`);
  return Object.freeze([Object.freeze(lower), Object.freeze(upper)]);
}

export const HABITAT_BOUNDS = Object.freeze(Object.fromEntries(
  Object.entries(HABITAT_DRAWABLES).map(([kind, build]) => [kind, drawableBounds(kind, build)]),
));
