import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { stringToHex } from 'dedot/utils';
import { LazyvecContractApi } from './lazyvec/index.js';
import lazyvecMetadata from './lazyvec.json' assert { type: 'json' };

// Wait for crypto to be ready for keyring
await cryptoWaitReady();

// Create a keyring and add Alice as deployer
const keyring = new Keyring({ type: 'sr25519' });
const alice = keyring.addFromUri('//Alice');

// Connect to a local node
console.log('Connecting to node...');
const provider = new WsProvider('ws://127.0.0.1:9944');
const client = await LegacyClient.create({ provider });
console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Create a ContractDeployer instance
console.log('Creating contract deployer...');
const deployer = new ContractDeployer<LazyvecContractApi>(
  client,
  lazyvecMetadata,
  lazyvecMetadata.source.wasm,
  { defaultCaller: alice.address }
);

try {
  // Generate a unique salt
  const timestamp = await client.query.timestamp.now();
  const salt = stringToHex(`lazyvec_${timestamp}`);
  
  // Dry-run to estimate gas fee
  console.log('Estimating gas...');
  const { raw: { gasRequired } } = await deployer.query.default({ salt });
  
  // Deploy the contract
  console.log('Deploying LazyVec contract...');
  const { events } = await deployer.tx
    .default({ 
      value: 1000000000000n, // Some value for payable constructor
      gasLimit: gasRequired, 
      salt 
    })
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
  const contract = new Contract<LazyvecContractApi>(
    client,
    lazyvecMetadata,
    contractAddress,
    { defaultCaller: alice.address }
  );
  
  // Create a proposal to populate the lazy vector
  console.log('\nCreating a proposal...');
  const { raw: { gasRequired: createProposalGas } } = await contract.query.createProposal(
    new Uint8Array([1, 2, 3, 4, 5]), // data
    100, // duration
    2 // min_approvals
  );
  
  const createProposalResult = await contract.tx.createProposal(
    new Uint8Array([1, 2, 3, 4, 5]), // data
    100, // duration
    2, // min_approvals
    { gasLimit: createProposalGas }
  ).signAndSend(alice, ({ status }: { status: { type: string } }) => {
    console.log('Create proposal status:', status.type);
  }).untilFinalized();
  
  console.log('Proposal created:', createProposalResult);

  const createProposalResult2 = await contract.tx.createProposal(
    new Uint8Array([1, 2, 3, 4, 5, 6]), // data
    100_000, // duration
    5, // min_approvals
    { gasLimit: createProposalGas }
  ).signAndSend(alice, ({ status }: { status: { type: string } }) => {
    console.log('Create proposal 2 status:', status.type);
  }).untilFinalized();

  console.log('Proposal 2 created:', createProposalResult2);
  
  // Get the root storage
  console.log('\nGetting root storage...');
  const root = await contract.storage.root();
  console.log('Root storage:', root);
  
  // Check specific values in the root storage
  console.log('\nChecking root storage values:');
  if (root.proposals) {
    console.log('Proposals in root storage:', root.proposals);
  }
  
  // Get the unpacked storage
  console.log('\nGetting unpacked storage...');
  const unpacked = contract.storage.unpacked();
  console.log('Unpacked storage:', unpacked);
  
  // If the lazy vector has elements, we can access them using getters
  if (unpacked.proposals) {
    // Get the length of the lazy vector
    console.log('\nAccessing lazy vector elements using getters:');
    const length = await unpacked.proposals.len();
    console.log('Number of proposals:', length);
    
    // Get the first proposal if it exists
    if (length > 0) {
      const proposal = await unpacked.proposals.get(0);
      console.log('First proposal:', proposal);

      // Access specific fields of the proposal
      console.log('Proposal data:', proposal.data);
      console.log('Proposal until:', proposal.until);
      console.log('Proposal approvals:', proposal.approvals);
      console.log('Proposal min_approvals:', proposal.minApprovals);
    }
  }
  
} catch (error) {
  console.error('Error:', error);
} finally {
  // Disconnect the client
  await client.disconnect();
}
