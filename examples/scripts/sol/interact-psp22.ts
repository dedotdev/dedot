import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { ContractDeployer } from 'dedot/contracts';
import { devPairs } from '../keyring.js';
import { psp22 } from './abi.js';
import { Psp22ContractApi } from './psp22/index.js';

await cryptoWaitReady();
const { alice } = await devPairs();
const client = await LegacyClient.new(new WsProvider('ws://localhost:9944'));

const [code, abi] = psp22();

await client.tx.revive.mapAccount().signAndSend(alice).untilFinalized();

const deployer = new ContractDeployer<Psp22ContractApi>(client, abi, code, { defaultCaller: alice.address });

console.log('Trying deploy contract...');

const deployerResult = await deployer.tx
  .initialize(1000000000n, [true, 'Test Coin'], [true, 'TC'], 5)
  .signAndSend(alice)
  .untilFinalized();

const contractAddress = await deployerResult.contractAddress();
console.log('Contract deployed at address:', contractAddress);

const contract = await deployerResult.contract();

const { data } = await contract.query.tokenName();
console.log('tokenName', data);

const { data: tokenSupply } = await contract.query.totalSupply();
console.log('tokenSupply', tokenSupply);

await client.disconnect();
