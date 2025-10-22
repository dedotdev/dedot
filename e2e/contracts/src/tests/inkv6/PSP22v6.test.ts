import { assert } from '@dedot/utils';
import { Contract, toEvmAddress } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { Psp22v6ContractApi } from '../../../../../examples/scripts/inkv6/psp22v6/index.js';
import { deployInkv6Psp22, devPairs } from '../../utils.js';

describe('inkv6 PSP22v6 Contract', () => {
  let alicePair = devPairs().alice;
  let bobPair = devPairs().bob;
  let contract: Contract<Psp22v6ContractApi>;
  const TOTAL_SUPPLY = 1_000_000_000_000n;

  beforeEach(async () => {
    contract = await deployInkv6Psp22(alicePair, TOTAL_SUPPLY);
  });

  it('should have correct initial metadata', async () => {
    const root = await contract.storage.root();

    expect(root.data.totalSupply).toBe(TOTAL_SUPPLY);
    expect(root.name).toBe('Storage Test Token');
    expect(root.symbol).toBe('STT');
    expect(root.decimals).toBe(9);
  });

  it('should have correct initial balance for deployer', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const { data: balance } = await contract.query.psp22BalanceOf(aliceEvmAddress);
    expect(balance).toBe(TOTAL_SUPPLY);
  });

  it('should access balances from root storage', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const root = await contract.storage.root();

    expect(root.data.totalSupply).toBe(TOTAL_SUPPLY);

    const aliceBalance = await root.data.balances.get(aliceEvmAddress);
    expect(aliceBalance).toBe(TOTAL_SUPPLY);
  });

  it('should access balances from lazy storage', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const lazy = contract.storage.lazy();

    const aliceBalance = await lazy.data.balances.get(aliceEvmAddress);
    expect(aliceBalance).toBe(TOTAL_SUPPLY);
  });

  it('should transfer tokens', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transferAmount = 100_000_000_000n;

    // Get initial balances
    const { data: aliceBalanceBefore } = await contract.query.psp22BalanceOf(aliceEvmAddress);
    const { data: bobBalanceBefore } = await contract.query.psp22BalanceOf(bobEvmAddress);

    // Transfer
    const result = await contract.tx
      .psp22Transfer(bobEvmAddress, transferAmount, new Uint8Array())
      .signAndSend(alicePair)
      .untilFinalized();

    // Verify Transfer event
    const transferEvent = contract.events.Transfer.find(result.events);
    assert(transferEvent, 'Transfer event should be emitted');
    expect(transferEvent.data.from).toBeDefined();
    expect(transferEvent.data.to).toBeDefined();
    expect(transferEvent.data.value).toBe(transferAmount);

    // Verify balances changed
    const { data: aliceBalanceAfter } = await contract.query.psp22BalanceOf(aliceEvmAddress);
    const { data: bobBalanceAfter } = await contract.query.psp22BalanceOf(bobEvmAddress);

    expect(aliceBalanceAfter).toBe(aliceBalanceBefore - transferAmount);
    expect(bobBalanceAfter).toBe(bobBalanceBefore + transferAmount);
  });

  it('should approve and check allowance', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const allowanceAmount = 50_000_000_000n;

    // Initial allowance should be 0
    const { data: initialAllowance } = await contract.query.psp22Allowance(aliceEvmAddress, bobEvmAddress);
    expect(initialAllowance).toBe(0n);

    // Approve
    const result = await contract.tx
      .psp22Approve(bobEvmAddress, allowanceAmount)
      .signAndSend(alicePair)
      .untilFinalized();

    // Verify Approval event
    const approvalEvent = contract.events.Approval.find(result.events);
    assert(approvalEvent, 'Approval event should be emitted');
    expect(approvalEvent.data.amount).toBe(allowanceAmount);

    // Check allowance
    const { data: newAllowance } = await contract.query.psp22Allowance(aliceEvmAddress, bobEvmAddress);
    expect(newAllowance).toBe(allowanceAmount);
  });

  it('should access allowances from lazy storage', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const allowanceAmount = 50_000_000_000n;

    // Approve
    await contract.tx.psp22Approve(bobEvmAddress, allowanceAmount).signAndSend(alicePair).untilFinalized();

    // Access from lazy storage
    const lazy = contract.storage.lazy();
    const allowance = await lazy.data.allowances.get([aliceEvmAddress, bobEvmAddress]);

    expect(allowance).toBe(allowanceAmount);
  });

  it('should verify storage consistency', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transferAmount = 100_000_000_000n;

    // Transfer some tokens
    await contract.tx
      .psp22Transfer(bobEvmAddress, transferAmount, new Uint8Array())
      .signAndSend(alicePair)
      .untilFinalized();

    // Get balances from all sources
    const { data: queryAlice } = await contract.query.psp22BalanceOf(aliceEvmAddress);
    const { data: queryBob } = await contract.query.psp22BalanceOf(bobEvmAddress);

    const root = await contract.storage.root();
    const rootAlice = await root.data.balances.get(aliceEvmAddress);
    const rootBob = await root.data.balances.get(bobEvmAddress);

    const lazy = contract.storage.lazy();
    const lazyAlice = await lazy.data.balances.get(aliceEvmAddress);
    const lazyBob = await lazy.data.balances.get(bobEvmAddress);

    // All sources should match
    expect(rootAlice).toBe(queryAlice);
    expect(lazyAlice).toBe(queryAlice);
    expect(rootBob).toBe(queryBob);
    expect(lazyBob).toBe(queryBob);

    // Total supply should be conserved
    expect(root.data.totalSupply).toBe(TOTAL_SUPPLY);
  });

  it('should handle multiple transfers and verify storage', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transferAmount1 = 100_000_000_000n;
    const transferAmount2 = 50_000_000_000n;

    // First transfer
    await contract.tx
      .psp22Transfer(bobEvmAddress, transferAmount1, new Uint8Array())
      .signAndSend(alicePair)
      .untilFinalized();

    // Second transfer
    await contract.tx
      .psp22Transfer(bobEvmAddress, transferAmount2, new Uint8Array())
      .signAndSend(alicePair)
      .untilFinalized();

    // Verify final balances
    const { data: aliceBalance } = await contract.query.psp22BalanceOf(aliceEvmAddress);
    const { data: bobBalance } = await contract.query.psp22BalanceOf(bobEvmAddress);

    expect(aliceBalance).toBe(TOTAL_SUPPLY - transferAmount1 - transferAmount2);
    expect(bobBalance).toBe(transferAmount1 + transferAmount2);

    // Verify storage
    const root = await contract.storage.root();
    expect(root.data.totalSupply).toBe(TOTAL_SUPPLY);
  });
});
