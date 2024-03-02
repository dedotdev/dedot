import { RuntimeApiSpec } from '@dedot/types';

/**
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/0e49ed72aa365475e30069a5c30e251a009fdacf/substrate/primitives/merkle-mountain-range/src/lib.rs#L423-L426
 */
export const MmrApi: RuntimeApiSpec[] = [
  {
    methods: {
      mmrRoot: {
        docs: 'Return the on-chain MMR root hash.',
        params: [],
        type: 'Result<Hash, MmrError>',
      },
      mmrLeafCount: {
        docs: 'Return the number of MMR blocks in the chain.',
        params: [],
        type: 'Result<LeafIndex, MmrError>',
      },
      generateProof: {
        docs: [
          'Generate MMR proof for a series of block numbers. If `best_known_block_number = Some(n)`,',
          'use historical MMR state at given block height `n`. Else, use current MMR state.',
        ],
        params: [
          {
            name: 'blockNumbers',
            type: 'Array<BlockNumber>',
          },
          {
            name: 'bestKnownBlockNumber',
            type: 'Option<BlockNumber>',
          },
        ],
        type: 'Result<GeneratedMmrProofResult, MmrError>',
      },
      verifyProof: {
        docs: [
          'Verify MMR proof against on-chain MMR for a batch of leaves.',
          '\n',
          'Note this function will use on-chain MMR root hash and check if the proof matches the hash.',
          'Note, the leaves should be sorted such that corresponding leaves and leaf indices have the',
          'same position in both the `leaves` vector and the `leaf_indices` vector contained in the [Proof]',
        ],
        params: [
          {
            name: 'leaves',
            type: 'Array<MmrEncodableOpaqueLeaf>',
          },
          {
            name: 'proof',
            type: 'MmrBatchProof',
          },
        ],
        type: 'Result<[], MmrError>',
      },
      verifyProofStateless: {
        docs: [
          'Verify MMR proof against given root hash for a batch of leaves.',
          '\n',
          'Note this function does not require any on-chain storage - the',
          'proof is verified against given MMR root hash.',
          '\n',
          'Note, the leaves should be sorted such that corresponding leaves and leaf indices have the',
          'same position in both the `leaves` vector and the `leaf_indices` vector contained in the [Proof]',
        ],
        params: [
          {
            name: 'root',
            type: 'Hash',
          },
          {
            name: 'leaves',
            type: 'Array<MmrEncodableOpaqueLeaf>',
          },
          {
            name: 'proof',
            type: 'MmrBatchProof',
          },
        ],
        type: 'Result<[], MmrError>',
      },
    },
    version: 2,
  },
];
