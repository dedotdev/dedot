import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Contract, ContractDeployer, parseRawMetadata } from '@dedot/contracts';
import { assert, Dedot, WsProvider } from 'dedot';
import * as flipperRaw from '../flipper.json';

export const run = async (_nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const flipper = parseRawMetadata(JSON.stringify(flipperRaw));
  const { wsUri } = networkInfo.nodesByName['collator-1'];

  const api = await Dedot.new(new WsProvider(wsUri));

  const contractDeployer = new ContractDeployer(api, flipper, flipper.source.wasm!);

  const { gasRequired } = await contractDeployer.query.new(true, {
    caller: alicePair.address,
    value: 0n,
    salt: '0x',
  });

  const constructorTx = contractDeployer.tx.new(true, { value: 0n, gasLimit: gasRequired, salt: '0x' });

  const contractAddress: string = await new Promise(async (resolve) => {
    await constructorTx.signAndSend(alicePair, async ({ status, events }: any) => {
      console.log('Transaction status', status.tag);

      if (status.tag === 'InBlock') {
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

  console.log('Contract address', contractAddress);
  const contract = new Contract(api, contractAddress, flipper);

  const state = await contract.query.get({ caller: alicePair.address, value: 0n });
  assert(state.isOk, 'Query should be successful');
  console.log('Initial value', state.data);

  console.log('Flipping...');
  const { contractResult } = await contract.query.flip({ caller: alicePair.address, value: 0n });

  const waitForFinish = await new Promise(async (resolve) => {
    await contract.tx
      .flip({ value: 0n, gasLimit: contractResult.gasRequired })
      .signAndSend(alicePair, (result: any) => {
        console.log('Transaction status', result.status.tag);

        if (result.status.tag === 'InBlock') {
          resolve(null);
        }
      });
  });

  const newState = await contract.query.get({ caller: alicePair.address, value: 0n });
  assert(newState.isOk, 'Query should be successful');
  console.log('New value', newState.data);

  assert(state !== newState, 'State should be changed');
};
