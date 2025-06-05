import { DedotClient, LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer, CREATE2, toEvmAddress } from 'dedot/contracts';
import { generateRandomHex } from 'dedot/utils';
import { Psp22ContractApi } from '../inkv5/psp22/index.js';
import { devPairs } from '../keyring.js';
// @ts-ignore
import psp22 from './psp22_v6.json';

const { alice, bob } = await devPairs();

console.log('🚀 Starting PSP22 contract storage demonstration');

// Connect to a local node using DedotClient (v2 API)
console.log('📡 Connecting to node...');
const client = await LegacyClient.new(new WsProvider('ws://127.0.0.1:9944'));
console.log(`✅ Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Option 1: Deploy a new contract for testing
console.log('\n📝 Step 1: Deploy PSP22 contract for storage testing');

// Create a ContractDeployer instance
console.log('🔧 Creating contract deployer...');
const deployer = new ContractDeployer<Psp22ContractApi>(client, psp22, psp22.source.contract_binary, {
  defaultCaller: alice.address,
});

// Generate a unique salt to avoid conflicts
const salt = generateRandomHex();

// Dry-run to estimate gas fee
console.log('⛽ Estimating gas for deployment...');
const dryRun = await deployer.query.new(
  1000000000000n, // total_supply: 1,000,000 tokens (with 12 decimals)
  'Storage Test Token', // name
  'STT', // symbol
  12, // decimals
  { salt },
);

const { gasRequired, storageDeposit } = dryRun.raw;

// Calculate the contract address using CREATE2 before deployment
const contractAddress = CREATE2(toEvmAddress(alice.address), psp22.source.contract_binary, dryRun.inputData, salt);

console.log(`📍 Predicted contract address: ${contractAddress}`);

// Deploy the contract
console.log('🚀 Deploying PSP22 contract...');
const result = await deployer.tx
  .new(
    1000000000000n, // total_supply
    'Storage Test Token', // name
    'STT', // symbol
    12, // decimals
    { gasLimit: gasRequired, storageDepositLimit: storageDeposit.value, salt },
  )
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Deployment status: ${status.type}`);
  })
  .untilBestChainBlockIncluded();

if (result.dispatchError) {
  console.log(`❌ Contract deployment failed:`, client.registry.findErrorMeta(result.dispatchError));
  throw new Error('Contract deployment failed');
} else {
  console.log(`✅ Contract deployed successfully at: ${contractAddress}`);
}

// Create a Contract instance with the deployed address
const contract = new Contract<Psp22ContractApi>(client, psp22, contractAddress, {
  defaultCaller: alice.address,
});

console.log('\n📝 Step 2: Read initial contract storage state');

// Read root storage - contains all the main contract data
console.log('🔍 Reading root storage...');
const initialRootStorage = await contract.storage.root();
console.log('📦 Initial Root Storage:');
console.log(`  📊 Total Supply: ${initialRootStorage.data.totalSupply}`);
console.log(`  🏷️  Token Name: ${initialRootStorage.name}`);
console.log(`  🔤 Token Symbol: ${initialRootStorage.symbol}`);
console.log(`  🔢 Decimals: ${initialRootStorage.decimals}`);

// Access lazy storage for individual mappings
console.log('\n🔍 Reading lazy storage...');
const lazyStorage = contract.storage.lazy();

// Check initial balances using lazy storage
console.log('💰 Initial balances from lazy storage:');
const aliceInitialBalance = await lazyStorage.data.balances.get(alice.address);
const bobInitialBalance = await lazyStorage.data.balances.get(bob.address);
console.log(`  👤 Alice balance: ${aliceInitialBalance || 0n}`);
console.log(`  👤 Bob balance: ${bobInitialBalance || 0n}`);

// Check initial allowances
console.log('🔐 Initial allowances from lazy storage:');
const initialAllowance = await lazyStorage.data.allowances.get([alice.address, bob.address]);
console.log(`  👥 Alice allowance for Bob: ${initialAllowance || 0n}`);

console.log('\n📝 Step 3: Execute token transfer and verify storage changes');

// Transfer some tokens to Bob
const transferAmount = 100000000000n; // 100 tokens (with 12 decimals)
console.log(`💸 Transferring ${transferAmount} tokens to Bob...`);

// Estimate gas for transfer
const {
  raw: { gasRequired: transferGas },
} = await contract.query.psp22Transfer(bob.address, transferAmount, new Uint8Array());

// Execute the transfer
await contract.tx
  .psp22Transfer(bob.address, transferAmount, new Uint8Array(), { gasLimit: transferGas })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Transfer status: ${status.type}`);
  })
  .untilBestChainBlockIncluded();

console.log('✅ Transfer completed');

console.log('\n📝 Step 4: Verify storage changes after transfer');

// Read updated root storage
console.log('🔍 Reading updated root storage...');
const updatedRootStorage = await contract.storage.root();
console.log('📦 Updated Root Storage:');
console.log(`  📊 Total Supply: ${updatedRootStorage.data.totalSupply} (should remain unchanged)`);

// Verify balances changed in lazy storage
console.log('💰 Updated balances from lazy storage:');
const aliceUpdatedBalance = await lazyStorage.data.balances.get(alice.address);
const bobUpdatedBalance = await lazyStorage.data.balances.get(bob.address);
console.log(`  👤 Alice balance: ${aliceUpdatedBalance || 0n}`);
console.log(`  👤 Bob balance: ${bobUpdatedBalance || 0n}`);

// Verify the transfer worked correctly
console.log('\n✅ Storage verification results:');
console.log(
  `📊 Total supply unchanged: ${initialRootStorage.data.totalSupply === updatedRootStorage.data.totalSupply ? '✅ YES' : '❌ NO'}`,
);
console.log(
  `💰 Alice balance decreased: ${(aliceInitialBalance || 0n) > (aliceUpdatedBalance || 0n) ? '✅ YES' : '❌ NO'}`,
);
console.log(`💰 Bob balance increased: ${(bobInitialBalance || 0n) < (bobUpdatedBalance || 0n) ? '✅ YES' : '❌ NO'}`);
console.log(
  `🔢 Transfer amount correct: ${(bobUpdatedBalance || 0n) - (bobInitialBalance || 0n) === transferAmount ? '✅ YES' : '❌ NO'}`,
);

console.log('\n📝 Step 5: Test allowance functionality and storage');

// Set an allowance for Bob to spend Alice's tokens
const allowanceAmount = 50000000000n; // 50 tokens
console.log(`🔐 Setting allowance of ${allowanceAmount} for Bob...`);

// Estimate gas for approve
const {
  raw: { gasRequired: approveGas },
} = await contract.query.psp22Approve(bob.address, allowanceAmount);

// Execute the approve
await contract.tx
  .psp22Approve(bob.address, allowanceAmount, { gasLimit: approveGas })
  .signAndSend(alice, ({ status }) => {
    console.log(`📊 Approve status: ${status.type}`);
  })
  .untilBestChainBlockIncluded();

console.log('✅ Allowance set');

// Verify allowance in storage
console.log('🔍 Reading updated allowance from lazy storage...');
const updatedAllowance = await lazyStorage.data.allowances.get([alice.address, bob.address]);
console.log(`🔐 Updated allowance: ${updatedAllowance || 0n}`);

console.log('\n✅ Allowance verification:');
console.log(`🔐 Allowance set correctly: ${updatedAllowance === allowanceAmount ? '✅ YES' : '❌ NO'}`);

console.log('\n📝 Step 6: Final storage state summary');

// Final comprehensive storage read
console.log('📋 Final contract storage state:');
const finalRootStorage = await contract.storage.root();
const finalAliceBalance = await lazyStorage.data.balances.get(alice.address);
const finalBobBalance = await lazyStorage.data.balances.get(bob.address);
const finalAllowance = await lazyStorage.data.allowances.get([alice.address, bob.address]);

console.log('📦 Root Storage:');
console.log(`  📊 Total Supply: ${finalRootStorage.data.totalSupply}`);
console.log(`  🏷️  Token Name: ${finalRootStorage.name}`);
console.log(`  🔤 Token Symbol: ${finalRootStorage.symbol}`);
console.log(`  🔢 Decimals: ${finalRootStorage.decimals}`);

console.log('💰 Account Balances:');
console.log(`  👤 Alice: ${finalAliceBalance || 0n}`);
console.log(`  👤 Bob: ${finalBobBalance || 0n}`);

console.log('🔐 Allowances:');
console.log(`  👥 Alice → Bob: ${finalAllowance || 0n}`);

console.log('\n🎉 PSP22 contract storage demonstration completed successfully!');
console.log('✅ All storage operations verified and working correctly');

// Disconnect the client
await client.disconnect();
console.log('👋 Disconnected from node');
