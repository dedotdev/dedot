import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { generateRandomHex, stringToHex } from 'dedot/utils';
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
const deployer = new ContractDeployer<Psp22ContractApi>(
  client, // --
  psp22Metadata,
  psp22Metadata.source.wasm, // extracted from .contract or .wasm files
  { defaultCaller: alice.address },
);

// Deploy the contract
console.log('Deploying PSP22 contract...');
const txResult = await deployer.tx
  .new(
    1000000000000n, // total_supply
    'Test Token', // name
    'TST', // symbol
    18, // decimal
    { salt: generateRandomHex() },
  )
  .signAndSend(alice, ({ status }) => {
    console.log('Transaction status:', status.type);
  })
  .untilFinalized();

console.log('Deployed PSP22 contract');

// Create a Contract instance with the deployed address
const contract = await txResult.contract();

// Transfer some tokens to Bob
console.log('\nTransferring tokens to Bob...');

const transferResult = await contract.tx
  .psp22Transfer(bob.address, 100_000_000_000n, '0x')
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
console.log('\nAccessing lazy storage values using getters:');

// Get balances using the get method on the balances mapping
const aliceBalance = await lazy.data.balances.get(alice.address);
console.log('Alice balance (from lazy storage):', aliceBalance);

const bobBalance = await lazy.data.balances.get(bob.address);
console.log('Bob balance (from lazy storage):', bobBalance);

// Get allowances using the get method on the allowances mapping
const allowance = await lazy.data.allowances.get([alice.address, bob.address]);
console.log('Alice allowance for Bob (from lazy storage):', allowance);

// Disconnect the client
await client.disconnect();
