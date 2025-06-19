import { DedotClient, WsProvider } from 'dedot';
import { ContractDeployer, toEvmAddress } from 'dedot/contracts';
import { assert, generateRandomHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import { FlipperContractApi } from './flipper/index.js';
// @ts-ignore
import flipper6 from './flipperv6.json';

// Initialize crypto and keyring
const { alice } = await devPairs();

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Connect to the ink-node
const client = await DedotClient.new(new WsProvider('ws://127.0.0.1:9944'));

console.log('🚀 Starting Flipper contract demonstration');

const mappedAccount = await client.query.revive.originalAccount(toEvmAddress(alice.address));
if (mappedAccount) {
  console.log('Alice address has already been mapped!');
} else {
  console.log('Alice address is not mapped, map the account now!');

  await client.tx.revive
    .mapAccount()
    .signAndSend(alice) // --
    .untilFinalized();
}

// Extract PVM bytecode from metadata
const pvmBytecode = flipper6.source.contract_binary;
const codeHash = flipper6.source.hash;

console.log(`📋 Contract info:`);
console.log(`Name: ${flipper6.contract.name}`);
console.log(`Version: ${flipper6.contract.version}`);
console.log(`Language: ${flipper6.source.language}`);
console.log(`Code Hash: ${codeHash}`);

console.log('📝 Step 1: Deploy contract with full code');

const deployer1 = new ContractDeployer<FlipperContractApi>(client, flipper6, pvmBytecode);

const salt = generateRandomHex();

console.log('🚀 Deploying contract with full PVM bytecode');

const txResult = await deployer1.tx
  .new(true, { salt })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (txResult.dispatchError) {
  console.log(`❌ Contract deployment failed:`, client.registry.findErrorMeta(txResult.dispatchError));
} else {
  console.log(`✅ Contract deployed successfully via code at`, await txResult.contractAddress());
}

console.log('📝 Step 2: Deploy contract using code hash');

// Create new deployer using code hash instead of full bytecode
const deployer2 = new ContractDeployer<FlipperContractApi>(client, flipper6, codeHash);

console.log('🚀 Deploying second contract instance using code hash');
const salt2 = generateRandomHex();

const txResult2 = await deployer2.tx
  .new(false, {
    salt: salt2,
  })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (txResult2.dispatchError) {
  console.log(`❌ Contract deployment failed:`, client.registry.findErrorMeta(txResult2.dispatchError));
} else {
  console.log(`✅ Contract deployed successfully via code hash at:`, await txResult2.contractAddress());
}

console.log('📝 Step 3: Read contract value');

const contract = await txResult.contract();

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

{
  console.log('🔄 Executing flip transaction');
  const flipResult = await contract.tx
    .flip()
    .signAndSend(alice, ({ status }) => {
      console.log(`📊 Transaction status: ${status.type}`);
    })
    .untilFinalized();

  // Verify the Flipped event was emitted
  const flippedEvent = contract.events.Flipped.find(flipResult.events);
  assert(flippedEvent, 'Flipped event should be emitted');
  console.log(`🎯 Flipped event:`, flippedEvent);

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
}

{
  console.log('🎁 Bonus: Demonstrate flipWithSeed method');
  const seed = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  console.log(`🌱 Using seed: ${seed}`);

  console.log('🔄 Executing flipWithSeed transaction');
  const flipWithSeedResult = await contract.tx
    .flipWithSeed(seed)
    .signAndSend(alice, ({ status }) => {
      console.log(`📊 Transaction status: ${status.type}`);
    })
    .untilFinalized();
  console.log(`✅ FlipWithSeed executed successfully`);

  // Verify the Flipped event was emitted for flipWithSeed
  const flippedEvent = contract.events.Flipped.find(flipWithSeedResult.events);
  assert(flippedEvent, 'Flipped event should be emitted');
  console.log(`🎯 Flipped event:`, flippedEvent);

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
}
console.log('🎉 Demonstration completed successfully');

await client.disconnect();
console.log('👋 Disconnected from node');
