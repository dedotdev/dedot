import { LegacyClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { generateRandomHex, stringToHex } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import lazyvecMetadata from './lazyvec.json';
import { LazyvecContractApi } from './lazyvec/index.js';

const { alice } = await devPairs();

// Connect to a local node
console.log('Connecting to node...');
const provider = new WsProvider('ws://127.0.0.1:9944');
const client = await LegacyClient.create({ provider });
console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Create a ContractDeployer instance
console.log('Creating contract deployer...');
const deployer = new ContractDeployer<LazyvecContractApi>(client, lazyvecMetadata, lazyvecMetadata.source.wasm, {
  defaultCaller: alice.address,
});

try {
  // Generate a unique salt
  const salt = generateRandomHex();

  // Deploy the contract
  console.log('Deploying LazyVec contract...');
  const txResult = await deployer.tx
    .default({
      value: 1000000000000n, // Some value for payable constructor
      salt,
    })
    .signAndSend(alice, ({ status }) => {
      console.log('Transaction status:', status.type);
    })
    .untilFinalized();

  const contractAddress = await txResult.contractAddress();
  console.log('Contract deployed at:', contractAddress);

  // Create a Contract instance with the deployed address
  const contract = await txResult.contract();

  // Create a proposal to populate the lazy vector
  console.log('\nCreating a proposal...');

  const createProposalResult = await contract.tx
    .createProposal(
      new Uint8Array([1, 2, 3, 4, 5]), // data
      0, // duration
      2, // min_approvals
      {},
    )
    .signAndSend(alice, ({ status }) => {
      console.log('Create proposal status:', status.type);
    })
    .untilFinalized();

  console.log('Proposal created:', createProposalResult);

  const createProposalResult2 = await contract.tx
    .createProposal(
      new Uint8Array([1, 2, 3, 4, 5, 6]), // data
      100, // duration
      5, // min_approvals
      {},
    )
    .signAndSend(alice, ({ status }) => {
      console.log('Create proposal 2 status:', status.type);
    })
    .untilFinalized();

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

  // Get the lazy storage
  console.log('\nGetting lazy storage...');
  const lazy = contract.storage.lazy();
  console.log('Unpacked storage:', lazy);

  // If the lazy vector has elements, we can access them using getters
  if (lazy.proposals) {
    // Get the length of the lazy vector
    console.log('\nAccessing lazy vector elements using getters:');
    const length = await lazy.proposals.len();
    console.log('Number of proposals:', length);

    // Get the first proposal if it exists
    if (length > 0) {
      const proposal = (await lazy.proposals.get(0))!;
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
