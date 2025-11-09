import { Contract, isSolContractExecutionError, toEvmAddress } from 'dedot/contracts';
import { assert } from 'dedot/utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { Psp22ContractApi } from '../../../../../examples/scripts/sol/psp22/index.js';
import { deploySolPsp22, devPairs } from '../../utils.js';

describe('sol PSP22 Contract', () => {
  let alicePair = devPairs().alice;
  let bobPair = devPairs().bob;
  let charliePair = devPairs().bob; // Using bob as charlie for simplicity
  let contract: Contract<Psp22ContractApi>;
  const INITIAL_SUPPLY = 1000000000n;

  beforeEach(async () => {
    contract = await deploySolPsp22(alicePair, INITIAL_SUPPLY);
  });

  it('should have correct token metadata', async () => {
    const { data: name } = await contract.query.tokenName();
    const { data: symbol } = await contract.query.tokenSymbol();
    const { data: decimals } = await contract.query.tokenDecimals();
    const { data: totalSupply } = await contract.query.totalSupply();

    expect(name[1]).toBe('Test Coin');
    expect(symbol[1]).toBe('TC');
    expect(decimals).toBe(5);
    expect(totalSupply).toBe(INITIAL_SUPPLY);
  });

  it('should have correct initial balance for deployer', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const { data: balance } = await contract.query.balanceOf(aliceEvmAddress);
    expect(balance).toBe(INITIAL_SUPPLY);
  });

  it('should transfer tokens', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transferAmount = 10000n;

    // Get initial balances
    const { data: aliceBalanceBefore } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalanceBefore } = await contract.query.balanceOf(bobEvmAddress);

    // Transfer
    const result = await contract.tx
      .transfer(bobEvmAddress, transferAmount, [])
      .signAndSend(alicePair)
      .untilFinalized();

    // Verify Transfer event
    const transferEvents = contract.events.Transfer.filter(result.events);
    expect(transferEvents.length).toBeGreaterThan(0);

    // Verify balances changed
    const { data: aliceBalanceAfter } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalanceAfter } = await contract.query.balanceOf(bobEvmAddress);

    expect(aliceBalanceAfter).toBe(aliceBalanceBefore - transferAmount);
    expect(bobBalanceAfter).toBe(bobBalanceBefore + transferAmount);
  });

  it('should approve and check allowance', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const approvalAmount = 50000n;

    // Approve
    await contract.tx.approve(bobEvmAddress, approvalAmount).signAndSend(alicePair).untilFinalized();

    // Check allowance
    const { data: allowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(allowance).toBe(approvalAmount);
  });

  it('should transferFrom with allowance', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const charlieEvmAddress = toEvmAddress(charliePair.address);
    const approvalAmount = 50000n;
    const transferFromAmount = 20000n;

    // Approve Bob to spend Alice's tokens
    await contract.tx.approve(bobEvmAddress, approvalAmount).signAndSend(alicePair).untilFinalized();

    // Get initial balances
    const { data: aliceBalanceBefore } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: charlieBalanceBefore } = await contract.query.balanceOf(charlieEvmAddress);

    // Bob transfers from Alice to Charlie
    await contract.tx
      .transferFrom(aliceEvmAddress, charlieEvmAddress, transferFromAmount, [])
      .signAndSend(bobPair)
      .untilFinalized();

    // Verify balances and allowance
    const { data: aliceBalanceAfter } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: charlieBalanceAfter } = await contract.query.balanceOf(charlieEvmAddress);
    const { data: allowanceAfter } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);

    expect(aliceBalanceAfter).toBe(aliceBalanceBefore - transferFromAmount);
    expect(charlieBalanceAfter).toBe(charlieBalanceBefore + transferFromAmount);
    expect(allowanceAfter).toBe(approvalAmount - transferFromAmount);
  });

  it('should increase allowance', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const initialApproval = 10000n;
    const increaseAmount = 5000n;

    // Initial approval
    await contract.tx.approve(bobEvmAddress, initialApproval).signAndSend(alicePair).untilFinalized();

    // Increase allowance
    await contract.tx.increaseAllowance(bobEvmAddress, increaseAmount).signAndSend(alicePair).untilFinalized();

    // Check allowance
    const { data: allowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(allowance).toBe(initialApproval + increaseAmount);
  });

  it('should decrease allowance', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const initialApproval = 10000n;
    const decreaseAmount = 3000n;

    // Initial approval
    await contract.tx.approve(bobEvmAddress, initialApproval).signAndSend(alicePair).untilFinalized();

    // Decrease allowance
    await contract.tx.decreaseAllowance(bobEvmAddress, decreaseAmount).signAndSend(alicePair).untilFinalized();

    // Check allowance
    const { data: allowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(allowance).toBe(initialApproval - decreaseAmount);
  });

  it('should handle insufficient balance error in dry-run', async () => {
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const excessiveAmount = INITIAL_SUPPLY * 2n;

    try {
      await contract.query.transfer(bobEvmAddress, excessiveAmount, [], {
        caller: alicePair.address,
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      assert(isSolContractExecutionError(error), 'Should be a contract execution error');
      expect(error.message).toContain('InsufficientBalance');
    }
  });

  it('should handle insufficient allowance error in dry-run', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);

    try {
      await contract.query.transferFrom(aliceEvmAddress, bobEvmAddress, 1000n, [], {
        caller: charliePair.address,
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      console.error(error);
      assert(isSolContractExecutionError(error), 'Should be a contract execution error');
      expect(error.message).toContain('InsufficientAllowance');
    }
  });

  it('should conserve total supply', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Transfer some tokens
    await contract.tx.transfer(bobEvmAddress, 100000n, []).signAndSend(alicePair).untilFinalized();

    // Get final balances
    const { data: aliceBalance } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalance } = await contract.query.balanceOf(bobEvmAddress);
    const { data: totalSupply } = await contract.query.totalSupply();

    // Sum of balances should equal total supply
    expect(aliceBalance + bobBalance).toBe(totalSupply);
  });
});
