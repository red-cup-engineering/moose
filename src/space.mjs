// space — FeltOS's spatial site: places with extent, subjects with poses, movement the tick settles.
//
// A place may carry a `region` (a union of convex prisms, geometry.mjs) and a subject a `pose`.
// `located-in` stays the one containment fact; in space it is read off the pose: a subject held by
// a region stands at a point of that region, and moves only to a point in the same region or one
// the cover makes adjacent (their regions intersect), at most its pace per tick. Movement is a
// command, so the tick admits it against every other proposal and stays the sole writer. Vehicles
// are movable places: a posed subject whose rooms are part of it, steered by its controller; what
// rides in it stands where it stands. A world with no regions has none of this and runs as rooms.
import { COMPASS, VEHICLE_PACE, WALKING_PACE, contactOf, parseTarget, piecesOf, prismContains, prismVolume, stepInPlane } from "./geometry.mjs";
import { defineCapability } from "./capabilities.mjs";
import { place, placeOf, regionOf, regionPlaceOf, regionsOf, value, values, worldPose } from "./world.mjs";

export { VEHICLE_PACE, WALKING_PACE, parseTarget };
const VEHICLE_KINDS = new Set(["vehicle", "ship"]);

/**
 * The region that holds a point. The current region holds while it still contains the point,
 * so a subject on a shared threshold does not flicker between places; otherwise the smallest
 * containing region by body volume, ties by id.
 */
export function regionAt(regions, point, current = null) {
  if (current !== null && regions[current] && piecesOf(regions[current]).some((prism) => prismContains(prism, point))) return current;
  let best = null;
  for (const [id, region] of Object.entries(regions)) {
    if (!piecesOf(region).some((prism) => prismContains(prism, point))) continue;
    const volume = prismVolume(region.body);
    if (best === null || volume < best.volume || (volume === best.volume && id < best.id)) best = { id, volume };
  }
  return best?.id ?? null;
}

/** A target with no height stands on the floor of whichever reachable piece lies under it, at the current height when it can. */
function groundPoint(regions, reachable, [x, y], z) {
  let best = null;
  for (const id of reachable) for (const prism of piecesOf(regions[id])) {
    const standing = Math.min(Math.max(z, prism.z[0]), prism.z[1]);
    if (!prismContains(prism, [x, y, standing])) continue;
    if (best === null || Math.abs(standing - z) < Math.abs(best - z)) best = standing;
  }
  return best === null ? null : [x, y, best];
}

export const isVehicle = (world, subject) => VEHICLE_KINDS.has(value(world, subject, "kind"));
/** Who steers a vehicle: its controller, else its owner. */
export const controllerOf = (world, vehicle) => value(world, vehicle, "controller") ?? value(world, vehicle, "owner");

/** The vehicle a subject rides in, through containment, if any. */
export function vehicleOf(world, subject) {
  const seen = new Set([subject]);
  let current = placeOf(world, subject) ?? value(world, subject, "part-of");
  while (typeof current === "string" && !seen.has(current)) {
    if (isVehicle(world, current)) return current;
    if (regionOf(world, current) !== null) return null;
    seen.add(current);
    current = placeOf(world, current) ?? value(world, current, "part-of");
  }
  return null;
}

/** Whether a mover may enter a region: vehicles keep to the tags they traverse, walkers stay off open water. */
function admits(world, mover, place) {
  const tags = values(world, place, "tag");
  const traverses = values(world, mover, "traverses");
  if (traverses.length === 0 && value(world, mover, "kind") === "ship") return tags.includes("ocean") || tags.includes("dock");
  if (traverses.length > 0) return traverses.some((tag) => tags.includes(tag));
  return !tags.includes("ocean");
}

/**
 * Move a posed subject toward a target, at most its pace. The result is the next world, or a
 * refusal: the subject has no place in space, the step leaves the cover, crosses more than one
 * threshold at once, or enters a region the mover cannot.
 */
export function stepToward(world, subject, target, { pace, source = "feltos.space.move" } = {}) {
  const from = regionPlaceOf(world, subject), pose = value(world, subject, "pose");
  if (from === null || placeOf(world, subject) !== from || pose === null) return { refused: "You have no footing in space here." };
  const regions = regionsOf(world);
  const z0 = pose.position[2];
  const limit = Number.isFinite(value(world, subject, "pace")) ? value(world, subject, "pace") : pace;
  const { xy, t, heading } = stepInPlane(pose, target, limit);
  const reachable = Object.keys(regions).filter((id) => id === from || contactOf(regions[from], regions[id]) !== null);
  const point = target[2] === undefined
    ? groundPoint(regions, reachable, xy, z0)
    : [xy[0], xy[1], z0 + (target[2] - z0) * t];
  const into = point === null ? null : regionAt(regions, point, from);
  if (into === null) return { refused: "There is nowhere to stand that way." };
  if (!reachable.includes(into)) return { refused: "That is more than one threshold away; go there by stages." };
  if (!admits(world, subject, into)) return { refused: isVehicle(world, subject) ? "This vehicle cannot go there." : "The open water is no place to walk. Board a vessel to travel there." };
  return { world: place(world, subject, into, { position: point, heading }, { source }), into, arrived: t === 1 };
}

const describe = (world, subject) => String(value(world, subject, "name") ?? subject);

/** Spatial movement as commands: walk (on foot), drive (a vehicle the actor controls), face. */
export const spaceCapability = defineCapability({
  id: "feltos.space",
  commands: {
    walk(ctx) {
      const pose = worldPose(ctx.world, ctx.actor);
      if (pose === null || vehicleOf(ctx.world, ctx.actor) !== null) return { events: [ctx.message(ctx.actor, "You cannot walk from here.")] };
      const target = parseTarget(ctx.argument, pose);
      if (target === null) return { events: [ctx.message(ctx.actor, "Walk <x> <y> [z], or walk <direction> <metres>.")] };
      const moved = stepToward(ctx.world, ctx.actor, target, { pace: WALKING_PACE, source: "feltos.space.walk" });
      if (moved.refused) return { events: [ctx.message(ctx.actor, moved.refused)] };
      return { world: moved.world, events: [ctx.message(ctx.actor, `You walk${moved.arrived ? "" : " on"}; you are in ${describe(moved.world, moved.into)}.`)] };
    },
    drive(ctx) {
      const vehicle = vehicleOf(ctx.world, ctx.actor);
      if (vehicle === null) return { events: [ctx.message(ctx.actor, "You are not aboard anything you could steer.")] };
      if (controllerOf(ctx.world, vehicle) !== ctx.actor) return { events: [ctx.message(ctx.actor, `You do not have the controls of ${describe(ctx.world, vehicle)}.`)] };
      const pose = worldPose(ctx.world, vehicle);
      const target = pose === null ? null : parseTarget(ctx.argument, pose);
      if (target === null) return { events: [ctx.message(ctx.actor, "Drive <x> <y>, or drive <direction> <metres>.")] };
      const moved = stepToward(ctx.world, vehicle, target, { pace: VEHICLE_PACE, source: "feltos.space.drive" });
      if (moved.refused) return { events: [ctx.message(ctx.actor, moved.refused)] };
      return { world: moved.world, events: [ctx.message(ctx.actor, `${describe(moved.world, vehicle)} moves; it is in ${describe(moved.world, moved.into)}.`)] };
    },
    face(ctx) {
      const pose = value(ctx.world, ctx.actor, "pose");
      const heading = ctx.argument.toLowerCase() in COMPASS ? COMPASS[ctx.argument.toLowerCase()] : Number(ctx.argument);
      if (pose === null || !Number.isFinite(heading) || placeOf(ctx.world, ctx.actor) === null) return { events: [ctx.message(ctx.actor, "Face <degrees> or face <direction>.")] };
      return { world: place(ctx.world, ctx.actor, placeOf(ctx.world, ctx.actor), { position: pose.position, heading: ((heading % 360) + 360) % 360 }, { source: "feltos.space.face" }) };
    },
  },
});
