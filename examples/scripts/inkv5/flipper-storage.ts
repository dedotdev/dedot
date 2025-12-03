import { DedotClient, WsProvider } from 'dedot';
import { ContractDeployer } from 'dedot/contracts';
import { generateRandomHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import flipperMetadata from './flipper.json';
import { FlipperContractApi } from './flipper/index.js';

const { alice } = await devPairs();

// Connect to a local node
console.log('Connecting to node...');
const provider = new WsProvider('ws://127.0.0.1:9944');
const client = await DedotClient.legacy({ provider });
console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Create a ContractDeployer instance
console.log('Creating contract deployer...');
const deployer = new ContractDeployer<FlipperContractApi>(
  client,
  flipperMetadata,
  flipperMetadata.source.wasm, // extracted from .contract or .wasm files
  { defaultCaller: alice.address },
);

// Generate a unique salt
const salt = generateRandomHex();

// Deploy the contract
console.log('Deploying Flipper contract...');
const txResult = await deployer.tx
  .new(true, { salt })
  .signAndSend(alice, ({ status }) => {
    console.log('Transaction status:', status.type);
  })
  .untilFinalized();

const contractAddress = await txResult.contractAddress();
console.log('Contract deployed at:', contractAddress);

// Create a Contract instance with the deployed address
const contract = await txResult.contract();

// Get the root storage
console.log('\nGetting root storage...');
const root = await contract.storage.root();

// Get the lazy storage
console.log('\nGetting unpacked storage...');
const lazy = contract.storage.lazy();

// Check specific values in the root storage
console.log('\nChecking storage values:');
console.log('[Root] Value:', await root.value.get()); // Access the boolean value directly
console.log('[Root] Owner:', (await root.owner.get())!.address()); // Access the boolean value directly

console.log('[Lazy] Value:', await lazy.value.get()); // Access the boolean value directly
console.log('[Lazy] Owner:', (await lazy.owner.get())!.address()); // Access the boolean value directly

console.log('===');

console.log('Flipping the value');

await contract.tx
  .flip() // --
  .signAndSend(alice)
  .untilFinalized();

console.log('Done flipping the value');

console.log('===');

console.log('[Root] Value:', await root.value.get()); // Access the boolean value directly
console.log('[Root] Owner:', (await root.owner.get())!.address()); // Access the boolean value directly

console.log('[Lazy] Value:', await lazy.value.get()); // Access the boolean value directly
console.log('[Lazy] Owner:', (await lazy.owner.get())!.address()); // Access the boolean value directly

await client.disconnect();
