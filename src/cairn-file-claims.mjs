/** Preserve the original CAIRN native population and receipt codec through
 * MOOSE's source-owning layer; this forwarder supplies no source or read grant.
 */
export {
  readCairnFiniteFileClaims, encodeCairnFiniteFileClaims, admitCairnFiniteFileClaims,
} from "@red-cup-engineering/knowledge-system-server/finite-file-claims";
