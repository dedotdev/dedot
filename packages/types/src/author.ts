import { SerdeEnum } from './serde.js';
import { Bytes, Hash } from '@dedot/codecs';

/**
 * RPC Extrinsic or hash
 *
 * Allows to refer to extrinsic either by its raw representation or its hash.
 */
export type ExtrinsicOrHash = SerdeEnum<{
  // The hash of the extrinsic.
  hash: Hash;
  // Raw extrinsic bytes.
  extrinsic: Bytes;
}>;
