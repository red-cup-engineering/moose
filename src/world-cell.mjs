/**
 * The Node World family uses the exact original SignCell instance selected by
 * its SignCraft history owner. Equal package versions or a sibling's facade
 * cannot share Cell admission or retained-byte custody across module copies.
 * Resolve only the original suppliers' public package exports; no Cell or
 * content-address operation is implemented or wrapped here. Portable Fetch
 * and geometry entry points do not import this Node binding.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { retainHistoryCell } from "@red-cup-engineering/signcraft/history";

const fromSigncraft = createRequire(import.meta.resolve("@red-cup-engineering/signcraft/history"));
const Cell = await import(pathToFileURL(fromSigncraft.resolve("@red-cup-engineering/signcell/cell")).href);
const probe = Cell.cell("moose.world-cell", "selects", "signcraft", { for: ["original supplier admission"] });
if (retainHistoryCell(probe) !== probe)
  throw new TypeError("MOOSE World cells require SignCraft's selected original SignCell provider");

export default Cell;
