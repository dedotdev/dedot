import { AnyShape } from '@dedot/shape';
import {
  $ApplyExtrinsicResult,
  $Header,
  $Metadata,
  $SignedBlock,
  $TransactionStatus,
  $VersionedFinalityProof,
} from '@dedot/codecs';

export const scaleResponses: Record<string, AnyShape> = {
  system_dryRun: $ApplyExtrinsicResult,
  state_getMetadata: $Metadata,
  chain_getHeader: $Header,
  chain_getBlock: $SignedBlock,
  chain_subscribeAllHeads: $Header,
  chain_subscribeNewHeads: $Header,
  chain_subscribeFinalizedHeads: $Header,
  author_submitAndWatchExtrinsic: $TransactionStatus,
  beefy_subscribeJustifications: $VersionedFinalityProof,
};
