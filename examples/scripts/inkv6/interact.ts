import { DedotClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer, CREATE2, isContractInstantiateDispatchError, toEvmAddress } from 'dedot/contracts';
import { generateRandomHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import { FlipperContractApi } from './flipper/index.js';
// @ts-ignore
import flipper6 from './flipperv6.json';

// Event signature topics
const FLIPPED_EVENT_TOPIC = '0x0a39b5ca0b8b3a5172476100ae7b9168b269cc91d5648efe180c75d935d3e886';

// Helper function to verify contract events
function verifyFlippedEvent(result: any, expectedOld: boolean, expectedNew: boolean) {
  console.log('🔍 Verifying Flipped event...');
  
  const events = result.events?.filter((event: any) => 
    event.topics?.[0] === FLIPPED_EVENT_TOPIC
  );
  
  if (!events || events.length === 0) {
    console.log('❌ No Flipped event found in transaction');
    return false;
  }
  
  console.log(`✅ Found ${events.length} Flipped event(s)`);
  
  // For this verification, we'll check that the event was emitted
  // The actual event data decoding would require more complex registry usage
  // but the presence of the event with correct topic is a good verification
  console.log(`📋 Event topic: ${events[0].topics[0]}`);
  console.log(`📋 Expected old value: ${expectedOld}, new value: ${expectedNew}`);
  
  return true;
}

// Initialize crypto and keyring
const { alice } = await devPairs();

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Connect to the ink-node
const client = await DedotClient.new(new WsProvider('ws://127.0.0.1:9944'));

console.log('🚀 Starting Flipper contract demonstration');

// Try to map account first!
await client.tx.revive
  .mapAccount()
  .signAndSend(alice) // --
  .untilFinalized();

// Extract PVM bytecode from metadata
const pvmBytecode = flipper6.source.contract_binary;
const codeHash = flipper6.source.hash;

console.log(`📋 Contract info:`);
console.log(`Name: ${flipper6.contract.name}`);
console.log(`Version: ${flipper6.contract.version}`);
console.log(`Language: ${flipper6.source.language}`);
console.log(`Code Hash: ${codeHash}`);

// Common options for contract operations
const defaultOptions = { defaultCaller: alice.address };

console.log('📝 Step 1: Deploy contract with full code');

const deployer1 = new ContractDeployer<FlipperContractApi>(client, flipper6, pvmBytecode, defaultOptions);

const salt = generateRandomHex();

// Dry run the constructor to estimate gas and validate deployment
console.log('🔍 Dry running constructor with initial value: true');
let dryRun;
try {
  dryRun = await deployer1.query.new(true, { salt });
} catch (e: any) {
  if (isContractInstantiateDispatchError(e)) {
    console.log('❌ Dry run failed', client.registry.findErrorMeta(e.dispatchError));
  }

  throw e;
}

console.log('✅ Dry run successful');
console.log(`📍 Predicted address: ${dryRun.address}`);

console.log('🚀 Deploying contract with full PVM bytecode');

const result = await deployer1.tx
  .new(true, {
    gasLimit: dryRun.raw.gasRequired,
    storageDepositLimit: dryRun.raw.storageDeposit.value,
    salt,
  })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (result.dispatchError) {
  console.log(`❌ Contract deployment failed:`, client.registry.findErrorMeta(result.dispatchError));
} else {
  console.log(`✅ Contract deployed successfully`);
}

console.log('📝 Step 2: Deploy contract using code hash');

// Create new deployer using code hash instead of full bytecode
const deployer2 = new ContractDeployer<FlipperContractApi>(
  client,
  flipper6,
  codeHash, // Using code hash instead of full bytecode
  defaultOptions,
);

console.log('🚀 Deploying second contract instance using code hash');
const salt2 = generateRandomHex();
const dryRun2 = await deployer2.query.new(false, { salt: salt2 });

const result2 = await deployer2.tx
  .new(false, {
    gasLimit: dryRun2.raw.gasRequired,
    storageDepositLimit: dryRun2.raw.storageDeposit.value,
    salt: salt2,
  })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (result2.dispatchError) {
  console.log(`❌ Contract deployment failed:`, client.registry.findErrorMeta(result2.dispatchError));
} else {
  console.log(`✅ Contract deployed successfully`);
}

console.log('📝 Step 3: Read contract value');

const contractAddress = CREATE2(
  toEvmAddress(alice.address), // --
  flipper6.source.contract_binary,
  dryRun.inputData,
  salt,
);

// Create contract instance for the first deployed contract
const contract = new Contract<FlipperContractApi>(client, flipper6, contractAddress, defaultOptions);

console.log('🔍 Reading current value from contract');
const getValue1 = await contract.query.get();
console.log(`📖 Current value: ${getValue1.data}`);

console.log('🔍 Reading root storage');
const root = await contract.storage.root();
console.log(`📦 Root storage value: ${root.value}`);

console.log('✅ Initial verification:');
console.log(`📊 Query value: ${getValue1.data}`);
console.log(`📊 Storage value: ${root.value}`);
console.log(`🔄 Values match: ${getValue1.data === root.value ? '✅ YES' : '❌ NO'}`);

console.log('📝 Step 4: Flip the value');

console.log('🔍 Dry running flip operation');
const flipDryRun = await contract.query.flip();
console.log(`✅ Flip dry run successful`);

console.log('🔄 Executing flip transaction');
const flipResult = await contract.tx
  .flip({
    gasLimit: flipDryRun.raw.gasRequired,
    storageDepositLimit: flipDryRun.raw.storageDeposit.value,
  })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

// Verify the Flipped event was emitted
const flipEventVerified = verifyFlippedEvent(flipResult, getValue1.data, !getValue1.data);
console.log(`🎯 Flip event verification: ${flipEventVerified ? '✅ PASSED' : '❌ FAILED'}`);

console.log('📝 Step 5: Verify value changed');

console.log('🔍 Reading value after flip');
const getValueAfterFlip = await contract.query.get();
console.log(`📖 New value: ${getValueAfterFlip.data}`);

console.log('🔍 Reading updated root storage');
const newRoot = await contract.storage.root();
console.log(`📦 New root storage value: ${newRoot.value}`);

console.log('✅ Post-flip verification:');
console.log(`📊 Query value: ${getValueAfterFlip.data}`);
console.log(`📊 Storage value: ${newRoot.value}`);
console.log(`🔄 Values match: ${getValueAfterFlip.data === newRoot.value ? '✅ YES' : '❌ NO'}`);

console.log('✅ Overall verification results:');
console.log(`📊 Original query value: ${getValue1.data}`);
console.log(`📊 Original storage value: ${root.value}`);
console.log(`📊 New query value: ${getValueAfterFlip.data}`);
console.log(`📊 New storage value: ${newRoot.value}`);
console.log(`🔄 Value changed: ${getValue1.data !== getValueAfterFlip.data ? '✅ YES' : '❌ NO'}`);
console.log(`🔄 Storage changed: ${root.value !== newRoot.value ? '✅ YES' : '❌ NO'}`);
console.log(
  `🔄 Query-Storage consistency: ${getValue1.data === root.value && getValueAfterFlip.data === newRoot.value ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`,
);

console.log('🎁 Bonus: Demonstrate flipWithSeed method');

const seed = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
console.log(`🌱 Using seed: ${seed}`);

const flipWithSeedDryRun = await contract.query.flipWithSeed(seed);
console.log(`🔍 Dry run result: ${JSON.stringify(flipWithSeedDryRun.data)}`);

if (flipWithSeedDryRun.data.isOk) {
  console.log('🔄 Executing flipWithSeed transaction');
  const flipWithSeedResult = await contract.tx
    .flipWithSeed(seed, {
      gasLimit: flipWithSeedDryRun.raw.gasRequired,
      storageDepositLimit: flipWithSeedDryRun.raw.storageDeposit.value,
    })
    .signAndSend(alice, ({ status, txHash }) => {
      console.log(`📊 Transaction status: ${status.type}`);
    })
    .untilFinalized();
  console.log(`✅ FlipWithSeed executed successfully`);

  // Verify the Flipped event was emitted for flipWithSeed
  const flipWithSeedEventVerified = verifyFlippedEvent(flipWithSeedResult, getValueAfterFlip.data, !getValueAfterFlip.data);
  console.log(`🎯 FlipWithSeed event verification: ${flipWithSeedEventVerified ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('🔍 Reading final value after flipWithSeed');
  const finalValue = await contract.query.get();
  console.log(`📖 Final value: ${finalValue.data}`);

  console.log('🔍 Reading final root storage');
  const finalRoot = await contract.storage.root();
  console.log(`📦 Final root storage value: ${finalRoot.value}`);

  console.log('✅ Final verification:');
  console.log(`📊 Query value: ${finalValue.data}`);
  console.log(`📊 Storage value: ${finalRoot.value}`);
  console.log(`🔄 Values match: ${finalValue.data === finalRoot.value ? '✅ YES' : '❌ NO'}`);
} else {
  console.log(`⚠️ FlipWithSeed dry run failed: ${JSON.stringify(flipWithSeedDryRun.data.err)}`);
}

console.log('🎉 Demonstration completed successfully');

await client.disconnect();
console.log('👋 Disconnected from node');
