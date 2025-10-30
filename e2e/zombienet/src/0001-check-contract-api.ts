import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer, ContractMetadata } from 'dedot/contracts';
import { assert, stringToHex } from 'dedot/utils';
import * as flipperV4Raw from '../flipper_v4.json';
import * as flipperV5Raw from '../flipper_v5.json';
import { FlipperContractApi } from './contracts/flipper';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const caller = alicePair.address;
  const flipperV4 = flipperV4Raw as ContractMetadata;
  const flipperV5 = flipperV5Raw as ContractMetadata;

  const verifyContracts = async (api: ISubstrateClient, flipper: ContractMetadata) => {
    // @ts-ignore
    const wasm = flipper.source.wasm!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm, { defaultCaller: caller });

    // Avoid to use same salt with previous tests.
    const timestamp = await api.query.timestamp.now();
    const salt = stringToHex(`${api.rpcVersion}_${timestamp}`);

    const { events } = await deployer.tx
      .new(true, { salt })
      .signAndSend(alicePair, ({ status }) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.type);
      })
      .untilFinalized();

    const instantiatedEvent = api.events.contracts.Instantiated.find(events);

    const instantiatedEvent2 = events
      .map(({ event }) => event) // prettier-end-here
      .find(api.events.contracts.Instantiated.is); // narrow down the type for type suggestions

    const instantiatedEvent3 = events.find(api.events.contracts.Instantiated.is)!.event; // narrow down the type for type suggestions

    assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');
    assert(JSON.stringify(instantiatedEvent) === JSON.stringify(instantiatedEvent2), 'Incorrect instantiated event 2');
    assert(JSON.stringify(instantiatedEvent) === JSON.stringify(instantiatedEvent3), 'Incorrect instantiated event 3');

    const contractAddress = instantiatedEvent.palletEvent.data.contract.address();

    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);
    const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress, { defaultCaller: caller });

    const flippedPromise = new Promise<boolean>(async (resolve) => {
      const unsub = await contract.events.Flipped.watch((events) => {
        events.forEach((event) => {
          console.log('Coin flipped!');
          console.log('New state:', event.data.new);

          unsub();
          resolve(true);
        });
      });
    });

    const { data: state } = await contract.query.get();

    console.log(`[${api.rpcVersion}] Initial value:`, state);
    console.log(`[${api.rpcVersion}] Flipping...`);

    const { events: newEvents } = await contract.tx
      .flip()
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
  const apiLegacy = await DedotClient.legacy(new WsProvider(wsUri));
  await verifyContracts(apiLegacy, flipperV4);
  await verifyContracts(apiLegacy, flipperV5);

  console.log('Checking via new API');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyContracts(apiV2, flipperV4);
  await verifyContracts(apiV2, flipperV5);
};
