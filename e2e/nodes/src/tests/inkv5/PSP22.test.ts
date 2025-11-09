import { Contract } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { Psp22ContractApi } from '../../../../../examples/scripts/inkv5/psp22/index.js';
import { deployInkv5Psp22, devPairs } from '../../utils.js';

describe('inkv5 PSP22 Contract', () => {
  let alicePair = devPairs().alice;
  let bobPair = devPairs().bob;
  let contract: Contract<Psp22ContractApi>;
  const TOTAL_SUPPLY = 1000000000000n;

  beforeEach(async () => {
    contract = await deployInkv5Psp22(alicePair, TOTAL_SUPPLY);
  });

  it('should have correct initial metadata', async () => {
    const root = await contract.storage.root();

    expect(root.data.totalSupply).toBe(TOTAL_SUPPLY);
    expect(root.name).toBe('Test Token');
    expect(root.symbol).toBe('TST');
    expect(root.decimals).toBe(18);
  });

  it('should have correct initial balance for deployer', async () => {
    const { data: balance } = await contract.query.psp22BalanceOf(alicePair.address);
    expect(balance).toBe(TOTAL_SUPPLY);
  });

  it('should access balances from lazy storage', async () => {
    const lazy = contract.storage.lazy();
    const aliceBalance = await lazy.data.balances.get(alicePair.address);

    expect(aliceBalance).toBe(TOTAL_SUPPLY);

    // Bob should have no balance initially
    const bobBalance = await lazy.data.balances.get(bobPair.address);
    expect(bobBalance).toBeUndefined();
  });

  it('should transfer tokens', async () => {
    const transferAmount = 100_000_000_000n;

    // Get initial balances
    const { data: aliceBalanceBefore } = await contract.query.psp22BalanceOf(alicePair.address);
    const { data: bobBalanceBefore } = await contract.query.psp22BalanceOf(bobPair.address);

    // Transfer
    const result = await contract.tx
      .psp22Transfer(bobPair.address, transferAmount, '0x')
      .signAndSend(alicePair)
      .untilFinalized();

    expect(result.dispatchError).toBeUndefined();

    // Verify balances changed
    const { data: aliceBalanceAfter } = await contract.query.psp22BalanceOf(alicePair.address);
    const { data: bobBalanceAfter } = await contract.query.psp22BalanceOf(bobPair.address);

    expect(aliceBalanceAfter).toBe(aliceBalanceBefore - transferAmount);
    expect(bobBalanceAfter).toBe(bobBalanceBefore + transferAmount);
  });

  it('should access balances from root storage', async () => {
    const transferAmount = 100_000_000_000n;

    // Transfer some tokens
    await contract.tx
      .psp22Transfer(bobPair.address, transferAmount, '0x')
      .signAndSend(alicePair)
      .untilFinalized();

    // Access from root storage
    const root = await contract.storage.root();
    const aliceBalance = await root.data.balances.get(alicePair.address);
    const bobBalance = await root.data.balances.get(bobPair.address);

    expect(aliceBalance).toBe(TOTAL_SUPPLY - transferAmount);
    expect(bobBalance).toBe(transferAmount);
  });

  it('should verify storage consistency between root and lazy', async () => {
    const transferAmount = 100_000_000_000n;

    // Transfer some tokens
    await contract.tx
      .psp22Transfer(bobPair.address, transferAmount, '0x')
      .signAndSend(alicePair)
      .untilFinalized();

    // Get balances from both storage methods
    const root = await contract.storage.root();
    const lazy = contract.storage.lazy();

    const rootAliceBalance = await root.data.balances.get(alicePair.address);
    const lazyAliceBalance = await lazy.data.balances.get(alicePair.address);

    const rootBobBalance = await root.data.balances.get(bobPair.address);
    const lazyBobBalance = await lazy.data.balances.get(bobPair.address);

    // Root and lazy should match
    expect(rootAliceBalance).toBe(lazyAliceBalance);
    expect(rootBobBalance).toBe(lazyBobBalance);

    // Should also match query results
    const { data: queryAliceBalance } = await contract.query.psp22BalanceOf(alicePair.address);
    const { data: queryBobBalance } = await contract.query.psp22BalanceOf(bobPair.address);

    expect(rootAliceBalance).toBe(queryAliceBalance);
    expect(rootBobBalance).toBe(queryBobBalance);
  });

  it('should handle allowances', async () => {
    const lazy = contract.storage.lazy();

    // Initially no allowance
    const initialAllowance = await lazy.data.allowances.get([alicePair.address, bobPair.address]);
    expect(initialAllowance).toBeUndefined();

    // Set allowance via approve (note: approve method may not be directly available, using query to test storage)
    // For now, just verify the storage structure
    const { data: queryAllowance } = await contract.query.psp22Allowance(alicePair.address, bobPair.address);
    expect(queryAllowance).toBe(0n);
  });
});
