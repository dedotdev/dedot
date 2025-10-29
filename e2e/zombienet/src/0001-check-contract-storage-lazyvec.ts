import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { RpcVersion } from 'dedot/types';
import { assert, stringToHex } from 'dedot/utils';
import { LazyvecContractApi } from '../../../examples/scripts/inkv5/lazyvec';
import * as lazyvecRaw from '../../../examples/scripts/inkv5/lazyvec.json';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const alice = alicePair.address;

  const verifyLazyVecStorage = async (api: ISubstrateClient) => {
    console.log(`[${api.rpcVersion}] Testing LazyVec contract storage API`);

    // Deploy the contract
    const deployer = new ContractDeployer<LazyvecContractApi>(api, lazyvecRaw, lazyvecRaw.source.wasm, {
      defaultCaller: alice,
    });

    // Generate a unique salt
    const timestamp = await api.query.timestamp.now();
    const salt = stringToHex(`${api.rpcVersion}_${timestamp}`);

    // Deploy the contract
    const { events } = await deployer.tx
      .default({
        value: 1000000000000n, // Some value for payable constructor
        salt,
      })
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.type);
      })
      .untilFinalized();

    // Extract the contract address from the events
    const instantiatedEvent = api.events.contracts.Instantiated.find(events);
    assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

    const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);

    // Create a Contract instance with the deployed address
    const contract = new Contract<LazyvecContractApi>(api, lazyvecRaw, contractAddress, { defaultCaller: alice });

    // Test root() storage method
    console.log(`[${api.rpcVersion}] Testing root() storage method`);
    const root = await contract.storage.root();

    // Verify initial state
    console.log(`[${api.rpcVersion}] Initial root storage:`, root);

    // Test lazy() storage method
    console.log(`[${api.rpcVersion}] Testing lazy() storage method`);
    const lazy = contract.storage.lazy();

    // Verify initial state of lazy vector
    const initialLength = await lazy.proposals.len();
    console.log(`[${api.rpcVersion}] Initial vector length:`, initialLength);
    assert(initialLength === 0, 'Initial vector length should be 0');

    // Create a proposal to populate the lazy vector
    console.log(`[${api.rpcVersion}] Creating a proposal...`);

    await contract.tx
      .createProposal(
        new Uint8Array([1, 2, 3, 4, 5]), // data
        0, // duration
        2, // min_approvals
      )
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Create proposal status:`, status.type);
      })
      .untilFinalized();

    // Verify vector length after adding a proposal
    const lengthAfterProposal = await lazy.proposals.len();
    console.log(`[${api.rpcVersion}] Vector length after proposal:`, lengthAfterProposal);
    assert(lengthAfterProposal === 1, 'Vector length after proposal should be 1');

    // Get the first proposal
    const proposal = await lazy.proposals.get(0);
    console.log(`[${api.rpcVersion}] First proposal:`, proposal);
    assert(proposal !== undefined, 'First proposal should exist');

    // Verify proposal data
    assert(proposal!.minApprovals === 2, 'Proposal min_approvals should be 2');
    assert(proposal!.approvals === 0, 'Proposal approvals should be 0');
    assert(proposal!.until > 0, 'Proposal until should be larger than 0');

    // Create a second proposal
    console.log(`[${api.rpcVersion}] Creating a second proposal...`);
    await contract.tx
      .createProposal(
        new Uint8Array([6, 7, 8, 9, 10]), // data
        200, // duration
        3, // min_approvals
      )
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Create second proposal status:`, status.type);
      })
      .untilFinalized();

    // Verify vector length after adding a second proposal
    const lengthAfterSecondProposal = await lazy.proposals.len();
    console.log(`[${api.rpcVersion}] Vector length after second proposal:`, lengthAfterSecondProposal);
    assert(lengthAfterSecondProposal === 2, 'Vector length after second proposal should be 2');

    // Get the second proposal
    const secondProposal = await lazy.proposals.get(1);
    console.log(`[${api.rpcVersion}] Second proposal:`, secondProposal);
    assert(secondProposal !== undefined, 'Second proposal should exist');

    // Verify second proposal data
    assert(secondProposal!.minApprovals === 3, 'Second proposal min_approvals should be 3');
    assert(secondProposal!.approvals === 0, 'Second proposal approvals should be 0');
    assert(secondProposal!.until > 200, 'Second proposal until should be larger than 200');

    // Test accessing non-existent element
    const nonExistentProposal = await lazy.proposals.get(2);
    console.log(`[${api.rpcVersion}] Non-existent proposal:`, nonExistentProposal);
    assert(nonExistentProposal === undefined, 'Non-existent proposal should be undefined');

    console.log(`[${api.rpcVersion}] LazyVec contract storage API tests passed`);
  };

  // Test with legacy client
  console.log('Testing with legacy client');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await verifyLazyVecStorage(apiLegacy);

  // Test with new client
  console.log('Testing with new client');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyLazyVecStorage(apiV2);
};
