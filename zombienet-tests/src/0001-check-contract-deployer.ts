import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Contract, ContractDeployer, parseRawMetadata } from '@dedot/contracts';
import { assert, Dedot, WsProvider } from 'dedot';
import * as flipperRaw from '../flipper.json';

export const run = async (nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const flipper = parseRawMetadata(JSON.stringify(flipperRaw));
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const api = await Dedot.new(new WsProvider(wsUri));
  const contractDeployer = new ContractDeployer(api, flipper, flipper.source.wasm!);

  const { gasRequired } = await contractDeployer.query.new(flipper.source.hash, alicePair.address, {
    caller: alicePair.address,
    value: 0n,
    salt: '0x',
  });

  const constructorTx = contractDeployer.tx.new(flipper.source.hash, alicePair.address, {
    value: 0n,
    gasRequired,
    salt: '0x',
  });

  let contractAddress: string = '';

  await constructorTx.signAndSend(alicePair, async ({ status, events }: any) => {
    console.log('Transaction status', status.tag);

    if (status.tag === 'InBlock') {
      assert(
        events.some(({ event }: any) => api.events.contracts.Instantiated.is(event)),
        'Event Contracts.Instantiated should be available',
      );

      contractAddress = events
        .find(({ event }: any) => api.events.contracts.Instantiated.is(event))
        .event.data[1].raw.toString();
    }
  });

  console.assert(contractAddress, 'Contract address should be available');

  const contract = new Contract(api, contractAddress, flipper);

  const value = await contract.query.get();
  console.log('Initial value:', value.toString());

  await contract.tx.flip().signAndSend(alicePair);

  const newValue = await contract.query.get();
  console.log('New value:', newValue.toString());
};
