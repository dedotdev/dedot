import { assert, u8aToHex } from '@dedot/utils';
import { Contract } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { LazyvecContractApi } from '../../../../../examples/scripts/inkv5/lazyvec/index.js';
import { deployInkv5LazyVec, devPairs } from '../../utils.js';

describe('inkv5 LazyVec Contract', () => {
  let alicePair = devPairs().alice;
  let contract: Contract<LazyvecContractApi>;

  beforeEach(async () => {
    contract = await deployInkv5LazyVec(alicePair);
  });

  it('should have empty proposals initially', async () => {
    const lazy = contract.storage.lazy();
    const length = await lazy.proposals.len();
    expect(length).toBe(0);
  });

  it('should create a proposal', async () => {
    const proposalData = new Uint8Array([1, 2, 3, 4, 5]);
    const duration = 0;
    const minApprovals = 2;

    const result = await contract.tx
      .createProposal(proposalData, duration, minApprovals)
      .signAndSend(alicePair)
      .untilFinalized();

    expect(result.dispatchError).toBeUndefined();

    // Verify proposal was added
    const lazy = contract.storage.lazy();
    const length = await lazy.proposals.len();
    expect(length).toBe(1);
  });

  it('should access proposal from lazy storage', async () => {
    const proposalData = new Uint8Array([1, 2, 3, 4, 5]);
    const duration = 0;
    const minApprovals = 2;

    await contract.tx.createProposal(proposalData, duration, minApprovals).signAndSend(alicePair).untilFinalized();

    const lazy = contract.storage.lazy();
    const proposal = await lazy.proposals.get(0);

    assert(proposal, 'Proposal should exist');
    expect(proposal.data).toEqual(u8aToHex(proposalData));
    expect(proposal.minApprovals).toBe(minApprovals);
  });

  it('should return undefined for non-existent proposal', async () => {
    const lazy = contract.storage.lazy();
    const proposal = await lazy.proposals.get(999);
    expect(proposal).toBeUndefined();
  });
});
