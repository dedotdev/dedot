/**
 * Statistics of a block returned by the `dev_getBlockStats` RPC.
 */
export interface BlockStats {
  // The length in bytes of the storage proof produced by executing the block.
  witnessLen: number;
  // The length in bytes of the storage proof after compaction.
  witnessCompactLen: number;
  // Length of the block in bytes.
  // This information can also be acquired by downloading the whole block. This merely
  // saves some complexity on the client side.
  blockLen: number;
  // Number of extrinsics in the block.
  // This information can also be acquired by downloading the whole block. This merely
  // saves some complexity on the client side.
  numExtrinsics: number;
}
