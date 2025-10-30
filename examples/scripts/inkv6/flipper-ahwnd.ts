import { V2Client, WsProvider } from 'dedot';
import { Contract } from 'dedot/contracts';
import { devPairs } from '../keyring.js';
import flipper from './flipper.json';
import { FlipperContractApi } from './flipper/index.js';

const { alice } = await devPairs();

console.log('🚀 Starting Flipper contract storage demonstration');

const client = await V2Client.new(new WsProvider('wss://sys.ibp.network/asset-hub-westend'));

const contractAddress = '0x90b7109346eEbbd8218336fF67CB7F7b5b599eFE';

const contract = new Contract<FlipperContractApi>(
  client, // --
  flipper,
  contractAddress,
  { defaultCaller: alice.address },
);

console.log('📝 Step 1: Read initial contract state');

console.log('🔍 Reading current value from contract');
const value = await contract.query.get();
console.log(`📖 Current value: ${value.data}`);

console.log('🔍 Reading root storage');
const root = await contract.storage.root();
console.log(`📦 Root storage value: ${root.value}`);

console.log('📝 Step 2: Execute flip transaction');

console.log('🔄 Flipping value');
await contract.tx
  .flip()
  .signAndSend(alice, ({ status }) => console.log(`📊 Transaction status: ${status.type}`))
  .untilBestChainBlockIncluded();

console.log('📝 Step 3: Verify storage changes');

console.log('🔍 Reading updated root storage');
const newRootStorage = await contract.storage.root();
console.log(`📦 New root storage value: ${newRootStorage.value}`);

console.log('✅ Storage comparison:');
console.log(`📊 Original storage: ${root.value}`);
console.log(`📊 New storage: ${newRootStorage.value}`);
console.log(`🔄 Storage changed: ${root.value !== newRootStorage.value ? '✅ YES' : '❌ NO'}`);

console.log('🎉 Storage demonstration completed successfully');

await client.disconnect();
console.log('👋 Disconnected from node');
