import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { ContractDeployer, toEvmAddress } from 'dedot/contracts';
import { devPairs } from '../keyring.js';
import { psp22 } from './abi.js';
import { Psp22ContractApi } from './psp22/index.js';

await cryptoWaitReady();
const { alice, bob, charlie } = await devPairs();
const client = await LegacyClient.new(new WsProvider('ws://localhost:9944'));

const [code, abi] = psp22();

// Map accounts for Revive
console.log('='.repeat(60));
console.log('🔧 Mapping accounts for Revive...');
console.log('='.repeat(60));
await client.tx.revive.mapAccount().signAndSend(alice).untilFinalized();
await client.tx.revive.mapAccount().signAndSend(bob).untilFinalized();
await client.tx.revive.mapAccount().signAndSend(charlie).untilFinalized();
console.log('✅ Accounts mapped successfully');

// Deploy the contract
const deployer = new ContractDeployer<Psp22ContractApi>(client, abi, code, { defaultCaller: alice.address });

console.log('\n' + '='.repeat(60));
console.log('🚀 Deploying PSP22 Token Contract...');
console.log('='.repeat(60));

const initialSupply = 1000000000n;
const deployerResult = await deployer.tx
  .initialize(initialSupply, [true, 'Test Coin'], [true, 'TC'], 5)
  .signAndSend(alice)
  .untilFinalized();

const contractAddress = await deployerResult.contractAddress();
console.log('✅ Contract deployed at address:', contractAddress);

const contract = await deployerResult.contract();

// Query token metadata
console.log('\n' + '='.repeat(60));
console.log('📊 Token Metadata');
console.log('='.repeat(60));

const { data: tokenName } = await contract.query.tokenName();
console.log('Token Name:', tokenName);

const { data: tokenSymbol } = await contract.query.tokenSymbol();
console.log('Token Symbol:', tokenSymbol);

const { data: tokenDecimals } = await contract.query.tokenDecimals();
console.log('Token Decimals:', tokenDecimals);

const { data: totalSupply } = await contract.query.totalSupply();
console.log('Total Supply:', totalSupply.toString());

// Check initial balances
console.log('\n' + '='.repeat(60));
console.log('💰 Initial Balances');
console.log('='.repeat(60));

const { data: aliceBalance } = await contract.query.balanceOf(toEvmAddress(alice.address));
console.log('Alice balance:', aliceBalance.toString());

const { data: bobBalance } = await contract.query.balanceOf(toEvmAddress(bob.address));
console.log('Bob balance:', bobBalance.toString());

const { data: charlieBalance } = await contract.query.balanceOf(toEvmAddress(charlie.address));
console.log('Charlie balance:', charlieBalance.toString());

// Transfer tokens from Alice to Bob
console.log('\n' + '='.repeat(60));
console.log('💸 Transfer Operations');
console.log('='.repeat(60));

const transferAmount = 10000n;
console.log(`\nTransferring ${transferAmount} tokens from Alice to Bob...`);

const transferResult = await contract.tx
  .transfer(toEvmAddress(bob.address), transferAmount, [])
  .signAndSend(alice)
  .untilFinalized();

const transferEvents = contract.events.Transfer.filter(transferResult.events);
console.log('Transfer events:', transferEvents);

// Check balances after transfer
const { data: aliceBalanceAfter } = await contract.query.balanceOf(toEvmAddress(alice.address));
const { data: bobBalanceAfter } = await contract.query.balanceOf(toEvmAddress(bob.address));
console.log('\nBalances after transfer:');
console.log('Alice:', aliceBalanceAfter.toString());
console.log('Bob:', bobBalanceAfter.toString());

// Approval and transferFrom operations
console.log('\n' + '='.repeat(60));
console.log('🔐 Approval & TransferFrom Operations');
console.log('='.repeat(60));

const approvalAmount = 50000n;
console.log(`\nAlice approving Bob to spend ${approvalAmount} tokens...`);

await contract.tx.approve(toEvmAddress(bob.address), approvalAmount).signAndSend(alice).untilFinalized();

const { data: allowance } = await contract.query.allowance(toEvmAddress(alice.address), toEvmAddress(bob.address));
console.log("Bob's allowance from Alice:", allowance.toString());

// Bob transfers from Alice to Charlie using allowance
const transferFromAmount = 20000n;
console.log(`\nBob transferring ${transferFromAmount} tokens from Alice to Charlie...`);

await contract.tx
  .transferFrom(toEvmAddress(alice.address), toEvmAddress(charlie.address), transferFromAmount, [])
  .signAndSend(bob)
  .untilFinalized();

// Check balances and allowance after transferFrom
const { data: aliceBalanceAfter2 } = await contract.query.balanceOf(toEvmAddress(alice.address));
const { data: charlieBalanceAfter } = await contract.query.balanceOf(toEvmAddress(charlie.address));
const { data: allowanceAfter } = await contract.query.allowance(toEvmAddress(alice.address), toEvmAddress(bob.address));

console.log('\nBalances after transferFrom:');
console.log('Alice:', aliceBalanceAfter2.toString());
console.log('Charlie:', charlieBalanceAfter.toString());
console.log('Remaining allowance:', allowanceAfter.toString());

// Increase and decrease allowance
console.log('\n' + '='.repeat(60));
console.log('📈 Increase/Decrease Allowance');
console.log('='.repeat(60));

const increaseAmount = 10000n;
console.log(`\nIncreasing Bob's allowance by ${increaseAmount}...`);
await contract.tx.increaseAllowance(toEvmAddress(bob.address), increaseAmount).signAndSend(alice).untilFinalized();

const { data: increasedAllowance } = await contract.query.allowance(
  toEvmAddress(alice.address),
  toEvmAddress(bob.address),
);
console.log('Allowance after increase:', increasedAllowance.toString());

const decreaseAmount = 5000n;
console.log(`\nDecreasing Bob's allowance by ${decreaseAmount}...`);
await contract.tx.decreaseAllowance(toEvmAddress(bob.address), decreaseAmount).signAndSend(alice).untilFinalized();

const { data: decreasedAllowance } = await contract.query.allowance(
  toEvmAddress(alice.address),
  toEvmAddress(bob.address),
);
console.log('Allowance after decrease:', decreasedAllowance.toString());

// Error cases
console.log('\n' + '='.repeat(60));
console.log('❌ Error Cases (Expected to Fail)');
console.log('='.repeat(60));

// Error case 1: Transfer more than balance
console.log('\n1. Attempting to transfer more than balance...');
try {
  const excessiveAmount = initialSupply * 2n; // More than total supply
  const result = await contract.query.transfer(toEvmAddress(bob.address), excessiveAmount, [], {
    caller: alice.address,
  });
  console.log('   Result:', result);
  if (result.raw.result.isOk && !result.flags.revert) {
    console.log('   ⚠️ Unexpectedly succeeded (should have failed)');
  } else {
    console.log('   ✅ Failed as expected - Result:', result.raw.result, 'Flags:', result.flags);
  }
} catch (error: any) {
  console.log('   ✅ Error caught:', error.message || error);
}

// Error case 2: TransferFrom without approval
console.log('\n2. Attempting transferFrom without approval...');
try {
  // Charlie trying to transfer from Alice without approval
  const result = await contract.query.transferFrom(toEvmAddress(alice.address), toEvmAddress(bob.address), 1000n, [], {
    caller: charlie.address,
  });
  console.log('   Result:', result);
  if (result.raw.result.isOk && !result.flags.revert) {
    console.log('   ⚠️ Unexpectedly succeeded (should have failed)');
  } else {
    console.log('   ✅ Failed as expected - Result:', result.raw.result, 'Flags:', result.flags);
  }
} catch (error: any) {
  console.log('   ✅ Error caught:', error.message || error);
}

// Error case 3: TransferFrom exceeding allowance
console.log('\n4. Attempting transferFrom exceeding allowance...');
try {
  const currentAllowance = await contract.query.allowance(toEvmAddress(alice.address), toEvmAddress(bob.address));
  const excessiveAmount = currentAllowance.data + 10000n;
  const result = await contract.query.transferFrom(
    toEvmAddress(alice.address),
    toEvmAddress(charlie.address),
    excessiveAmount,
    [],
    {
      caller: bob.address,
    },
  );
  console.log('   Result:', result);
  if (result.raw.result.isOk && !result.flags.revert) {
    console.log('   ⚠️ Unexpectedly succeeded (should have failed)');
  } else {
    console.log('   ✅ Failed as expected - Result:', result.raw.result, 'Flags:', result.flags);
  }
} catch (error: any) {
  console.log('   ✅ Error caught:', error.message || error);
}

// Error case 4: Decrease allowance below zero
console.log('\n5. Attempting to decrease allowance below zero...');
try {
  const currentAllowance = await contract.query.allowance(toEvmAddress(alice.address), toEvmAddress(bob.address));
  const excessiveDecrease = currentAllowance.data + 10000n;
  const result = await contract.query.decreaseAllowance(toEvmAddress(bob.address), excessiveDecrease, {
    caller: alice.address,
  });
  console.log('   Result:', result);
  if (result.raw.result.isOk && !result.flags.revert) {
    console.log('   ⚠️ Unexpectedly succeeded (should have failed)');
  } else {
    console.log('   ✅ Failed as expected - Result:', result.raw.result, 'Flags:', result.flags);
  }
} catch (error: any) {
  console.log('   ✅ Error caught:', error.message || error);
}

// Final balance summary
console.log('\n' + '='.repeat(60));
console.log('📊 Final Balance Summary');
console.log('='.repeat(60));

const { data: aliceFinal } = await contract.query.balanceOf(toEvmAddress(alice.address));
const { data: bobFinal } = await contract.query.balanceOf(toEvmAddress(bob.address));
const { data: charlieFinal } = await contract.query.balanceOf(toEvmAddress(charlie.address));

console.log('Alice:', aliceFinal.toString());
console.log('Bob:', bobFinal.toString());
console.log('Charlie:', charlieFinal.toString());
console.log('Total:', (aliceFinal + bobFinal + charlieFinal).toString());
console.log('Expected Total Supply:', totalSupply.toString());

// Verify total supply is conserved
const totalBalance = aliceFinal + bobFinal + charlieFinal;
if (totalBalance === totalSupply) {
  console.log('✅ Total supply is conserved!');
} else {
  console.log('⚠️ Total supply mismatch!');
}

console.log('\n' + '='.repeat(60));
console.log('✨ All operations completed!');
console.log('='.repeat(60));

await client.disconnect();
