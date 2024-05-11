import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ContractDeployer, parseRawMetadata } from '@dedot/contracts';
import { assert, Dedot, DedotClient, WsProvider } from 'dedot';
import * as rawMotherSpace from '../tests-contract-metadata.json';

export const run = async (nodeName: any, networkInfo: any) => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');

  const motherSpace = parseRawMetadata(JSON.stringify(rawMotherSpace));
  const { wsUri } = networkInfo.nodesByName['collator01'];

  const api = await Dedot.new(new WsProvider(wsUri));
  const contractDeployer = new ContractDeployer(api, motherSpace, motherSpace.source.wasm!);

  const constructorTx = contractDeployer.tx.new(motherSpace.source.hash, alicePair.address, {
    value: 0n,
    gasLimit: {
      refTime: 10000000000n,
      proofSize: 100000n,
    },
    storageDepositLimit: undefined,
    salt: '0x',
  });

  return new Promise(async (resolve) => {
    await constructorTx.signAndSend(alicePair, async ({ status, events }: any) => {
      console.log('Transaction status', status.tag);

      if (status.tag === 'InBlock') {
        assert(
          events.some(({ event }: any) => api.events.contracts.Instantiated.is(event)),
          'Event Contracts.Instantiated should be available',
        );

        resolve(null);
      }
    });
  });
};
