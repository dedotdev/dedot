import { DedotClient, WsProvider } from 'dedot';
import { ContractDeployer, toEvmAddress } from 'dedot/contracts';
import { generateRandomHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import erc20 from './erc20.json';
import { Erc20ContractApi } from './erc20/index.js';

// Initialize crypto and keyring
const { alice } = await devPairs();

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Connect to the ink-node
const client = await DedotClient.new(new WsProvider('ws://127.0.0.1:9944'));

console.log('🚀 Starting ERC20 contract demonstration');

const mappedAccount = await client.query.revive.originalAccount(toEvmAddress(alice.address));
if (mappedAccount) {
  console.log('Alice address has already been mapped!');
} else {
  console.log('Alice address is not mapped, map the account now!');

  await client.tx.revive
    .mapAccount()
    .signAndSend(alice) // --
    .untilFinalized();
}

// Extract PVM bytecode from metadata
const pvmBytecode = erc20.source.contract_binary; // extracted from .contract or .polkavm files
const codeHash = erc20.source.hash;

console.log(`📋 Contract info:`);
console.log(`Name: ${erc20.contract.name}`);
console.log(`Version: ${erc20.contract.version}`);
console.log(`Language: ${erc20.source.language}`);
console.log(`Code Hash: ${codeHash}`);

console.log('📝 Step 1: Deploy contract with full code');

const deployer1 = new ContractDeployer<Erc20ContractApi>(client, erc20, pvmBytecode);

console.log('🚀 Deploying contract with full PVM bytecode');

const txResult = await deployer1.tx
  .new(1000000000000n, { salt: generateRandomHex() })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Transaction status: ${status.type}`);
  })
  .untilFinalized();

if (txResult.dispatchError) {
  console.log(`❌ Contract deployment failed:`, client.registry.findErrorMeta(txResult.dispatchError));
} else {
  console.log(`✅ Contract deployed successfully via code at`, await txResult.contractAddress());
}

const contract = await txResult.contract();

console.log('🔍 Reading current value from contract');
const value1 = await contract.query.totalSupply();
console.dir(value1, { depth: null });
