import { SerdeEnum } from './serde';
import { Bytes, Hash } from '@dedot/codecs';
import { registry } from './registry';

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
registry.add('ExtrinsicOrHash');
