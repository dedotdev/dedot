import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { Contract, ContractDeployer, ContractMetadata, create1, parseRawMetadata, toEthAddress } from 'dedot/revive';
import { RpcVersion } from 'dedot/types';
import { assert } from 'dedot/utils';
// @ts-ignore
import * as flipperV6Raw from './../../flipper_v6.json';
import { FlipperContractApi } from './flipper';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const caller = alicePair.address;
  const flipperV6 = parseRawMetadata(JSON.stringify(flipperV6Raw));

  const verifyContracts = async (api: ISubstrateClient<SubstrateApi[RpcVersion]>, flipper: ContractMetadata) => {
    const binary = flipper.source.contract_binary!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, binary, { defaultCaller: caller });

    // Dry-run to estimate gas fee
    const {
      raw: { gasRequired, storageDeposit },
    } = await deployer.query.new(true);

    // Dry-run to estimate gas fee
    const nonce = await api.call.accountNonceApi.accountNonce(caller);
    const contractAddress = create1(toEthAddress(alicePair.address), nonce);

    console.log(`[${api.rpcVersion}] Deploying contract...`);
    await deployer.tx
      .new(true, { gasLimit: gasRequired, storageDepositLimit: storageDeposit.value })
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.type);
      })
      .untilFinalized();

    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);
    const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress, { defaultCaller: caller });

    const flippedPromise = new Promise<boolean>(async (resolve) => {
      const unsub = await contract.events.Flipped.watch((events) => {
        events.forEach((event) => {
          console.log(`[${api.rpcVersion}] Coin flipped!`);
          console.log(`[${api.rpcVersion}] New state: ${event.data.new}`);

          unsub();
          resolve(true);
        });
      });
    });

    const { data: state } = await contract.query.get();

    console.log(`[${api.rpcVersion}] Initial value:`, state);
    console.log(`[${api.rpcVersion}] Flipping...`);

    // Dry-run to estimate gas fee
    const { raw } = await contract.query.flip();

    const { events: newEvents } = await contract.tx
      .flip({ gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value })
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transaction status`, status.type);
      })
      .untilFinalized();

    const flippedEvent1 = contract.events.Flipped.find(newEvents);
    const flippedEvents1 = contract.events.Flipped.filter(newEvents);

    const contractEvents = contract.decodeEvents(newEvents);
    const flippedEvents2 = contract.events.Flipped.filter(contractEvents);

    const flippedEvent2 = contract.events.Flipped.find(contractEvents);
    const flippedEvent3 = contractEvents.find(contract.events.Flipped.is);
    const flippedEvent4 = contract.decodeEvent(newEvents.find(contract.events.Flipped.is)!);

    assert(
      JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent2), // prettier-end-here
      'Incorrect flipped event 2',
    );
    assert(
      JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent3), // prettier-end-here
      'Incorrect flipped event 3',
    );
    assert(
      JSON.stringify(flippedEvent1) === JSON.stringify(flippedEvent4), // prettier-end-here
      'Incorrect flipped event 4',
    );
    assert(
      JSON.stringify([flippedEvent1]) === JSON.stringify(flippedEvents1), // prettier-end-here
      'Incorrect flipped event filter 1',
    );
    assert(
      JSON.stringify(flippedEvents2) === JSON.stringify(flippedEvents1), // prettier-end-here
      'Incorrect flipped event filter 2',
    );

    assert(flippedEvent1, 'Flipped event should be emitted');
    assert(flippedEvent1.data.new === false, 'New value should be false');
    assert(flippedEvent1.data.old === true, 'Old value should be true');

    const { data: newState, flags } = await contract.query.get({ caller });
    console.log(`[${api.rpcVersion}] New value:`, newState);

    assert(flags.bits === 0 && flags.revert === false, 'Should not get Revert flag if call success!');
    assert(state !== newState, 'State should be changed');
    assert(await flippedPromise, 'Flipped event should be watched');
  };

  console.log('Checking via legacy API');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await apiLegacy.tx.revive.mapAccount().signAndSend(alicePair).untilFinalized();
  await verifyContracts(apiLegacy, flipperV6);

  console.log('Checking via new API');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyContracts(apiV2, flipperV6);
};
