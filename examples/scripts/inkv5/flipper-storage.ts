import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { generateRandomHex, stringToHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import flipperMetadata from './flipper.json';
import { FlipperContractApi } from './flipper/index.js';

const { alice } = await devPairs();

// Connect to a local node
console.log('Connecting to node...');
const provider = new WsProvider('ws://127.0.0.1:9944');
const client = await LegacyClient.create({ provider });
console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Create a ContractDeployer instance
console.log('Creating contract deployer...');
const deployer = new ContractDeployer<FlipperContractApi>(client, flipperMetadata, flipperMetadata.source.wasm, {
  defaultCaller: alice.address,
});

try {
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
  console.log('Root storage:', root);

  // Get the lazy storage
  console.log('\nGetting unpacked storage...');
  const lazy = contract.storage.lazy();
  console.log('Unpacked storage:', lazy);

  // For Flipper, the lazy storage might be empty since it doesn't use lazy storage types
  console.log('\nNote: Flipper uses a simple boolean value, not lazy storage types');
  console.log('Therefore, lazy() might return an empty object');

  // Check specific values in the root storage
  console.log('\nChecking root storage values:');
  console.log('Value:', await root.value.get()); // Access the boolean value directly
  console.log('Owner:', (await root.owner.get())!.address()); // Access the boolean value directly

  console.log('Value:', await lazy.value.get()); // Access the boolean value directly
  console.log('Owner:', (await lazy.owner.get())!.address()); // Access the boolean value directly

  console.log('===');

  await contract.query.flip({ caller: alice.address });

  await contract.tx
    .flip() // --
    .signAndSend(alice)
    .untilFinalized();

  console.log('Value:', await root.value.get()); // Access the boolean value directly
  console.log('Owner:', (await root.owner.get())!.address()); // Access the boolean value directly

  console.log('Value:', await lazy.value.get()); // Access the boolean value directly
  console.log('Owner:', (await lazy.owner.get())!.address()); // Access the boolean value directly
} catch (error) {
  console.error('Error:', error);
} finally {
  // Disconnect the client
  await client.disconnect();
}
