import { Contract, toEvmAddress } from 'dedot/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { Erc20ContractApi } from '../../../../../examples/scripts/sol/erc20/index.js';
import { deploySolErc20, devPairs } from '../../utils.js';

describe('sol ERC20 Contract', () => {
  let alicePair = devPairs().alice;
  let bobPair = devPairs().bob;
  let contract: Contract<Erc20ContractApi>;
  const INITIAL_SUPPLY = 1000000n;

  beforeEach(async () => {
    contract = await deploySolErc20(alicePair, INITIAL_SUPPLY);
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

  it('should transfer tokens', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transferAmount = 10000n;

    // Get initial balances
    const { data: aliceBalanceBefore } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalanceBefore } = await contract.query.balanceOf(bobEvmAddress);

    // Transfer
    await contract.tx.transfer(bobEvmAddress, transferAmount).signAndSend(alicePair).untilFinalized();

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

    // Initial allowance should be 0
    const { data: initialAllowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(initialAllowance).toBe(0n);

    // Approve
    await contract.tx.approve(bobEvmAddress, approvalAmount).signAndSend(alicePair).untilFinalized();

    // Check allowance
    const { data: newAllowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(newAllowance).toBe(approvalAmount);
  });

  it('should transferFrom with allowance', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const approvalAmount = 50000n;
    const transferAmount = 20000n;

    // Approve Bob to spend Alice's tokens
    await contract.tx.approve(bobEvmAddress, approvalAmount).signAndSend(alicePair).untilFinalized();

    // Get initial balances
    const { data: aliceBalanceBefore } = await contract.query.balanceOf(aliceEvmAddress);

    // Bob transfers from Alice to himself
    await contract.tx.transferFrom(aliceEvmAddress, bobEvmAddress, transferAmount).signAndSend(bobPair).untilFinalized();

    // Verify balances and allowance changed
    const { data: aliceBalanceAfter } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalanceAfter } = await contract.query.balanceOf(bobEvmAddress);
    const { data: remainingAllowance } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);

    expect(aliceBalanceAfter).toBe(aliceBalanceBefore - transferAmount);
    expect(bobBalanceAfter).toBe(transferAmount);
    expect(remainingAllowance).toBe(approvalAmount - transferAmount);
  });

  it('should handle multiple transfers', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const transfer1 = 10000n;
    const transfer2 = 5000n;
    const transfer3 = 3000n;

    // Multiple transfers
    await contract.tx.transfer(bobEvmAddress, transfer1).signAndSend(alicePair).untilFinalized();
    await contract.tx.transfer(bobEvmAddress, transfer2).signAndSend(alicePair).untilFinalized();
    await contract.tx.transfer(bobEvmAddress, transfer3).signAndSend(alicePair).untilFinalized();

    // Verify final balances
    const { data: aliceBalance } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalance } = await contract.query.balanceOf(bobEvmAddress);

    expect(aliceBalance).toBe(INITIAL_SUPPLY - transfer1 - transfer2 - transfer3);
    expect(bobBalance).toBe(transfer1 + transfer2 + transfer3);
  });

  it('should conserve total supply', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Transfer some tokens
    await contract.tx.transfer(bobEvmAddress, 100000n).signAndSend(alicePair).untilFinalized();

    // Get final balances
    const { data: aliceBalance } = await contract.query.balanceOf(aliceEvmAddress);
    const { data: bobBalance } = await contract.query.balanceOf(bobEvmAddress);
    const { data: totalSupply } = await contract.query.totalSupply();

    // Sum of balances should equal total supply
    expect(aliceBalance + bobBalance).toBe(totalSupply);
    expect(totalSupply).toBe(INITIAL_SUPPLY);
  });

  it('should update allowance correctly', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);
    const approval1 = 10000n;
    const approval2 = 20000n;

    // First approval
    await contract.tx.approve(bobEvmAddress, approval1).signAndSend(alicePair).untilFinalized();
    const { data: allowance1 } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(allowance1).toBe(approval1);

    // Second approval (overwrites first)
    await contract.tx.approve(bobEvmAddress, approval2).signAndSend(alicePair).untilFinalized();
    const { data: allowance2 } = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
    expect(allowance2).toBe(approval2);
  });

  it('should handle zero transfers', async () => {
    const aliceEvmAddress = toEvmAddress(alicePair.address);
    const bobEvmAddress = toEvmAddress(bobPair.address);

    // Get initial balance
    const { data: initialBalance } = await contract.query.balanceOf(aliceEvmAddress);

    // Transfer zero tokens
    await contract.tx.transfer(bobEvmAddress, 0n).signAndSend(alicePair).untilFinalized();

    // Balance should remain unchanged
    const { data: finalBalance } = await contract.query.balanceOf(aliceEvmAddress);
    expect(finalBalance).toBe(initialBalance);
  });
});
