import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { Contract, ContractDeployer, ContractMetadata, parseRawMetadata } from 'dedot/contracts';
import { IKeyringPair, RpcVersion } from 'dedot/types';
import { assert, isHex, isNumber, stringToHex } from 'dedot/utils';
import * as flipperV4Raw from '../flipper_v4.json';
import * as flipperV5Raw from '../flipper_v5.json';
import { FlipperContractApi } from './contracts/flipper';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const caller = alicePair.address;
  const flipperV4 = parseRawMetadata(JSON.stringify(flipperV4Raw));
  const flipperV5 = parseRawMetadata(JSON.stringify(flipperV5Raw));

  // Test with LegacyClient
  console.log('Testing contract chaining methods with LegacyClient');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await testContractChainingMethods(apiLegacy, flipperV4, alicePair, caller);

  // Test with DedotClient
  console.log('Testing contract chaining methods with DedotClient');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await testContractChainingMethods(apiV2, flipperV5, alicePair, caller);
};

async function testContractChainingMethods(
  api: ISubstrateClient<SubstrateApi[RpcVersion]>,
  flipper: ContractMetadata,
  alicePair: IKeyringPair,
  caller: string,
) {
  const wasm = flipper.source.wasm!;
  const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm, { defaultCaller: caller });

  // Avoid using the same salt with previous tests
  const timestamp = await api.query.timestamp.now();
  const salt = stringToHex(`${api.rpcVersion}_${timestamp}_chaining_test`);

  // Dry-run to estimate gas fee
  const {
    raw: { gasRequired },
  } = await deployer.query.new(true, {
    salt,
  });

  console.log(`[${api.rpcVersion}] Testing untilBestChainBlockIncluded with contract deployment`);

  // Test untilBestChainBlockIncluded with contract deployment
  const bestChainResult = await deployer.tx
    .new(true, { gasLimit: gasRequired, salt }) // --
    .signAndSend(alicePair)
    .untilBestChainBlockIncluded();

  // Verify the result contains the expected status
  assert(bestChainResult.status.type === 'BestChainBlockIncluded', 'Status should be BestChainBlockIncluded');
  assert(isHex(bestChainResult.status.value.blockHash), 'Block hash should be hex');
  assert(isNumber(bestChainResult.status.value.blockNumber), 'Block number should be number');
  assert(isNumber(bestChainResult.status.value.txIndex), 'Tx index should be number');

  // Verify the contract was deployed successfully
  const instantiatedEvent = api.events.contracts.Instantiated.find(bestChainResult.events);
  assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

  const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
  console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);

  const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress, { defaultCaller: caller });

  // Get initial state
  const { data: initialState } = await contract.query.get();
  console.log(`[${api.rpcVersion}] Initial value:`, initialState);

  // Dry-run to estimate gas fee for flip
  const { raw } = await contract.query.flip();

  console.log(`[${api.rpcVersion}] Testing untilFinalized with contract method call`);

  // Test untilFinalized with contract method call
  const finalizedResult = await contract.tx
    .flip({ gasLimit: raw.gasRequired }) // --
    .signAndSend(alicePair)
    .untilFinalized();

  // Verify the result contains the expected status
  assert(finalizedResult.status.type === 'Finalized', 'Status should be Finalized');
  assert(isHex(finalizedResult.status.value.blockHash), 'Block hash should be hex');
  assert(isNumber(finalizedResult.status.value.blockNumber), 'Block number should be number');
  assert(isNumber(finalizedResult.status.value.txIndex), 'Tx index should be number');

  // Verify the flip was successful
  const flippedEvent = contract.events.Flipped.find(finalizedResult.events);
  assert(flippedEvent, 'Flipped event should be emitted');
  assert(flippedEvent.data.new === false, 'New value should be false');
  assert(flippedEvent.data.old === true, 'Old value should be true');

  // Verify the state was changed
  const { data: newState } = await contract.query.get();
  console.log(`[${api.rpcVersion}] New value:`, newState);
  assert(initialState !== newState, 'State should be changed');
}
