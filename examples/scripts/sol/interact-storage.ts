import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { ContractDeployer } from 'dedot/contracts';
import { devPairs } from '../keyring.js';
import { storage } from './abi.js';
import { StorageContractApi } from './storage/index.js';

await cryptoWaitReady();

const { alice } = await devPairs();
const client = await LegacyClient.new(new WsProvider('ws://localhost:9944'));
const [code, abi] = storage();

await client.tx.revive.mapAccount().signAndSend(alice).untilFinalized();

const deployer = new ContractDeployer<StorageContractApi>(client, abi, code, { defaultCaller: alice.address });

console.log('Trying deploy contract...');

const deployerResult = await deployer.tx.new().signAndSend(alice).untilFinalized();
const contractAddress = await deployerResult.contractAddress();

console.log('Contract deployed at address:', contractAddress);

const contract = await deployerResult.contract();

// Retrieve initial value
const { data: initialValue } = await contract.query.retrieve();
console.log('Initial stored value:', initialValue);

// Store a new value
const newValue = 42n;
console.log(`Storing new value: ${newValue}`);
await contract.tx.store(newValue).signAndSend(alice).untilFinalized();

// Retrieve the updated value
const { data: updatedValue } = await contract.query.retrieve();
console.log('Updated stored value:', updatedValue);

await client.disconnect();
