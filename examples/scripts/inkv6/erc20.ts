import { DedotClient, WsProvider } from 'dedot';
import { ContractDeployer, toEvmAddress } from 'dedot/contracts';
import { assert, generateRandomHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import erc20 from './erc20.json';
import { Erc20ContractApi } from './erc20/index.js';

// Initialize crypto and keyring
const { alice, bob, charlie } = await devPairs();

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Connect to the ink-node
const client = await DedotClient.new(new WsProvider('ws://127.0.0.1:9944'));

console.log('🚀 Starting comprehensive ERC20 contract demonstration');

// Map all accounts to EVM addresses
console.log('📝 Step 0: Map accounts to EVM addresses');
for (const [name, account] of Object.entries({ alice, bob, charlie })) {
  console.log('toEvmAddress(account.address)', account.address, toEvmAddress(account.address));
  const mappedAccount = await client.query.revive.originalAccount(toEvmAddress(account.address));
  if (mappedAccount) {
    console.log(`  ✅ ${name.charAt(0).toUpperCase() + name.slice(1)} address already mapped`);
  } else {
    console.log(`  🔄 Mapping ${name.charAt(0).toUpperCase() + name.slice(1)} address...`);
    await client.tx.revive.mapAccount().signAndSend(account).untilFinalized();
    console.log(`  ✅ ${name.charAt(0).toUpperCase() + name.slice(1)} address mapped successfully`);
  }
}

// Get EVM addresses for all accounts
const aliceEvmAddress = toEvmAddress(alice.address);
const bobEvmAddress = toEvmAddress(bob.address);
const charlieEvmAddress = toEvmAddress(charlie.address);

console.log('\n📋 Account EVM Addresses:');
console.log(`  Alice:   ${aliceEvmAddress}`);
console.log(`  Bob:     ${bobEvmAddress}`);
console.log(`  Charlie: ${charlieEvmAddress}`);

// Extract PVM bytecode from metadata
const pvmBytecode = erc20.source.contract_binary;
const codeHash = erc20.source.hash;

console.log(`\n📋 Contract info:`);
console.log(`  Name:     ${erc20.contract.name}`);
console.log(`  Version:  ${erc20.contract.version}`);
console.log(`  Language: ${erc20.source.language}`);
console.log(`  Code Hash: ${codeHash}`);

// ============================================================================
// STEP 1: Deploy contract with full code
// ============================================================================

console.log('\n📝 Step 1: Deploy contract with full PVM bytecode');

const INITIAL_SUPPLY = 1_000_000n * 10n ** 18n; // 1 million tokens with 18 decimals
const deployer1 = new ContractDeployer<Erc20ContractApi>(client, erc20, pvmBytecode);

console.log(`  🚀 Deploying with initial supply: ${INITIAL_SUPPLY}`);

const txResult = await deployer1.tx
  .new(INITIAL_SUPPLY, { salt: generateRandomHex() })
  .signAndSend(alice, ({ status }) => {
    console.log(`  📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (txResult.dispatchError) {
  console.log(`  ❌ Deployment failed:`, client.registry.findErrorMeta(txResult.dispatchError));
  process.exit(1);
}

const contractAddress1 = await txResult.contractAddress();
console.log(`  ✅ Contract deployed at: ${contractAddress1}`);

const contract = await txResult.contract();

// ============================================================================
// STEP 2: Deploy another instance using code hash
// ============================================================================

console.log('\n📝 Step 2: Deploy another instance using code hash');

const deployer2 = new ContractDeployer<Erc20ContractApi>(client, erc20, codeHash);
const SECOND_SUPPLY = 500_000n * 10n ** 18n;

console.log(`  🚀 Deploying second instance with supply: ${SECOND_SUPPLY}`);

const txResult2 = await deployer2.tx
  .new(SECOND_SUPPLY, { salt: generateRandomHex() })
  .signAndSend(alice, ({ status }) => {
    console.log(`  📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (txResult2.dispatchError) {
  console.log(`  ❌ Deployment failed:`, client.registry.findErrorMeta(txResult2.dispatchError));
  process.exit(1);
}

const contractAddress2 = await txResult2.contractAddress();
console.log(`  ✅ Second contract deployed at: ${contractAddress2}`);
console.log(`  ℹ️  Using first contract (${contractAddress1}) for examples`);

// ============================================================================
// STEP 3: Query operations - Read contract state
// ============================================================================

console.log('\n📝 Step 3: Query operations (read-only calls)');

console.log('  🔍 Query: totalSupply()');
const totalSupply = await contract.query.totalSupply();
console.log(`    Total Supply: ${totalSupply.data}`);

console.log('  🔍 Query: balanceOf(alice)');
const aliceBalance1 = await contract.query.balanceOf(aliceEvmAddress);
console.log(`    Alice balance: ${aliceBalance1.data}`);

console.log('  🔍 Query: balanceOf(bob)');
const bobBalance1 = await contract.query.balanceOf(bobEvmAddress);
console.log(`    Bob balance: ${bobBalance1.data}`);

console.log('  🔍 Query: balanceOf(charlie)');
const charlieBalance1 = await contract.query.balanceOf(charlieEvmAddress);
console.log(`    Charlie balance: ${charlieBalance1.data}`);

console.log('  🔍 Query: allowance(alice, bob)');
const allowance1 = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
console.log(`    Alice → Bob allowance: ${allowance1.data}`);

console.log('  ✅ Verification: Alice should have all tokens');
console.log(`    Expected: ${INITIAL_SUPPLY}`);
console.log(`    Actual:   ${aliceBalance1.data}`);
console.log(`    Match:    ${aliceBalance1.data === INITIAL_SUPPLY ? '✅' : '❌'}`);

// ============================================================================
// STEP 4: Storage access - Direct storage reads
// ============================================================================

console.log('\n📝 Step 4: Storage access (direct reads)');

// Method 1: Root storage - Eager loading (fetches all storage at once)
console.log('  📦 Method 1: Root storage (eager loading)');
const rootStorage = await contract.storage.root();
console.log(`    🔍 Root storage totalSupply: ${rootStorage.totalSupply}`);

// Access balances through root storage
const rootAliceBalance = await rootStorage.balances.get(aliceEvmAddress);
const rootBobBalance = await rootStorage.balances.get(bobEvmAddress);
console.log(`    🔍 Root storage Alice balance: ${rootAliceBalance ?? 0n}`);
console.log(`    🔍 Root storage Bob balance: ${rootBobBalance ?? 0n}`);

// Access allowances through root storage
const rootAllowance = await rootStorage.allowances.get([aliceEvmAddress, bobEvmAddress]);
console.log(`    🔍 Root storage allowance (Alice → Bob): ${rootAllowance ?? 0n}`);

// Method 2: Lazy storage - On-demand loading (fetches only what you need)
console.log('\n  📦 Method 2: Lazy storage (on-demand loading)');
const lazyStorage = contract.storage.lazy();

// Note: Lazy storage only provides access to mappings (balances, allowances)
// Simple fields like totalSupply must be accessed via root storage
console.log('    ℹ️  Lazy storage provides on-demand access to mappings only');

const lazyAliceBalance = await lazyStorage.balances.get(aliceEvmAddress);
const lazyBobBalance = await lazyStorage.balances.get(bobEvmAddress);
console.log(`    🔍 Lazy storage Alice balance: ${lazyAliceBalance ?? 0n}`);
console.log(`    🔍 Lazy storage Bob balance: ${lazyBobBalance ?? 0n}`);

const lazyAllowance = await lazyStorage.allowances.get([aliceEvmAddress, bobEvmAddress]);
console.log(`    🔍 Lazy storage allowance (Alice → Bob): ${lazyAllowance ?? 0n}`);

// Verification: Compare query vs storage methods
console.log('\n  ✅ Verification: Query vs Storage consistency');
console.log(`    TotalSupply (query vs root):`);
console.log(`      Query:  ${totalSupply.data}`);
console.log(`      Root:   ${rootStorage.totalSupply}`);
console.log(`      Match:  ${totalSupply.data === rootStorage.totalSupply ? '✅' : '❌'}`);

console.log(`    Alice balance (query vs root vs lazy):`);
console.log(`      Query:  ${aliceBalance1.data}`);
console.log(`      Root:   ${rootAliceBalance ?? 0n}`);
console.log(`      Lazy:   ${lazyAliceBalance ?? 0n}`);
console.log(
  `      Match:  ${aliceBalance1.data === (rootAliceBalance ?? 0n) && aliceBalance1.data === (lazyAliceBalance ?? 0n) ? '✅' : '❌'}`,
);

console.log('\n  ℹ️  Storage access patterns:');
console.log('    • Root storage: Eager loading - fetches all storage including simple fields');
console.log('    • Lazy storage: On-demand loading - only for mappings (balances, allowances)');

// ============================================================================
// STEP 5: Transfer transaction - Send tokens
// ============================================================================

console.log('\n📝 Step 5: Transfer transaction (Alice → Bob)');

const TRANSFER_AMOUNT = 100_000n * 10n ** 18n; // 100k tokens

console.log('  🔍 Dry-run: transfer() query before transaction');
const transferDryRun = await contract.query.transfer(bobEvmAddress, TRANSFER_AMOUNT);
console.log(`    Dry-run result: ${transferDryRun.data.isOk ? '✅ Success' : '❌ Error: ' + transferDryRun.data.err}`);

console.log(`  🔄 Transferring ${TRANSFER_AMOUNT} tokens from Alice to Bob`);
const transferResult = await contract.tx
  .transfer(bobEvmAddress, TRANSFER_AMOUNT)
  .signAndSend(alice, ({ status }) => {
    console.log(`    📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (transferResult.dispatchError) {
  console.log(`  ❌ Transfer failed:`, client.registry.findErrorMeta(transferResult.dispatchError));
} else {
  console.log(`  ✅ Transfer successful`);

  // Find and verify Transfer event
  const transferEvent = contract.events.Transfer.find(transferResult.events);
  assert(transferEvent, 'Transfer event should be emitted');
  console.log(`  🎯 Transfer event:`, {
    from: transferEvent.data.from,
    to: transferEvent.data.to,
    value: transferEvent.data.value.toString(),
  });

  // Verify event data
  console.log(`  ✅ Event verification:`);
  console.log(`    From matches Alice: ${transferEvent.data.from === aliceEvmAddress ? '✅' : '❌'}`);
  console.log(`    To matches Bob: ${transferEvent.data.to === bobEvmAddress ? '✅' : '❌'}`);
  console.log(`    Value matches: ${transferEvent.data.value === TRANSFER_AMOUNT ? '✅' : '❌'}`);

  // Query updated balances
  const aliceBalanceAfter = await contract.query.balanceOf(aliceEvmAddress);
  const bobBalanceAfter = await contract.query.balanceOf(bobEvmAddress);

  console.log(`  📊 Updated balances:`);
  console.log(`    Alice: ${aliceBalance1.data} → ${aliceBalanceAfter.data}`);
  console.log(`    Bob:   ${bobBalance1.data} → ${bobBalanceAfter.data}`);
  console.log(`  ✅ Balance verification:`);
  console.log(
    `    Alice decreased by ${TRANSFER_AMOUNT}: ${aliceBalance1.data - aliceBalanceAfter.data === TRANSFER_AMOUNT ? '✅' : '❌'}`,
  );
  console.log(
    `    Bob increased by ${TRANSFER_AMOUNT}: ${bobBalanceAfter.data - bobBalance1.data === TRANSFER_AMOUNT ? '✅' : '❌'}`,
  );
}

// ============================================================================
// STEP 6: Approve transaction - Set spending allowance
// ============================================================================

console.log('\n📝 Step 6: Approve transaction (Alice approves Bob)');

const APPROVE_AMOUNT = 50_000n * 10n ** 18n; // 50k tokens

console.log('  🔍 Dry-run: approve() query before transaction');
const approveDryRun = await contract.query.approve(bobEvmAddress, APPROVE_AMOUNT);
console.log(`    Dry-run result: ${approveDryRun.data.isOk ? '✅ Success' : '❌ Error: ' + approveDryRun.data.err}`);

console.log(`  🔄 Alice approving Bob to spend ${APPROVE_AMOUNT} tokens`);
const approveResult = await contract.tx
  .approve(bobEvmAddress, APPROVE_AMOUNT)
  .signAndSend(alice, ({ status }) => {
    console.log(`    📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (approveResult.dispatchError) {
  console.log(`  ❌ Approve failed:`, client.registry.findErrorMeta(approveResult.dispatchError));
} else {
  console.log(`  ✅ Approve successful`);

  // Find and verify Approval event
  const approvalEvent = contract.events.Approval.find(approveResult.events);
  assert(approvalEvent, 'Approval event should be emitted');
  console.log(`  🎯 Approval event:`, {
    owner: approvalEvent.data.owner,
    spender: approvalEvent.data.spender,
    value: approvalEvent.data.value.toString(),
  });

  // Verify event data
  console.log(`  ✅ Event verification:`);
  console.log(`    Owner matches Alice: ${approvalEvent.data.owner === aliceEvmAddress ? '✅' : '❌'}`);
  console.log(`    Spender matches Bob: ${approvalEvent.data.spender === bobEvmAddress ? '✅' : '❌'}`);
  console.log(`    Value matches: ${approvalEvent.data.value === APPROVE_AMOUNT ? '✅' : '❌'}`);

  // Query updated allowance
  const allowanceAfter = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
  console.log(`  📊 Updated allowance:`);
  console.log(`    Alice → Bob: ${allowance1.data} → ${allowanceAfter.data}`);
  console.log(`  ✅ Allowance verification: ${allowanceAfter.data === APPROVE_AMOUNT ? '✅' : '❌'}`);

  // Check storage (using lazy storage)
  const storageAllowance = await lazyStorage.allowances.get([aliceEvmAddress, bobEvmAddress]);
  console.log(`  📦 Storage allowance: ${storageAllowance ?? 0n}`);
  console.log(`  ✅ Storage matches query: ${(storageAllowance ?? 0n) === allowanceAfter.data ? '✅' : '❌'}`);
}

// ============================================================================
// STEP 7: TransferFrom transaction - Spend approved tokens
// ============================================================================

console.log("\n📝 Step 7: TransferFrom transaction (Bob spends Alice's approved tokens)");

const TRANSFER_FROM_AMOUNT = 30_000n * 10n ** 18n; // 30k tokens

console.log('  🔍 Dry-run: transferFrom() query before transaction');
const transferFromDryRun = await contract.query.transferFrom(
  aliceEvmAddress,
  charlieEvmAddress,
  TRANSFER_FROM_AMOUNT,
  { caller: bob.address }, // Use Substrate address for caller
);
console.log(
  `    Dry-run result: ${transferFromDryRun.data.isOk ? '✅ Success' : '❌ Error: ' + transferFromDryRun.data.err}`,
);

// Get current balances before transfer
const aliceBalanceBefore = await contract.query.balanceOf(aliceEvmAddress);
const charlieBalanceBefore = await contract.query.balanceOf(charlieEvmAddress);
const allowanceBefore = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);

console.log(`  🔄 Bob transferring ${TRANSFER_FROM_AMOUNT} from Alice to Charlie`);
const transferFromResult = await contract.tx
  .transferFrom(aliceEvmAddress, charlieEvmAddress, TRANSFER_FROM_AMOUNT)
  .signAndSend(bob, ({ status }) => {
    console.log(`    📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (transferFromResult.dispatchError) {
  console.log(`  ❌ TransferFrom failed:`, client.registry.findErrorMeta(transferFromResult.dispatchError));
} else {
  console.log(`  ✅ TransferFrom successful`);

  // Find and verify Transfer event
  const transferEvent = contract.events.Transfer.find(transferFromResult.events);
  assert(transferEvent, 'Transfer event should be emitted');
  console.log(`  🎯 Transfer event:`, {
    from: transferEvent.data.from,
    to: transferEvent.data.to,
    value: transferEvent.data.value.toString(),
  });

  // Verify event data
  console.log(`  ✅ Event verification:`);
  console.log(`    From matches Alice: ${transferEvent.data.from === aliceEvmAddress ? '✅' : '❌'}`);
  console.log(`    To matches Charlie: ${transferEvent.data.to === charlieEvmAddress ? '✅' : '❌'}`);
  console.log(`    Value matches: ${transferEvent.data.value === TRANSFER_FROM_AMOUNT ? '✅' : '❌'}`);

  // Query updated balances
  const aliceBalanceAfter = await contract.query.balanceOf(aliceEvmAddress);
  const charlieBalanceAfter = await contract.query.balanceOf(charlieEvmAddress);
  const allowanceAfter = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);

  console.log(`  📊 Updated balances:`);
  console.log(`    Alice:   ${aliceBalanceBefore.data} → ${aliceBalanceAfter.data}`);
  console.log(`    Charlie: ${charlieBalanceBefore.data} → ${charlieBalanceAfter.data}`);
  console.log(`    Allowance (Alice → Bob): ${allowanceBefore.data} → ${allowanceAfter.data}`);

  console.log(`  ✅ Balance verification:`);
  console.log(
    `    Alice decreased by ${TRANSFER_FROM_AMOUNT}: ${aliceBalanceBefore.data - aliceBalanceAfter.data === TRANSFER_FROM_AMOUNT ? '✅' : '❌'}`,
  );
  console.log(
    `    Charlie increased by ${TRANSFER_FROM_AMOUNT}: ${charlieBalanceAfter.data - charlieBalanceBefore.data === TRANSFER_FROM_AMOUNT ? '✅' : '❌'}`,
  );
  console.log(
    `    Allowance decreased by ${TRANSFER_FROM_AMOUNT}: ${allowanceBefore.data - allowanceAfter.data === TRANSFER_FROM_AMOUNT ? '✅' : '❌'}`,
  );
}

// ============================================================================
// STEP 8: Error handling - InsufficientBalance
// ============================================================================

console.log('\n📝 Step 8: Error handling - InsufficientBalance');

const charlieCurrentBalance = await contract.query.balanceOf(charlieEvmAddress);
const EXCESSIVE_AMOUNT = charlieCurrentBalance.data + 1000n * 10n ** 18n;

console.log(`  🔍 Attempting to transfer more than Charlie's balance`);
console.log(`    Charlie's balance: ${charlieCurrentBalance.data}`);
console.log(`    Attempting to transfer: ${EXCESSIVE_AMOUNT}`);

// First try with dry-run query
const insufficientBalanceDryRun = await contract.query.transfer(bobEvmAddress, EXCESSIVE_AMOUNT, {
  caller: charlie.address, // Use Substrate address for caller
});

if (insufficientBalanceDryRun.data.isErr) {
  console.log(`  ✅ Dry-run correctly detected error: ${insufficientBalanceDryRun.data.err}`);
} else {
  console.log(`  ❌ Dry-run should have detected InsufficientBalance error`);
}

// Actual transaction attempt
const insufficientBalanceResult = await contract.tx
  .transfer(bobEvmAddress, EXCESSIVE_AMOUNT)
  .signAndSend(charlie, ({ status }) => {
    console.log(`    📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (insufficientBalanceResult.dispatchError) {
  console.log(
    `  ⚠️  Transaction failed as expected (dispatch error):`,
    client.registry.findErrorMeta(insufficientBalanceResult.dispatchError),
  );
} else {
  // Check if contract returned error
  const transferEvent = contract.events.Transfer.find(insufficientBalanceResult.events);
  if (!transferEvent) {
    console.log(`  ✅ Contract correctly rejected transfer (no Transfer event emitted)`);
  } else {
    console.log(`  ❌ Transfer should have been rejected due to insufficient balance`);
  }
}

// ============================================================================
// STEP 9: Error handling - InsufficientAllowance
// ============================================================================

console.log('\n📝 Step 9: Error handling - InsufficientAllowance');

const currentAllowance = await contract.query.allowance(aliceEvmAddress, bobEvmAddress);
const EXCESSIVE_ALLOWANCE_AMOUNT = currentAllowance.data + 1000n * 10n ** 18n;

console.log(`  🔍 Attempting to spend more than approved allowance`);
console.log(`    Current allowance (Alice → Bob): ${currentAllowance.data}`);
console.log(`    Attempting to transfer: ${EXCESSIVE_ALLOWANCE_AMOUNT}`);

// First try with dry-run query
const insufficientAllowanceDryRun = await contract.query.transferFrom(
  aliceEvmAddress,
  charlieEvmAddress,
  EXCESSIVE_ALLOWANCE_AMOUNT,
  { caller: bob.address }, // Use Substrate address for caller
);

if (insufficientAllowanceDryRun.data.isErr) {
  console.log(`  ✅ Dry-run correctly detected error: ${insufficientAllowanceDryRun.data.err}`);
} else {
  console.log(`  ❌ Dry-run should have detected InsufficientAllowance error`);
}

// Actual transaction attempt
const insufficientAllowanceResult = await contract.tx
  .transferFrom(aliceEvmAddress, charlieEvmAddress, EXCESSIVE_ALLOWANCE_AMOUNT)
  .signAndSend(bob, ({ status }) => {
    console.log(`    📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (insufficientAllowanceResult.dispatchError) {
  console.log(
    `  ⚠️  Transaction failed as expected (dispatch error):`,
    client.registry.findErrorMeta(insufficientAllowanceResult.dispatchError),
  );
} else {
  // Check if contract returned error
  const transferEvent = contract.events.Transfer.find(insufficientAllowanceResult.events);
  if (!transferEvent) {
    console.log(`  ✅ Contract correctly rejected transfer (no Transfer event emitted)`);
  } else {
    console.log(`  ❌ Transfer should have been rejected due to insufficient allowance`);
  }
}

// ============================================================================
// STEP 10: Final summary
// ============================================================================

console.log('\n📝 Step 10: Final Summary');

const finalAliceBalance = await contract.query.balanceOf(aliceEvmAddress);
const finalBobBalance = await contract.query.balanceOf(bobEvmAddress);
const finalCharlieBalance = await contract.query.balanceOf(charlieEvmAddress);
const finalTotalSupply = await contract.query.totalSupply();

console.log('  📊 Final token distribution:');
console.log(`    Alice:   ${finalAliceBalance.data}`);
console.log(`    Bob:     ${finalBobBalance.data}`);
console.log(`    Charlie: ${finalCharlieBalance.data}`);
console.log(`    Total:   ${finalTotalSupply.data}`);

const sumOfBalances = finalAliceBalance.data + finalBobBalance.data + finalCharlieBalance.data;
console.log(`  ✅ Conservation of tokens: ${sumOfBalances === finalTotalSupply.data ? '✅ PASS' : '❌ FAIL'}`);

console.log('\n  🎯 Demonstrated features:');
console.log('    ✅ Contract deployment (full bytecode & code hash)');
console.log('    ✅ Query operations (totalSupply, balanceOf, allowance)');
console.log('    ✅ Storage access (root storage eager loading & lazy storage on-demand)');
console.log('    ✅ Transfer transaction with event verification');
console.log('    ✅ Approve transaction with event verification');
console.log('    ✅ TransferFrom transaction with event verification');
console.log('    ✅ Dry-run queries before transactions');
console.log('    ✅ Error handling (InsufficientBalance, InsufficientAllowance)');
console.log('    ✅ Multi-account interactions (Alice, Bob, Charlie)');
console.log('    ✅ Consistency verification across query/storage methods');

console.log('\n🎉 Comprehensive ERC20 demonstration completed successfully!');

await client.disconnect();
console.log('👋 Disconnected from node');
