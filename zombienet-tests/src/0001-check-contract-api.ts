import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Dedot, DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { Contract, ContractDeployer } from 'dedot/contracts';
import { assert } from 'dedot/utils';
import * as flipperRaw from '../flipper.json';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const flipper: string = JSON.stringify(flipperRaw);
  const wasm = flipperRaw.source.wasm;

  const verifyContracts = async (api: ISubstrateClient) => {
    const deployer = new ContractDeployer(api, flipper, wasm);
    const { gasRequired } = await deployer.query.new(true, {
      caller: alicePair.address,
      salt: '0x',
    });

    const constructorTx = deployer.tx.new(true, { gasLimit: gasRequired, salt: '0x' });

    const contractAddress: string = await new Promise(async (resolve) => {
      await constructorTx.signAndSend(alicePair, async ({ status, events }: any) => {
        console.log(`[${api.rpcVersion}] Transaction status`, status.tag);

        if (status.tag === 'Finalized') {
          assert(
            events.some(({ event }: any) => api.events.contracts.Instantiated.is(event)),
            'Event Contracts.Instantiated should be available',
          );

          const contractAddress = events.find(({ event }: any) => api.events.contracts.Instantiated.is(event)).event
            .palletEvent.data.contract.raw;

          resolve(contractAddress);
        }
      });
    });

    console.log(`[${api.rpcVersion}] Deployed contract address`, contractAddress);
    const contract = new Contract(api, contractAddress, flipper);

    const state = await contract.query.get({ caller: alicePair.address });
    assert(state.isOk, 'Query should be successful');
    console.log(`[${api.rpcVersion}] Initial value`, state.data);

    console.log(`[${api.rpcVersion}] Flipping...`);
    const { contractResult } = await contract.query.flip({ caller: alicePair.address });

    await new Promise<void>(async (resolve) => {
      await contract.tx.flip({ gasLimit: contractResult.gasRequired }).signAndSend(alicePair, ({ status }: any) => {
        console.log(`[${api.rpcVersion}] Transaction status`, status.tag);

        if (status.tag === 'Finalized') {
          resolve();
        }
      });
    });

    const newState = await contract.query.get({ caller: alicePair.address });
    assert(newState.isOk, 'Query should be successful');
    console.log(`[${api.rpcVersion}] New value`, newState.data);

    assert(state !== newState, 'State should be changed');
  };

  console.log('Checking via legacy API');
  const apiLegacy = await Dedot.new(new WsProvider(wsUri));
  await verifyContracts(apiLegacy);

  console.log('Checking via new API');
  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  await verifyContracts(apiV2);
};
