import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { RpcVersion } from '@dedot/types';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import {
  Contract,
  ContractDeployer,
  ContractMetadata,
  isContractDispatchError,
  isContractInstantiateDispatchError,
  isContractInstantiateLangError,
  isContractLangError,
  parseRawMetadata,
} from 'dedot/contracts';
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

  const verifyContracts = async (api: ISubstrateClient, flipper: ContractMetadata) => {
    const wasm = flipper.source.wasm!;
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm);
    const salt = stringToHex(api.rpcVersion);

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
            const instantiatedEvent = events
              .map(({ event }) => event) // prettier-end-here
              .find(api.events.contracts.Instantiated.is); // narrow down the type for type suggestions

            assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

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
          const contractEventRecords = events.filter((r) => api.events.contracts.ContractEmitted.is(r.event));

          assert(contractEventRecords.length > 0, 'Should emit at least one event emitted!');

          const flippedEvent = contractEventRecords
            .map((e) => contract.decodeEvent(e))
            .find(contract.events.Flipped.is);

          assert(flippedEvent, 'Flipped event should be emitted');
          assert(flippedEvent.data.new === false, 'New value should be false');
          assert(flippedEvent.data.old === true, 'Old value should be true');

          resolve();
        }
      });
    });

    const { data: newState } = await contract.query.get({ caller });
    console.log(`[${api.rpcVersion}] New value:`, newState);

    assert(state === newState, 'State should be changed');

    // If re-create a contract with same salt, DispatchError throw!
    try {
      await deployer.query.new(true, { caller, salt });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractInstantiateDispatchError(e), 'Should throw ContractInstantiateDispatchError!');
    }

    // If input parameters is not in correct format, LangError throw!
    try {
      await deployer.query.basedOnSeed('0x_error', { caller, salt: '0x' });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractInstantiateLangError(e), 'Should throw ContractInstantiateLangError!');
    }

    // If caller's balance is zero, DispatchError throw!
    try {
      const contract = new Contract<FlipperContractApi>(api, flipper, alicePair.addressRaw);
      await contract.query.flip({ caller });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractDispatchError(e), 'Should throw ContractDispatchError!');
    }

    // If input parameters is not in correct format, LangError throw!
    try {
      await contract.query.flipWithSeed('0x_error', { caller });

      throw new Error('Expected to throw error!');
    } catch (e: any) {
      assert(isContractLangError(e), 'Should throw ContractLangError!');
    }
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
