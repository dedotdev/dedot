import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { RpcVersion } from '@dedot/types';
import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { assert, stringToHex } from 'dedot/utils';
import * as flipperRaw from '../flipper.json';
import { FlipperContractApi } from './contracts/flipper';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const flipper: string = JSON.stringify(flipperRaw);
  const wasm = flipperRaw.source.wasm;
  const caller = alicePair.address;

  const verifyContracts = async (api: ISubstrateClient<SubstrateApi[RpcVersion]>) => {
    const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm);
    const salt = stringToHex(api.rpcVersion);

    // Dry-run to estimate gas fee
    const { gasRequired } = await deployer.query.new(true, {
      caller,
      salt,
    });

    const constructorTx = deployer.tx.new(true, { gasLimit: gasRequired, salt });

    const contractAddress: string = await new Promise(async (resolve, reject) => {
      await constructorTx.signAndSend(alicePair, async ({ status, events }) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.tag);

        if (status.tag === 'Finalized') {
          const instantiatedEvent = events.find(({ event }) => api.events.contracts.Instantiated.is(event));

          assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

          // narrow down the type for type suggestions
          if (api.events.contracts.Instantiated.is(instantiatedEvent.event)) {
            const contractAddress = instantiatedEvent.event.palletEvent.data.contract.address();
            resolve(contractAddress);
          } else {
            reject();
          }
        }
      });
    });

    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);
    const contract = new Contract<FlipperContractApi>(api, flipper, contractAddress);

    const state = await contract.query.get({ caller });
    assert(state.isOk && state.data.isOk, 'Query should be successful');
    console.log(`[${api.rpcVersion}] Initial value:`, state.data.value);

    console.log(`[${api.rpcVersion}] Flipping...`);

    // Dry-run to estimate gas fee
    const { raw } = await contract.query.flip({ caller });

    await new Promise<void>(async (resolve) => {
      await contract.tx.flip({ gasLimit: raw.gasRequired }).signAndSend(alicePair, ({ status }: any) => {
        console.log(`[${api.rpcVersion}] Transaction status:`, status.tag);

        if (status.tag === 'Finalized') {
          resolve();
        }
      });
    });

    const newState = await contract.query.get({ caller });
    assert(newState.isOk && newState.data.isOk, 'Query should be successful');
    console.log(`[${api.rpcVersion}] New value:`, newState.data.value);

    assert(state.data.value !== newState.data.value, 'State should be changed');
  };

  console.log('Checking via legacy API');
  const apiLegacy = await LegacyClient.new(new WsProvider(wsUri));
  await verifyContracts(apiLegacy);

  console.log('Checking via new API');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyContracts(apiV2);
};
