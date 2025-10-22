import { assert } from '@dedot/utils';
import { Contract, toEvmAddress } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { Erc20ContractApi } from '../../../../../examples/scripts/inkv6/erc20/index.js';
import { deployInkv6Erc20, devPairs } from '../../utils.js';

describe('inkv6 ERC20 Contract', () => {
  let alicePair = devPairs().alice;
  let bobPair = devPairs().bob;
  let contract: Contract<Erc20ContractApi>;
  const INITIAL_SUPPLY = 1_000_000n * 10n ** 18n;

  beforeEach(async () => {
    contract = await deployInkv6Erc20(alicePair, INITIAL_SUPPLY);
  });

  it('should have correct total supply', async () => {
    const { data: totalSupply } = await contract.query.totalSupply();
    expect(totalSupply).toBe(INITIAL_SUPPLY);
  });

  it('should have correct initial balance for deployer', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const { data: balance } = await contract.query.balanceOf(aliceEvmAddress);
    expect(balance).toBe(INITIAL_SUPPLY);
  });

  it('should access balances from root storage', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const root = await contract.storage.root();

    expect(root.totalSupply).toBe(INITIAL_SUPPLY);

    const aliceBalance = await root.balances.get(aliceEvmAddress);
    expect(aliceBalance).toBe(INITIAL_SUPPLY);
  });

  it('should access balances from lazy storage', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const lazy = contract.storage.lazy();

    const aliceBalance = await lazy.balances.get(aliceEvmAddress);
    expect(aliceBalance).toBe(INITIAL_SUPPLY);
  });

  it('should transfer tokens', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transferAmount = 100_000n * 10n ** 18n;

    // Get initial balances
    const { data: aliceBalanceBefore } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalanceBefore } = await contract.query.balanceOf(bobEvmAddress);

    // Transfer
    const result = await contract.tx.transfer(bobEvmAddress, transferAmount).signAndSend(alicePair).untilFinalized();

    // Verify Transfer event
    const transferEvent = contract.events.Transfer.find(result.events);
    assert(transferEvent, 'Transfer event should be emitted');
    expect(transferEvent.data.from).toBe(aliceEvmAddress);
    expect(transferEvent.data.to).toBe(bobEvmAddress);
    expect(transferEvent.data.value).toBe(transferAmount);

    // Verify balances changed
    const { data: aliceBalanceAfter } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalanceAfter } = await contract.query.balanceOf(bobEvmAddress);

    expect(aliceBalanceAfter).toBe(aliceBalanceBefore - transferAmount);
    expect(bobBalanceAfter).toBe(bobBalanceBefore + transferAmount);
  });

  it('should approve and check allowance', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const approveAmount = 50_000n * 10n ** 18n;

    // Initial allowance should be 0
    const { data: initialAllowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(initialAllowance).toBe(0n);

    // Approve
    const result = await contract.tx.approve(bobEvmAddress, approveAmount).signAndSend(alicePair).untilFinalized();

    // Verify Approval event
    const approvalEvent = contract.events.Approval.find(result.events);
    assert(approvalEvent, 'Approval event should be emitted');
    expect(approvalEvent.data.owner).toBe(aliceEvmAddress);
    expect(approvalEvent.data.spender).toBe(bobEvmAddress);
    expect(approvalEvent.data.value).toBe(approveAmount);

    // Check allowance
    const { data: newAllowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(newAllowance).toBe(approveAmount);
  });

  it('should handle insufficient balance error', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const excessiveAmount = INITIAL_SUPPLY + 1000n * 10n ** 18n;

    // Dry-run should detect error
    const dryRunResult = await contract.query.transfer(bobEvmAddress, excessiveAmount, {
      caller: alicePair.address,
    });

    expect(dryRunResult.data.isErr).toBe(true);
  });

  it('should handle insufficient allowance error', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Try transferFrom without approval
    const dryRunResult = await contract.query.transferFrom(aliceEvmAddress, bobEvmAddress, 1000n, {
      caller: bobPair.address,
    });

    expect(dryRunResult.data.isErr).toBe(true);
  });

  it('should verify storage consistency', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transferAmount = 100_000n * 10n ** 18n;

    // Transfer some tokens
    await contract.tx.transfer(bobEvmAddress, transferAmount).signAndSend(alicePair).untilFinalized();

    // Get balances from all sources
    const { data: queryAlice } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: queryBob } = await contract.query.balanceOf(bobEvmAddress);

    const root = await contract.storage.root();
    const rootAlice = await root.balances.get(aliceEvmAddress);
    const rootBob = await root.balances.get(bobEvmAddress);

    const lazy = contract.storage.lazy();
    const lazyAlice = await lazy.balances.get(aliceEvmAddress);
    const lazyBob = await lazy.balances.get(bobEvmAddress);

    // All sources should match
    expect(rootAlice).toBe(queryAlice);
    expect(lazyAlice).toBe(queryAlice);
    expect(rootBob).toBe(queryBob);
    expect(lazyBob).toBe(queryBob);

    // Total supply should be conserved
    const { data: totalSupply } = await contract.query.totalSupply();
    expect(queryAlice! + queryBob!).toBe(totalSupply);
  });
});
