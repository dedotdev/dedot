import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { Contract, ContractDeployer, ContractMetadata, parseRawMetadata } from 'dedot/contracts';
import { RpcVersion } from 'dedot/types';
import { assert, stringToHex } from 'dedot/utils';
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

  const verifyContracts = async (api: ISubstrateClient<SubstrateApi[RpcVersion]>, flipper: ContractMetadata) => {
    const wasm = flipper.source.wasm!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm);

    // Avoid to use same salt with previous tests.
    const timestamp = await api.query.timestamp.now();
    const salt = stringToHex(`${api.rpcVersion}_${timestamp}`);

    // Dry-run to estimate gas fee
    const {
      raw: { gasRequired },
    } = await deployer.query.new(true, {
      caller,
      salt,
    });

    const contractAddress: string = await new Promise(async (resolve) => {
      await deployer.tx
        .new(true, { gasLimit: gasRequired, salt })
        .signAndSend(alicePair, async ({ status, events }) => {
          console.log(`[${api.rpcVersion}] Transaction status:`, status.type);

          if (status.type === 'Finalized') {
            const instantiatedEvent = api.events.contracts.Instantiated.find(events);

            const instantiatedEvent2 = events
              .map(({ event }) => event) // prettier-end-here
              .find(api.events.contracts.Instantiated.is); // narrow down the type for type suggestions

            const instantiatedEvent3 = events.find(api.events.contracts.Instantiated.is)!.event; // narrow down the type for type suggestions

            assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');
            assert(
              JSON.stringify(instantiatedEvent) === JSON.stringify(instantiatedEvent2),
              'Incorrect instantiated event 2',
            );
            assert(
              JSON.stringify(instantiatedEvent) === JSON.stringify(instantiatedEvent3),
              'Incorrect instantiated event 3',
            );

            const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
            resolve(contractAddress);
          }
        });
    });

    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);
    const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress);

    const { data: state } = await contract.query.get({ caller });

    console.log(`[${api.rpcVersion}] Initial value:`, state);
    console.log(`[${api.rpcVersion}] Flipping...`);

    // Dry-run to estimate gas fee
    const { raw } = await contract.query.flip({ caller });

    await new Promise<void>(async (resolve) => {
      await contract.tx.flip({ gasLimit: raw.gasRequired }).signAndSend(alicePair, ({ status, events }) => {
        console.log(`[${api.rpcVersion}] Transaction status`, status.type);

        if (status.type === 'Finalized') {
          const flippedEvent1 = contract.events.Flipped.find(events);
          const flippedEvents1 = contract.events.Flipped.filter(events);

          const contractEvents = contract.decodeEvents(events);
          const flippedEvents2 = contract.events.Flipped.filter(contractEvents);

          const flippedEvent2 = contract.events.Flipped.find(contractEvents);
          const flippedEvent3 = contractEvents.find(contract.events.Flipped.is);
          const flippedEvent4 = contract.decodeEvent(events.find(contract.events.Flipped.is)!);

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

          resolve();
        }
      });
    });

    const { data: newState, flags } = await contract.query.get({ caller });
    console.log(`[${api.rpcVersion}] New value:`, newState);

    assert(flags.bits === 0 && flags.revert === false, 'Should not get Revert flag if call success!')
    assert(state !== newState, 'State should be changed');
  };

  console.log('Checking via legacy API');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await verifyContracts(apiLegacy, flipperV4);
  await verifyContracts(apiLegacy, flipperV5);

  console.log('Checking via new API');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyContracts(apiV2, flipperV4);
  await verifyContracts(apiV2, flipperV5);
};
