import * as $ from '@dedot/shape';
import { RuntimeApiSpec } from '@dedot/types';
import {
  $AccountId32,
  $SetId,
  $OpaqueKeyOwnershipProof,
  $AuthorityList,
  $GrandpaEquivocationProof,
} from '@dedot/codecs';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/ebcf0a0f1cab2d43718ba96d26e5687f4d14580a/substrate/primitives/consensus/grandpa/src/lib.rs#L483-L535
 */
export const GrandpaApi: RuntimeApiSpec[] = [
  {
    methods: {
      currentSetId: {
        docs: 'Get current GRANDPA authority set id.',
        params: [],
        type: 'SetId',
        codec: $SetId,
      },
      generateKeyOwnershipProof: {
        docs: [
          'Get the current GRANDPA authorities and weights. This should not change except',
          'for when changes are scheduled and the corresponding delay has passed.',
          '\n',
          'When called at block B, it will return the set of authorities that should be',
          'used to finalize descendants of this block (B+1, B+2, ...). The block B itself',
          'is finalized by the authorities from block B-1.',
        ],
        params: [
          {
            name: 'setId',
            type: 'SetId',
            codec: $SetId,
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
      grandpaAuthorities: {
        docs: [
          'Generates a proof of key ownership for the given authority in the',
          'given set. An example usage of this module is coupled with the',
          'session historical module to prove that a given authority key is',
          'tied to a given staking identity during a specific session. Proofs',
          'of key ownership are necessary for submitting equivocation reports.',
          'NOTE: even though the API takes a `set_id` as parameter the current',
          'implementations ignore this parameter and instead rely on this',
          'method being called at the correct block height, i.e. any point at',
          'which the given set id is live on-chain. Future implementations will',
          'instead use indexed data through an offchain worker, not requiring',
          'older states to be available.',
        ],
        params: [],
        type: 'AuthorityList',
        codec: $AuthorityList,
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
          'hardcoded to return `None`). Only useful in an offchain context.  ',
        ],
        params: [
          {
            name: 'equivocationProof',
            type: 'GrandpaEquivocationProof',
            codec: $GrandpaEquivocationProof,
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
    },
    version: 3,
  },
];
