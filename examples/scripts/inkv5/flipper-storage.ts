import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { stringToHex } from 'dedot/utils';
import { FlipperContractApi } from './flipper/index.js';
import flipperMetadata from './flipper.json' assert { type: 'json' };

import { devPairs } from "../keyring.js";

const { alice } = await devPairs()

// Connect to a local node
console.log('Connecting to node...');
const provider = new WsProvider('ws://127.0.0.1:9944');
const client = await LegacyClient.create({ provider });
console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Create a ContractDeployer instance
console.log('Creating contract deployer...');
const deployer = new ContractDeployer<FlipperContractApi>(
  client,
  flipperMetadata,
  flipperMetadata.source.wasm,
  { defaultCaller: alice.address }
);

try {
  // Generate a unique salt
  const timestamp = await client.query.timestamp.now();
  const salt = stringToHex(`flipper_${timestamp}`);
  
  // Dry-run to estimate gas fee
  console.log('Estimating gas...');
  const { raw: { gasRequired } } = await deployer.query.new(true, { salt });
  
  // Deploy the contract
  console.log('Deploying Flipper contract...');
  const { events } = await deployer.tx
    .new(true, { gasLimit: gasRequired, salt })
    .signAndSend(alice, ({ status }: { status: { type: string } }) => {
      console.log('Transaction status:', status.type);
    })
    .untilFinalized();
  
  // Extract the contract address from the events
  const instantiatedEvent = client.events.contracts.Instantiated.find(events);
  if (!instantiatedEvent) {
    throw new Error('Failed to find Instantiated event');
  }
  
  const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
  console.log('Contract deployed at:', contractAddress);
  
  // Create a Contract instance with the deployed address
  const contract = new Contract<FlipperContractApi>(
    client,
    flipperMetadata,
    contractAddress,
    { defaultCaller: alice.address }
  );
  
  // Get the root storage
  console.log('\nGetting root storage...');
  const root = await contract.storage.root();
  console.log('Root storage:', root);
  
  // Get the unpacked storage
  console.log('\nGetting unpacked storage...');
  const unpacked = contract.storage.unpacked();
  console.log('Unpacked storage:', unpacked);
  
  // For Flipper, the unpacked storage might be empty since it doesn't use lazy storage types
  console.log('\nNote: Flipper uses a simple boolean value, not lazy storage types');
  console.log('Therefore, unpacked() might return an empty object');

  // Check specific values in the root storage
  console.log('\nChecking root storage values:');
  console.log('Value:', await root.value.get()); // Access the boolean value directly
  console.log('Owner:', (await root.owner.get())!.address()); // Access the boolean value directly

  console.log('Value:', await unpacked.value.get()); // Access the boolean value directly
  console.log('Owner:', (await unpacked.owner.get())!.address()); // Access the boolean value directly

  console.log("===")

  const dryRunResult = await contract.query.flip({ caller: alice.address });

  await contract.tx
    .flip({ gasLimit: dryRunResult.raw.gasRequired })
    .signAndSend(alice)
    .untilFinalized();

  console.log('Value:', await root.value.get()); // Access the boolean value directly
  console.log('Owner:', (await root.owner.get())!.address()); // Access the boolean value directly

  console.log('Value:', await unpacked.value.get()); // Access the boolean value directly
  console.log('Owner:', (await unpacked.owner.get())!.address()); // Access the boolean value directly

} catch (error) {
  console.error('Error:', error);
} finally {
  // Disconnect the client
  await client.disconnect();
}
