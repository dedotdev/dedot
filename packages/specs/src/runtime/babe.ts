import * as $ from '@dedot/shape';
import { RuntimeApiMethodsSpec, RuntimeApiSpec } from '@dedot/types';
import {
  $AccountId32,
  $BabeConfiguration,
  $BabeConfigurationV1,
  $BabeEpoch,
  $BabeEquivocationProof,
  $OpaqueKeyOwnershipProof,
  $Slot,
} from '@dedot/codecs';

const V1_V2_SHARED: RuntimeApiMethodsSpec = {
  currentEpoch: {
    docs: 'Returns information regarding the current epoch.',
    params: [],
    type: 'BabeEpoch',
    codec: $BabeEpoch,
  },

  currentEpochStart: {
    docs: 'Returns the slot that started the current epoch.',
    params: [],
    type: 'Slot',
    codec: $Slot,
  },

  nextEpoch: {
    docs: 'Returns information regarding the next epoch (which was already previously announced).',
    params: [],
    type: 'BabeEpoch',
    codec: $BabeEpoch,
  },

  generateKeyOwnershipProof: {
    docs: [
      'Generates a proof of key ownership for the given authority in the',
      'current epoch. An example usage of this module is coupled with the',
      'session historical module to prove that a given authority key is',
      'tied to a given staking identity during a specific session. Proofs',
      'of key ownership are necessary for submitting equivocation reports.',
      'NOTE: even though the API takes a `slot` as parameter the current',
      'implementations ignores this parameter and instead relies on this',
      'method being called at the correct block height, i.e. any point at',
      'which the epoch for the given slot is live on-chain. Future',
      'implementations will instead use indexed data through an offchain',
      'worker, not requiring older states to be available.',
    ],
    params: [
      {
        name: 'slot',
        type: 'Slot',
        codec: $Slot,
      },
      {
        name: 'authorityId',
        type: 'AccountId32',
        codec: $AccountId32,
      },
    ],
    type: 'Option<OpaqueKeyOwnershipProof>',
    codec: $.Option($OpaqueKeyOwnershipProof),
  },

  submitReportEquivocationUnsignedExtrinsic: {
    docs: [
      'Submits an unsigned extrinsic to report an equivocation. The caller',
      'must provide the equivocation proof and a key ownership proof',
      '(should be obtained using `generate_key_ownership_proof`). The',
      'extrinsic will be unsigned and should only be accepted for local',
      'authorship (not to be broadcast to the network). This method returns',
      '`None` when creation of the extrinsic fails, e.g. if equivocation',
      'reporting is disabled for the given runtime (i.e. this method is',
      'hardcoded to return `None`). Only useful in an offchain context.',
    ],
    params: [
      {
        name: 'equivocationProof',
        type: 'BabeEquivocationProof',
        codec: $BabeEquivocationProof,
      },
      {
        name: 'keyOwnerProof',
        type: 'OpaqueKeyOwnershipProof',
        codec: $OpaqueKeyOwnershipProof,
      },
    ],
    type: 'Option<[]>',
    codec: $.Option($.Tuple()),
  },
};

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/1f023deab8d021c5bab08731e13aa12590ed4026/substrate/primitives/consensus/babe/src/lib.rs#L377-L427
 */
export const BabeApi: RuntimeApiSpec[] = [
  {
    methods: {
      configuration: {
        docs: 'Return the configuration for BABE.',
        params: [],
        type: 'BabeConfiguration',
        codec: $BabeConfiguration,
      },
      ...V1_V2_SHARED,
    },
    version: 2,
  },
  {
    methods: {
      configuration: {
        docs: 'Return the configuration for BABE. Version 1.',
        params: [],
        type: 'BabeConfigurationV1',
        codec: $BabeConfigurationV1,
      },
      ...V1_V2_SHARED,
    },
    version: 1,
  },
];
