import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer, CREATE2, toEthAddress } from 'dedot/contracts';
import { generateRandomHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import { FlipperContractApi } from './flipper/index.js';
import flipper6 from './flipper_v6.json';

// Initialize crypto and keyring
const { alice } = await devPairs();

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Connect to the node
const client = await LegacyClient.new(new WsProvider('ws://127.0.0.1:9944'));

console.log('🚀 Starting Flipper Contract Demonstration with Pallet-Revive');
console.log('='.repeat(60));

// Try to map account first!
await client.tx.revive
  .mapAccount()
  .signAndSend(alice) // --
  .untilFinalized();

// Extract PVM bytecode from metadata
const pvmBytecode = flipper6.source.contract_binary;
const codeHash = flipper6.source.hash;

console.log(`📋 Contract Info:`);
console.log(`   Name: ${flipper6.contract.name}`);
console.log(`   Version: ${flipper6.contract.version}`);
console.log(`   Language: ${flipper6.source.language}`);
console.log(`   Code Hash: ${codeHash}`);

// Common options for contract operations
const defaultOptions = { defaultCaller: alice.address };

// =================================================================
// Step 1: Dry run constructor and deploy contract with full code
// =================================================================
console.log('📝 Step 1: Dry Run Constructor & Deploy Contract');
console.log('-'.repeat(50));

const deployer1 = new ContractDeployer<FlipperContractApi>(client, flipper6, pvmBytecode, defaultOptions);

const salt = generateRandomHex();

// Dry run the constructor to estimate gas and validate deployment
console.log('🔍 Dry running constructor with initial value: true');
const dryRun = await deployer1.query.new(true, { salt });
console.log('dryRun', dryRun);
//
console.log(`   ✅ Dry run successful!`);
console.log(`   📍 Predicted address: ${dryRun.address}`);
//
// Deploy the contract with full code
console.log('🚀 Deploying contract with full PVM bytecode...');

const result = await deployer1.tx
  .new(true, {
    gasLimit: dryRun.raw.gasRequired,
    storageDepositLimit: dryRun.raw.storageDeposit.value,
    salt,
  })
  .signAndSend(alice, ({ status }) => {
    console.log(`   📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (result.dispatchError) {
  console.log(`   ❌ Contract deployed failed!`, client.registry.findErrorMeta(result.dispatchError));
} else {
  console.log(`   ✅ Contract deployed successfully!`);
}

// =================================================================
// Step 2: Redeploy contract using code hash
// =================================================================
console.log('📝 Step 2: Redeploy Contract with Code Hash');
console.log('-'.repeat(50));

// Create new deployer using code hash instead of full bytecode
const deployer2 = new ContractDeployer<FlipperContractApi>(
  client,
  flipper6,
  codeHash, // Using code hash instead of full bytecode
  defaultOptions,
);

console.log('🚀 Deploying second contract instance using code hash...');
await deployer2.tx
  .new(false, {
    gasLimit: dryRun.raw.gasRequired,
    storageDepositLimit: dryRun.raw.storageDeposit.value,
    salt: generateRandomHex(),
  }) // --
  .signAndSend(alice, ({ status }) => {
    console.log(`   📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();
if (result.dispatchError) {
  console.log(`   ❌ Contract deployed failed!`, client.registry.findErrorMeta(result.dispatchError));
} else {
  console.log(`   ✅ Contract deployed successfully!`);
}

// =================================================================
// Step 3: Get value from flipper contract
// =================================================================
console.log('📝 Step 3: Get Value from Flipper Contract');
console.log('-'.repeat(50));

const contractAddress = CREATE2(
  toEthAddress(alice.address),
  flipper6.source.contract_binary,
  dryRun.raw.inputData,
  salt,
);

// Create contract instance for the first deployed contract
const contract = new Contract<FlipperContractApi>(client, flipper6, contractAddress, defaultOptions);

// Get the current value
console.log('🔍 Reading current value from first contract...');
const getValue1 = await contract.query.get();
console.log(`   📖 Current value: ${getValue1.data}`);

// =================================================================
// Step 4: Dry run and flip the value
// =================================================================
console.log('📝 Step 4: Dry Run and Flip the Value');
console.log('-'.repeat(50));

// Dry run the flip operation
console.log('🔍 Dry running flip operation...');
const flipDryRun = await contract.query.flip();
console.log(`   ✅ Flip dry run successful!`);

// Execute the actual flip
console.log('🔄 Executing flip transaction...');
await contract.tx
  .flip({
    gasLimit: flipDryRun.raw.gasRequired,
    storageDepositLimit: flipDryRun.raw.storageDeposit.value,
  }) // --
  .signAndSend(alice, ({ status }) => {
    console.log(`   📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

// =================================================================
// Step 5: Get value and verify the change
// =================================================================
console.log('📝 Step 5: Verify Value Changed');
console.log('-'.repeat(50));

// Get the new value after flip
console.log('🔍 Reading value after flip...');
const getValueAfterFlip = await contract.query.get();
console.log(`   📖 New value: ${getValueAfterFlip.data}`);

// Verify the change
console.log('✅ Verification Results:');
console.log(`   📊 Original value: ${getValue1.data}`);
console.log(`   📊 New value: ${getValueAfterFlip.data}`);
console.log(`   🔄 Value changed: ${getValue1.data !== getValueAfterFlip.data ? '✅ YES' : '❌ NO'}`);

// =================================================================
// Bonus: Demonstrate flipWithSeed method
// =================================================================
console.log('🎁 Bonus: Demonstrate flipWithSeed method');
console.log('-'.repeat(50));

const seed = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
console.log(`🌱 Using seed: ${seed}`);

// Dry run flipWithSeed
const flipWithSeedDryRun = await contract.query.flipWithSeed(seed);
console.log(`   🔍 Dry run result: ${JSON.stringify(flipWithSeedDryRun.data)}`);

// Execute flipWithSeed if dry run was successful
if (flipWithSeedDryRun.data.isOk) {
  console.log('🔄 Executing flipWithSeed transaction...');
  await contract.tx
    .flipWithSeed(seed, {
      gasLimit: flipWithSeedDryRun.raw.gasRequired,
      storageDepositLimit: flipWithSeedDryRun.raw.storageDeposit.value,
    })
    .signAndSend(alice, ({ status, txHash }) => {
      console.log(`   📊 Transaction status: ${status.type}`);
    })
    .untilFinalized();
  console.log(`   ✅ FlipWithSeed executed successfully!`);

  // Get final value
  const finalValue = await contract.query.get();
  console.log(`   📖 Final value: ${finalValue.data}`);
} else {
  console.log(`   ⚠️  FlipWithSeed dry run failed: ${JSON.stringify(flipWithSeedDryRun.data.err)}`);
}

console.log('🎉 Pallet-Revive demonstration completed successfully!');
console.log('='.repeat(60));

// Clean up
await client.disconnect();
console.log('👋 Disconnected from node');
