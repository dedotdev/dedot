import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { flipper } from './abi.js';
import { FlipperContractApi } from './flipper/index.js';

await cryptoWaitReady();

const alice = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
const client = await LegacyClient.new(new WsProvider('ws://localhost:9944'));
const [code, abi] = flipper();

await client.tx.revive.mapAccount().signAndSend(alice).untilFinalized();

const deployer = new ContractDeployer(client, abi, code, { defaultCaller: alice.address });

console.log('Trying deploy contract...');

const deployerResult = await deployer.tx.initialize(true).signAndSend(alice).untilFinalized();
const contractAddress = await deployerResult.contractAddress();

console.log('Contract deployed at address:', contractAddress);

const contract: Contract<FlipperContractApi> = await deployerResult.contract();

const { data: before } = await contract.query.get();
console.log('Before flip:', before);

const { events } = await contract.tx.flip().signAndSend(alice).untilFinalized();

const eventsFiltered = contract.events.Flipped.filter(events);
console.log('Events: ', eventsFiltered);

const { data: after } = await contract.query.get();
console.log('After flip:', after);

await client.disconnect();
