import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { stringToHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import psp22Metadata from './psp22.json';
import { Psp22ContractApi } from './psp22/index.js';

const { alice, bob } = await devPairs();

// Connect to a local node
console.log('Connecting to node...');
const provider = new WsProvider('ws://127.0.0.1:9944');
const client = await LegacyClient.create({ provider });
console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Create a ContractDeployer instance
console.log('Creating contract deployer...');
const deployer = new ContractDeployer<Psp22ContractApi>(client, psp22Metadata, psp22Metadata.source.wasm, {
  defaultCaller: alice.address,
});

// Generate a unique salt
const timestamp = await client.query.timestamp.now();
const salt = stringToHex(`psp22_${timestamp}`);

// Dry-run to estimate gas fee
console.log('Estimating gas...');
const {
  raw: { gasRequired },
} = await deployer.query.new(
  1000000000000n, // total_supply
  'Test Token', // name
  'TST', // symbol
  18, // decimal
  { salt },
);

// Deploy the contract
console.log('Deploying PSP22 contract...');
const { events } = await deployer.tx
  .new(
    1000000000000n, // total_supply
    'Test Token', // name
    'TST', // symbol
    18, // decimal
    { gasLimit: gasRequired, salt },
  )
  .signAndSend(alice, ({ status }) => {
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
const contract = new Contract<Psp22ContractApi>(client, psp22Metadata, contractAddress, {
  defaultCaller: alice.address,
});

// Transfer some tokens to Bob
console.log('\nTransferring tokens to Bob...');
const {
  raw: { gasRequired: transferGas },
} = await contract.query.psp22Transfer(bob.address, 100000000000n, new Uint8Array());

const transferResult = await contract.tx
  .psp22Transfer(bob.address, 100000000000n, new Uint8Array(), { gasLimit: transferGas })
  .signAndSend(alice, ({ status }) => {
    console.log('Transfer status:', status.type);
  })
  .untilFinalized();

console.log('Transfer completed:', transferResult);

// Get the root storage
console.log('\nGetting root storage...');
const root = await contract.storage.root();
console.log('Root storage:', root);

// Check specific values in the root storage
console.log('\nChecking root storage values:');
console.log('Total supply:', root.data.totalSupply);
console.log('Name:', root.name);
console.log('Symbol:', root.symbol);
console.log('Decimals:', root.decimals);

// Get the lazy storage
console.log('\nGetting lazy storage...');
const lazy = contract.storage.lazy();
console.log('Unpacked storage:', lazy);

// Access lazy storage values using getters
if (lazy.data) {
  console.log('\nAccessing lazy storage values using getters:');

  // Get balances using the get method on the balances mapping
  const aliceBalance = await lazy.data.balances.get(alice.address);
  console.log('Alice balance (from lazy storage):', aliceBalance);

  const bobBalance = await lazy.data.balances.get(bob.address);
  console.log('Bob balance (from lazy storage):', bobBalance);

  // Get allowances using the get method on the allowances mapping
  const allowance = await lazy.data.allowances.get([alice.address, bob.address]);
  console.log('Alice allowance for Bob (from lazy storage):', allowance);
}

// Disconnect the client
await client.disconnect();
