/**
 * World closure uses the original SignCraft implementation with the SAME
 * history owner that CAIRN supplies to World. Equal package versions alone
 * cannot establish private archive, occurrence or read-capture custody.
 *
 * Admission happens when closure is selected. A split installation must not
 * prevent unrelated World reads from loading, copy a history into another
 * provider, or silently discard its private archive binding.
 */
import * as worldHistory from "@red-cup-engineering/knowledge-system-server/history";
import * as settlementHistory from "@red-cup-engineering/signcraft/history";
import { settleHistory as originalSettleHistory } from "@red-cup-engineering/signcraft/settle";

// Replay admission remains the exact original pure function, not a second
// Boolean judgment or an authorization for a World effect.
export { settlementAdmits } from "@red-cup-engineering/signcraft/settle";

function requireOriginalWorldHistory() {
  const names = Object.keys(worldHistory);
  if (names.length !== Object.keys(settlementHistory).length
      || names.some(name => worldHistory[name] !== settlementHistory[name])) {
    throw new TypeError("World settlement requires the same original CAIRN and SignCraft history provider");
  }
}

/**
 * Native SignChain rules close one admitted World reading. SignCraft retains
 * the source valuation, complete rule witnesses and one atomic revision.
 * Functional conclusions and unsupported arguments retain its own refusal.
 */
export function settleHistory(history, rules) {
  requireOriginalWorldHistory();
  return originalSettleHistory(...arguments);
}
