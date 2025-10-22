import { FixedBytes } from 'dedot/codecs';
import { Contract, isSolContractExecutionError, toEvmAddress } from 'dedot/contracts';
import { assert, hexToString, waitFor } from 'dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { BallotContractApi } from '../../../../../examples/scripts/sol/ballot/index.js';
import { deploySolBallot, devPairs } from '../../utils.js';

describe('sol Ballot Contract', () => {
  let alicePair = devPairs().alice;
  let bobPair = devPairs().bob;
  let contract: Contract<BallotContractApi>;

  const proposalNames: FixedBytes<32>[] = [
    '0x50726f706f73616c204100000000000000000000000000000000000000000000', // "Proposal A"
    '0x50726f706f73616c204200000000000000000000000000000000000000000000', // "Proposal B"
    '0x50726f706f73616c204300000000000000000000000000000000000000000000', // "Proposal C"
  ];

  beforeEach(async () => {
    contract = await deploySolBallot(alicePair, proposalNames);
  });

  it('should have correct chairperson', async () => {
    const { data: chairperson } = await contract.query.chairperson();
    expect(chairperson).toBeDefined();
    expect(chairperson.toString().toLowerCase()).toBe(toEvmAddress(alicePair.address).toLowerCase());
  });

  it('should give right to vote', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Give Bob the right to vote
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Check Bob's voter info
    const { data: bobVoterInfo } = await contract.query.voters(bobEvmAddress);
    expect(bobVoterInfo).toBeDefined();
    const [weight, voted, delegate, vote] = bobVoterInfo;

    expect(weight).toBe(1n); // Should have weight of 1
    expect(voted).toBe(false); // Should not have voted yet
  });

  it('should allow voting', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Give Bob the right to vote
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Bob votes for proposal 1
    await contract.tx.vote(1n).signAndSend(bobPair).untilFinalized();

    // Check Bob's voter info after voting
    const { data: bobVoterInfoAfter } = await contract.query.voters(bobEvmAddress);
    const [weight, voted, delegate, vote] = bobVoterInfoAfter;

    expect(voted).toBe(true); // Should have voted
    expect(vote).toBe(1n); // Should have voted for proposal 1
  });

  it('should track proposal vote counts', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Give Bob the right to vote
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Get initial vote count for proposal 1
    const { data: proposalBefore } = await contract.query.proposals(1n);
    const [nameBefore, voteCountBefore] = proposalBefore;

    // Bob votes for proposal 1
    await contract.tx.vote(1n).signAndSend(bobPair).untilFinalized();

    // Get updated vote count for proposal 1
    const { data: proposalAfter } = await contract.query.proposals(1n);
    const [nameAfter, voteCountAfter] = proposalAfter;

    expect(voteCountAfter).toBeGreaterThan(voteCountBefore);
    expect(hexToString(nameAfter).startsWith('Proposal B')).toBe(true);
  });

  it('should determine winning proposal', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Give Bob the right to vote
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Bob votes for proposal 1
    await contract.tx.vote(1n).signAndSend(bobPair).untilFinalized();

    // Get winning proposal
    const { data: winningProposalIndex } = await contract.query.winningProposal();
    expect(winningProposalIndex).toBeDefined();
    expect(winningProposalIndex).toBe(1n);
  });

  it('should get winner name', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Give Bob the right to vote
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Bob votes for proposal 1
    await contract.tx.vote(1n).signAndSend(bobPair).untilFinalized();

    // Get winner name
    const { data: winnerName } = await contract.query.winnerName();
    expect(winnerName).toBeDefined();
    expect(hexToString(winnerName).startsWith('Proposal B')).toBe(true);
  });

  it('should query all proposals', async () => {
    for (let i = 0n; i < 3n; i++) {
      const { data: proposal } = await contract.query.proposals(i);
      const [name, voteCount] = proposal;

      expect(name).toBeDefined();
      expect(voteCount).toBeDefined();
      expect(voteCount).toBeGreaterThanOrEqual(0n);

      // Verify proposal names
      const proposalName = hexToString(name).replace(/\0/g, '').trim();
      if (i === 0n) expect(proposalName).toBe('Proposal A');
      if (i === 1n) expect(proposalName).toBe('Proposal B');
      if (i === 2n) expect(proposalName).toBe('Proposal C');
    }
  });

  it('should handle multiple voters', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Alice (chairperson) can vote without explicit permission
    // Give Bob the right to vote
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Both vote for different proposals
    await contract.tx.vote(0n).signAndSend(alicePair).untilFinalized();

    await contract.tx.vote(1n).signAndSend(bobPair).untilFinalized();

    // Check vote counts for both proposals
    const { data: proposal0 } = await contract.query.proposals(0n);
    const { data: proposal1 } = await contract.query.proposals(1n);

    const [, voteCount0] = proposal0;
    const [, voteCount1] = proposal1;

    expect(voteCount0).toBeGreaterThan(0n);
    expect(voteCount1).toBeGreaterThan(0n);
  });

  it('should reject voting when already voted', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Give Bob the right to vote
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Bob votes for proposal 1
    await contract.tx.vote(1n).signAndSend(bobPair).untilFinalized();

    // Try to vote again
    try {
      await contract.query.vote(0n, { caller: bobPair.address });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      assert(isSolContractExecutionError(error), 'Should be a contract execution error');
      expect(error.message).toBe('Already voted.');
    }
  });

  it('should reject voting without right to vote', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Bob tries to vote without being given the right
    try {
      await contract.query.vote(0n, { caller: bobPair.address });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      assert(isSolContractExecutionError(error), 'Should be a contract execution error');
      expect(error.message).toBe('Has no right to vote');
    }
  });

  it('should reject giveRightToVote from non-chairperson', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Give Bob the right to vote first
    await contract.tx.giveRightToVote(bobEvmAddress).signAndSend(alicePair).untilFinalized();

    // Bob tries to give voting rights to someone else (not chairperson)
    const charlieEvmAddress = toEvmAddress(devPairs().bob.address); // Using bob as charlie

    try {
      await contract.query.giveRightToVote(charlieEvmAddress, { caller: bobPair.address });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      assert(isSolContractExecutionError(error), 'Should be a contract execution error');
      expect(error.message).toBe('Only chairperson can give right to vote.');
    }
  });
});
