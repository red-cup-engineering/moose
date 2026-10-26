// geometry — places as a cover of space by convex prisms, the data FeltOS space reads.
//
// A region is an open set: a union of convex prisms (a counter-clockwise footprint polygon in
// metres, x east and y north, extruded over a z interval, z up). The first prism is the region's
// body; the rest are its reaches (paths, stairs, shafts, doorways) out to the thresholds it shares.
// Two regions are adjacent exactly when they intersect with positive volume, so the adjacency
// graph is the nerve of the cover and each edge carries its threshold (the largest overlap).
// Terrain is a heightfield: float32 samples on a regular grid, read bilinearly.

const AREA_FLOOR = 1e-6;

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

export function polygonArea(polygon) {
  let twice = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i], [x1, y1] = polygon[(i + 1) % polygon.length];
    twice += x0 * y1 - x1 * y0;
  }
  return twice / 2;
}

export function polygonCentroid(polygon) {
  const area = polygonArea(polygon);
  let cx = 0, cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i], [x1, y1] = polygon[(i + 1) % polygon.length];
    const k = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * k;
    cy += (y0 + y1) * k;
  }
  return [cx / (6 * area), cy / (6 * area)];
}

/** The intersection of two convex, counter-clockwise polygons (Sutherland–Hodgman). */
export function clipConvex(subject, clip) {
  let output = subject;
  for (let i = 0; i < clip.length && output.length > 0; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      const pin = cross(a, b, p) > 0, qin = cross(a, b, q) > 0;
      if (pin) output.push(p);
      if (pin !== qin) {
        const dp = cross(a, b, p), dq = cross(a, b, q);
        const t = dp / (dp - dq);
        output.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return output;
}

/** The least width of a convex polygon: its thinnest extent across any edge's normal. */
export function polygonWidth(polygon) {
  let least = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length === 0) continue;
    let far = 0;
    for (const p of polygon) far = Math.max(far, Math.abs(cross(a, b, p)) / length);
    least = Math.min(least, far);
  }
  return least;
}

export const bounds = (polygon) => polygon.reduce(([x0, y0, x1, y1], [x, y]) => [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)], [Infinity, Infinity, -Infinity, -Infinity]);

/** The open intersection of two prisms, or null when it has no volume. */
export function prismOverlap(p, q) {
  const z0 = Math.max(p.z[0], q.z[0]), z1 = Math.min(p.z[1], q.z[1]);
  if (!(z1 > z0)) return null;
  const [ax0, ay0, ax1, ay1] = bounds(p.footprint), [bx0, by0, bx1, by1] = bounds(q.footprint);
  if (ax1 <= bx0 || bx1 <= ax0 || ay1 <= by0 || by1 <= ay0) return null;
  const footprint = clipConvex(p.footprint, q.footprint);
  if (footprint.length < 3) return null;
  const area = polygonArea(footprint);
  if (!(area > AREA_FLOOR)) return null;
  const [cx, cy] = polygonCentroid(footprint);
  return { footprint, area, volume: area * (z1 - z0), centroid: [cx, cy, (z0 + z1) / 2], z: [z0, z1], thickness: z1 - z0, width: polygonWidth(footprint) };
}

export const piecesOf = (region) => [region.body, ...(region.reaches ?? [])];

/** The axis-aligned box [x0, y0, z0, x1, y1, z1] around every piece of a region. */
export function regionBounds(region) {
  return piecesOf(region).reduce(([x0, y0, z0, x1, y1, z1], prism) => {
    const [px0, py0, px1, py1] = bounds(prism.footprint);
    return [Math.min(x0, px0), Math.min(y0, py0), Math.min(z0, prism.z[0]), Math.max(x1, px1), Math.max(y1, py1), Math.max(z1, prism.z[1])];
  }, [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
}

/** The least distance from a point to a box; zero within it. */
export const boxDistance = ([x, y, z], [x0, y0, z0, x1, y1, z1]) =>
  Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1), Math.max(z0 - z, 0, z - z1));

export const prismVolume = (prism) => polygonArea(prism.footprint) * (prism.z[1] - prism.z[0]);

export function bodyCentroid(region) {
  const [x, y] = polygonCentroid(region.body.footprint);
  return [x, y, (region.body.z[0] + region.body.z[1]) / 2];
}

/** The largest shared threshold of two regions, or null when they are disjoint. */
export function contactOf(a, b) {
  let best = null;
  for (const p of piecesOf(a)) for (const q of piecesOf(b)) {
    const overlap = prismOverlap(p, q);
    if (overlap && (!best || overlap.volume > best.volume)) best = overlap;
  }
  return best;
}

/** Whether a prism holds a point; the footprint is closed so a threshold's face belongs to both sides. */
export const prismContains = (prism, [x, y, z]) =>
  z >= prism.z[0] && z <= prism.z[1]
  && prism.footprint.every((a, i) => cross(a, prism.footprint[(i + 1) % prism.footprint.length], [x, y]) >= 0);

export const regionContains = (region, point) => piecesOf(region).some((prism) => prismContains(prism, point));

export const prismWithin = (inner, outer) =>
  inner.z[0] >= outer.z[0] && inner.z[1] <= outer.z[1]
  && inner.footprint.every((p) => outer.footprint.every((a, i) => cross(a, outer.footprint[(i + 1) % outer.footprint.length], p) >= 0));

/**
 * The parameter interval [t0, t1] ⊆ [0, 1] of the segment from `p` to `q` inside a convex prism
 * (Cyrus–Beck), or null when the segment misses it.
 */
export function segmentThroughPrism(prism, p, q) {
  let t0 = 0, t1 = 1;
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const clip = (denominator, numerator) => {
    // Inside means numerator + t·denominator >= 0.
    if (denominator === 0) return numerator >= 0;
    const t = -numerator / denominator;
    if (denominator > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    return t0 <= t1;
  };
  if (!clip(d[2], p[2] - prism.z[0]) || !clip(-d[2], prism.z[1] - p[2])) return null;
  const f = prism.footprint;
  for (let i = 0; i < f.length; i++) {
    const a = f[i], b = f[(i + 1) % f.length];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    if (!clip(ex * d[1] - ey * d[0], cross(a, b, p))) return null;
  }
  return [t0, t1];
}

export function bearing(from, to) {
  return (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180 / Math.PI + 360) % 360;
}

export const distance = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1], (q[2] ?? 0) - (p[2] ?? 0));

/** The nerve of a cover ({id: region}): every pair of regions that intersect, with its threshold. */
export function nerve(regions) {
  const ids = Object.keys(regions).sort();
  const boxes = new Map(ids.map((id) => {
    const all = piecesOf(regions[id]);
    const [x0, y0, x1, y1] = bounds(all.flatMap((piece) => piece.footprint));
    return [id, [x0, y0, x1, y1, Math.min(...all.map((piece) => piece.z[0])), Math.max(...all.map((piece) => piece.z[1]))]];
  }));
  const edges = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const p = boxes.get(ids[i]), q = boxes.get(ids[j]);
    if (p[2] <= q[0] || q[2] <= p[0] || p[3] <= q[1] || q[3] <= p[1] || p[5] <= q[4] || q[5] <= p[4]) continue;
    const contact = contactOf(regions[ids[i]], regions[ids[j]]);
    if (contact) edges.push({ a: ids[i], b: ids[j], contact });
  }
  return edges;
}

/** Decode a heightfield's samples: float32 little-endian, row-major, south row first, west column first. */
export function decodeHeightfield(bytes, layout) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = layout.columns * layout.rows;
  if (bytes.byteLength !== count * 4) throw new Error(`heightfield: ${bytes.byteLength} bytes is not ${layout.columns}×${layout.rows} float32`);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i++) samples[i] = view.getFloat32(i * 4, true);
  return samples;
}

/** Bilinear height at point (x, y). */
export function heightAt(samples, layout, x, y) {
  const fx = (x - layout.origin[0]) / layout.spacing, fy = (y - layout.origin[1]) / layout.spacing;
  const i = Math.max(0, Math.min(layout.columns - 2, Math.floor(fx))), j = Math.max(0, Math.min(layout.rows - 2, Math.floor(fy)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fy - j));
  const at = (c, r) => samples[r * layout.columns + c];
  return (1 - v) * ((1 - u) * at(i, j) + u * at(i + 1, j)) + v * ((1 - u) * at(i, j + 1) + u * at(i + 1, j + 1));
}

export const COMPASS = Object.freeze({ north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: 225, west: 270, northwest: 315 });

export function nearestCompass(degrees) {
  let best = null;
  for (const [name, at] of Object.entries(COMPASS)) {
    const off = Math.abs(((degrees - at + 540) % 360) - 180);
    if (!best || off < best.off) best = { name, off };
  }
  return best.name;
}

// Motion in the plane: the rule a step obeys before any place is asked whether it may be taken. It
// needs no world, so a client predicting a step reads the same rule the tick settles it by.

/** How far a walker and a vehicle may go in one tick, in metres, unless the mover has a pace of its own. */
export const WALKING_PACE = 6;
export const VEHICLE_PACE = 20;

/** Parse "x y [z]" in metres, or "<compass point> <metres>" relative to a pose. */
export function parseTarget(argument, pose) {
  const words = argument.trim().toLowerCase().split(/\s+/u);
  if (words[0] in COMPASS && words.length === 2 && Number.isFinite(Number(words[1]))) {
    const radians = COMPASS[words[0]] * Math.PI / 180, metres = Number(words[1]);
    return [pose.position[0] + Math.sin(radians) * metres, pose.position[1] + Math.cos(radians) * metres];
  }
  const numbers = words.map(Number);
  if ((numbers.length === 2 || numbers.length === 3) && numbers.every(Number.isFinite)) return numbers;
  return null;
}

/** One step from a pose toward a target, at most `pace` metres across the plane: the point reached
 *  in the plane, the fraction `t` of the way taken, and the heading along the step (the pose's own
 *  when the target is where it stands). */
export function stepInPlane(pose, target, pace) {
  const [x0, y0] = pose.position;
  const span = Math.hypot(target[0] - x0, target[1] - y0);
  const t = span <= pace ? 1 : pace / span;
  return { xy: [x0 + (target[0] - x0) * t, y0 + (target[1] - y0) * t], t, heading: span === 0 ? pose.heading : bearing(pose.position, target) };
}
