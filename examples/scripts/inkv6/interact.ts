import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer, create2, toEthAddress } from 'dedot/contracts';
import { FlipperContractApi } from './flipper/index.js';
import flipper6 from './flipper_v6.json' with { type: 'json' };
import { devPairs } from "../keyring.js";

// Initialize crypto and keyring
const {alice} = await devPairs()

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Connect to the node
const client = await LegacyClient.new(new WsProvider('ws://127.0.0.1:9944'));

console.log('🚀 Starting Flipper Contract Demonstration with Pallet-Revive');
console.log('='.repeat(60));

// Try to map account first!
await client.tx.revive.mapAccount()
  .signAndSend(alice) // --
  .untilFinalized()

// Extract PVM bytecode from metadata
const pvmBytecode = flipper6.source.contract_binary;
const codeHash = flipper6.source.hash;

console.log(`📋 Contract Info:`);
console.log(`   Name: ${flipper6.contract.name}`);
console.log(`   Version: ${flipper6.contract.version}`);
console.log(`   Language: ${flipper6.source.language}`);
console.log(`   Code Hash: ${codeHash}`);
console.log();

// Common options for contract operations
const defaultOptions = {defaultCaller: alice.address};

export const genRanHex: (size?: number) => `0x${string}` = (size = 32) =>
  `0x${[...Array<string>(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;


try {
  // =================================================================
  // Step 1: Dry run constructor and deploy contract with full code
  // =================================================================
  console.log('📝 Step 1: Dry Run Constructor & Deploy Contract');
  console.log('-'.repeat(50));

  const deployer1 = new ContractDeployer<FlipperContractApi>(
    client,
    flipper6 as any,
    pvmBytecode,
    defaultOptions,
  );

  const salt = genRanHex(64);

  // Dry run the constructor to estimate gas and validate deployment
  console.log('🔍 Dry running constructor with initial value: true');
  const dryRunResult = await deployer1.query.new(true, {salt});
  console.log('dryRunResult', dryRunResult)
  //
  console.log(`   ✅ Dry run successful!`);
  console.log(`   📊 Gas consumed: ${dryRunResult.raw.gasConsumed.refTime.toLocaleString()}`);
  console.log(`   💰 Storage deposit: ${JSON.stringify(dryRunResult.raw.storageDeposit)}`);
  console.log(`   📍 Predicted address: ${dryRunResult.address}`);
  console.log();
  //
  // Deploy the contract with full code
  console.log('🚀 Deploying contract with full PVM bytecode...');

  await deployer1.tx.new(true, {gasLimit: dryRunResult.raw.gasRequired, salt}) // --
    .signAndSend(alice, ({status}) => {
      console.log(`   📊 Transaction status: ${status.type}`);
    })
    .untilFinalized();

  console.log(`   ✅ Contract deployed successfully!`);
  console.log();

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
  await deployer2.tx.new(false, {gasLimit: dryRunResult.raw.gasRequired, salt: genRanHex(64)}) // --
    .signAndSend(alice, ({status}) => {
      console.log(`   📊 Transaction status: ${status.type}`);
    })
    .untilFinalized();
  console.log(`   ✅ Contract redeployed successfully!`);

  // =================================================================
  // Step 3: Get value from flipper contract
  // =================================================================
  console.log('📝 Step 3: Get Value from Flipper Contract');
  console.log('-'.repeat(50));

  const contract1Address = '0x454b9F63b034a12Ec26264E15B159Fb2f8Bc7E6e';
  // const contract1Address = '0x5169b3F29419768fB3ABd17Fee227d82498DF7Ea';

  // Create contract instance for the first deployed contract
  const contract1 = new Contract<FlipperContractApi>(
    client,
    flipper6 as any,
    contract1Address,
    defaultOptions,
  );

  // Get the current value
  console.log('🔍 Reading current value from first contract...');
  const getValue1 = await contract1.query.get();
  console.log(`   📖 Current value: ${getValue1.data}`);
  console.log(`   ⛽ Gas consumed: ${getValue1.raw.gasConsumed.refTime.toLocaleString()}`);
  console.log();

  // =================================================================
  // Step 4: Dry run and flip the value
  // =================================================================
  console.log('📝 Step 4: Dry Run and Flip the Value');
  console.log('-'.repeat(50));

  // Dry run the flip operation
  console.log('🔍 Dry running flip operation...');
  const flipDryRun = await contract1.query.flip();
  console.log(`   ✅ Flip dry run successful!`);
  console.log(`   ⛽ Gas required: ${flipDryRun.raw.gasConsumed.refTime.toLocaleString()}`);
  console.log();

  // Execute the actual flip
  console.log('🔄 Executing flip transaction...');
  await contract1.tx.flip({gasLimit: flipDryRun.raw.gasRequired}) // --
    .signAndSend(alice, ({status}) => {
      console.log(`   📊 Transaction status: ${status.type}`);
    })
    .untilFinalized();
  console.log();

  // =================================================================
  // Step 5: Get value and verify the change
  // =================================================================
  console.log('📝 Step 5: Verify Value Changed');
  console.log('-'.repeat(50));

  // Get the new value after flip
  console.log('🔍 Reading value after flip...');
  const getValueAfterFlip = await contract1.query.get();
  console.log(`   📖 New value: ${getValueAfterFlip.data}`);
  console.log(`   ⛽ Gas consumed: ${getValueAfterFlip.raw.gasConsumed.refTime.toLocaleString()}`);
  console.log();

  // Verify the change
  console.log('✅ Verification Results:');
  console.log(`   📊 Original value: ${getValue1.data}`);
  console.log(`   📊 New value: ${getValueAfterFlip.data}`);
  console.log(`   🔄 Value changed: ${getValue1.data !== getValueAfterFlip.data ? '✅ YES' : '❌ NO'}`);
  console.log();

  // =================================================================
  // Bonus: Demonstrate flipWithSeed method
  // =================================================================
  console.log('🎁 Bonus: Demonstrate flipWithSeed method');
  console.log('-'.repeat(50));

  const seed = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  console.log(`🌱 Using seed: ${seed}`);

  // Dry run flipWithSeed
  const flipWithSeedDryRun = await contract1.query.flipWithSeed(seed);
  console.log(`   🔍 Dry run result: ${JSON.stringify(flipWithSeedDryRun.data)}`);
  console.log(`   ⛽ Gas required: ${flipWithSeedDryRun.raw.gasConsumed.refTime.toLocaleString()}`);

  // Execute flipWithSeed if dry run was successful
  if (flipWithSeedDryRun.data.isOk) {
    console.log('🔄 Executing flipWithSeed transaction...');
    await contract1.tx.flipWithSeed(seed, {gasLimit: flipWithSeedDryRun.raw.gasRequired})
      .signAndSend(alice, ({status, txHash}) => {
        console.log(`   📊 Transaction status: ${status.type}`);
      })
      .untilFinalized();
    console.log(`   ✅ FlipWithSeed executed successfully!`);

    // Get final value
    const finalValue = await contract1.query.get();
    console.log(`   📖 Final value: ${finalValue.data}`);
  } else {
    console.log(`   ⚠️  FlipWithSeed dry run failed: ${JSON.stringify(flipWithSeedDryRun.data.err)}`);
  }

  console.log();
  console.log('🎉 Pallet-Revive demonstration completed successfully!');
  console.log('='.repeat(60));

} catch (error) {
  console.error('❌ Error during demonstration:', error);
} finally {
  // Clean up
  await client.disconnect();
  console.log('👋 Disconnected from node');
}
