import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, WsProvider } from 'dedot';
import { FixedBytes } from 'dedot/codecs';
import { ContractDeployer, toEvmAddress } from 'dedot/contracts';
import { hexToString } from 'dedot/utils';
import { devPairs } from '../keyring.js';
import { ballot } from './abi.js';
import { BallotContractApi } from './ballot/index.js';

await cryptoWaitReady();

const { alice, bob } = await devPairs();
const client = await DedotClient.legacy(new WsProvider('ws://localhost:9944'));
const [code, abi] = ballot();

// Map accounts for Alice and Bob
await client.tx.revive.mapAccount().signAndSend(alice).untilFinalized();
await client.tx.revive.mapAccount().signAndSend(bob).untilFinalized();

const deployer = new ContractDeployer<BallotContractApi>(client, abi, code, { defaultCaller: alice.address });

console.log('Trying deploy contract...');

// Create proposal names as bytes32 (FixedBytes<32>)
// Converting strings to bytes32 format (padded to 32 bytes)
const proposalNames: FixedBytes<32>[] = [
  '0x50726f706f73616c204100000000000000000000000000000000000000000000', // "Proposal A"
  '0x50726f706f73616c204200000000000000000000000000000000000000000000', // "Proposal B"
  '0x50726f706f73616c204300000000000000000000000000000000000000000000', // "Proposal C"
];

const result = await deployer.tx
  .new(proposalNames) // --
  .signAndSend(alice)
  .untilFinalized();
const contractAddress = await result.contractAddress();

console.log('Contract deployed at address:', contractAddress);

const contract = await result.contract();

// Check the chairperson (should be Alice)
const { data: chairperson } = await contract.query.chairperson();
console.log('Chairperson:', chairperson.toString());

// Give Bob the right to vote
console.log('Giving Bob the right to vote...');
await contract.tx
  .giveRightToVote(toEvmAddress(bob.address)) // --
  .signAndSend(alice)
  .untilFinalized();

// Check Bob's voter info
const { data: bobVoterInfo } = await contract.query.voters(toEvmAddress(bob.address));
console.log('Bob voter info [weight, voted, delegate, vote]:', bobVoterInfo);

// Bob votes for proposal 1 (index 1)
console.log('Bob voting for proposal 1...');
await contract.tx.vote(1n).signAndSend(bob).untilFinalized();

// Check Bob's voter info after voting
const { data: bobVoterInfoAfter } = await contract.query.voters(toEvmAddress(bob.address));
console.log('Bob voter info after voting [weight, voted, delegate, vote]:', bobVoterInfoAfter);

// Check proposals vote counts
console.log('\nProposal vote counts:');
for (let i = 0n; i < 3n; i++) {
  const { data: proposal } = await contract.query.proposals(i);
  const [name, voteCount] = proposal;
  console.log(`  Proposal ${i}: name = ${hexToString(name)}, votes = ${voteCount}`);
}

// Get the winning proposal
const { data: winningProposalIndex } = await contract.query.winningProposal();
console.log('\nWinning proposal index:', winningProposalIndex);

// Get the winner name
const { data: winnerName } = await contract.query.winnerName();
console.log('Winner name (bytes32):', hexToString(winnerName));

await client.disconnect();
