import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { ContractDeployer } from 'dedot/contracts';
import { devPairs } from '../keyring.js';
import { flipper } from './abi.js';
import { FlipperContractApi } from './flipper/index.js';

await cryptoWaitReady();

const { alice } = await devPairs();
const client = await LegacyClient.new(new WsProvider('ws://localhost:9944'));
const [code, abi] = flipper();

await client.tx.revive.mapAccount().signAndSend(alice).untilFinalized();

const deployer = new ContractDeployer<FlipperContractApi>(client, abi, code, { defaultCaller: alice.address });

console.log('='.repeat(60));
console.log('🚀 Deploying Flipper contract...');
console.log('='.repeat(60));

const deployerResult = await deployer.tx.initialize(true).signAndSend(alice).untilFinalized();
const contractAddress = await deployerResult.contractAddress();

console.log('✅ Contract deployed at address:', contractAddress);

const contract = await deployerResult.contract();

// Basic flip operations
console.log('\n' + '='.repeat(60));
console.log('📋 Basic Flip Operations');
console.log('='.repeat(60));

const { data: initialValue } = await contract.query.get();
console.log('Initial value:', initialValue);

// First flip
const flipResult1 = await contract.tx.flip().signAndSend(alice).untilFinalized();
const flippedEvents1 = contract.events.Flipped.filter(flipResult1.events);
console.log('\n1st flip events:', flippedEvents1);

const { data: afterFlip1 } = await contract.query.get();
console.log('After 1st flip:', afterFlip1);

// Second flip
console.log('\nDru-run flipWithStruc (no state change):');
const { data } = await contract.query.flipWithStruct({ should_flip: false, reason: 'Just checking' });
console.log('Query result (no state change):', data);

const flipResult2 = await contract.tx
  .flipWithStruct({ should_flip: true, reason: 'I need you to flip!' })
  .signAndSend(alice)
  .untilFinalized();
const flippedEvents2 = contract.events.Flipped.filter(flipResult2.events);
console.log('\n2nd flip events:', flippedEvents2);

const { data: afterFlip2 } = await contract.query.get();
console.log('After 2nd flip:', afterFlip2);

// Error handling examples
console.log('\n' + '='.repeat(60));
console.log('❌ Error Handling Examples');
console.log('='.repeat(60));

// Test throwUnitError
console.log('\n1. Testing throwUnitError():');
try {
  const result = await contract.query.throwUnitError();
  console.log('Result:', result);
} catch (error: any) {
  console.dir(error, { depth: null });
  console.log('   ✅ Expected error caught:', error.message || error);
}

// Test throwErrorWithParams
console.log('\n2. Testing throwErrorWithParams():');
try {
  const result = await contract.query.throwErrorWithParams();
  console.log('Result:', result);
} catch (error: any) {
  console.dir(error, { depth: null });
  console.log('   ✅ Expected error caught:', error.message || error);
}

// Test throwErrorWithNamedParams
console.log('\n3. Testing throwErrorWithNamedParams():');
try {
  const result = await contract.query.throwErrorWithNamedParams();
  console.log('Result:', result);
} catch (error: any) {
  console.dir(error, { depth: null });
  console.log('   ✅ Expected error caught:', error.message || error);
}

// Multiple flips with event tracking
console.log('\n' + '='.repeat(60));
console.log('📊 Multiple Flips with Event Tracking');
console.log('='.repeat(60));

const flipCount = 3;
let allEvents = [];

for (let i = 0; i < flipCount; i++) {
  const { data: before } = await contract.query.get();
  const { events } = await contract.tx.flip().signAndSend(alice).untilFinalized();
  const { data: after } = await contract.query.get();
  const flippedEvents = contract.events.Flipped.filter(events);

  allEvents.push(...flippedEvents);
  console.log(`\nFlip ${i + 1}: ${before} -> ${after}`);
  if (flippedEvents.length > 0) {
    console.log(`   Event data:`, flippedEvents[0].data);
  }
}

console.log('\n📈 Summary of all events:', allEvents.length, 'Flipped events captured');

// Query operations (these don't change state but demonstrate query functionality)
console.log('\n' + '='.repeat(60));
console.log('🔍 Query Operations (Read-only)');
console.log('='.repeat(60));

const { data: finalValue } = await contract.query.get();
console.log('Final contract value:', finalValue);

// Test dry-run (query) of flip without actually executing
const dryRunFlip = await contract.query.flip();
console.log('Dry-run flip result (no state change):', dryRunFlip);

const { data: valueAfterDryRun } = await contract.query.get();
console.log('Value after dry-run (should be unchanged):', valueAfterDryRun);

console.log('\n' + '='.repeat(60));
console.log('✨ All operations completed successfully!');
console.log('='.repeat(60));

await client.disconnect();
