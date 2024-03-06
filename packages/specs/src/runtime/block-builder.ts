import * as $ from '@dedot/shape';
import { RuntimeApiSpec } from '@dedot/types';
import {
  $ApplyExtrinsicResult,
  $Block,
  $CheckInherentsResult,
  $Header,
  $InherentData,
  $OpaqueExtrinsic,
} from '@dedot/codecs';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/bc53b9a03a742f8b658806a01a7bf853cb9a86cd/substrate/primitives/block-builder/src/lib.rs#L25-L52
 */
export const BlockBuilder: RuntimeApiSpec[] = [
  {
    methods: {
      // Type changed in v6
      applyExtrinsic: {
        description: 'Apply the given extrinsic.',
        params: [
          {
            name: 'extrinsic',
            type: 'OpaqueExtrinsic',
            codec: $OpaqueExtrinsic,
          },
        ],
        type: 'ApplyExtrinsicResult',
        codec: $ApplyExtrinsicResult,
      },
      checkInherents: {
        description: 'Check that the inherents are valid.',
        params: [
          {
            name: 'block',
            type: 'Block',
            codec: $Block,
          },
          {
            name: 'data',
            type: 'InherentData',
            codec: $InherentData,
          },
        ],
        type: 'CheckInherentsResult',
        codec: $CheckInherentsResult,
      },
      inherentExtrinsics: {
        description: 'Generate inherent extrinsics.',
        params: [
          {
            name: 'inherent',
            type: 'InherentData',
            codec: $InherentData,
          },
        ],
        type: 'Array<OpaqueExtrinsic>',
        codec: $.Array($OpaqueExtrinsic),
      },
      // Renamed in v3 from finalise_block
      finalizeBlock: {
        description: 'Finish the current block.',
        params: [],
        type: 'Header',
        codec: $Header,
      },
    },
    version: 6,
  },
];
