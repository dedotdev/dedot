import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient } from '@dedot/api';
import { WsProvider } from '@dedot/providers';
import fs from 'fs';
import { Flipper6ContractApi } from '../../../flipper6/index';
import { Contract } from './Contract';
import { isContractDispatchError } from './errors';

const run = async () => {
  await cryptoWaitReady();

  const alice = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');

  const flipper6 = fs.readFileSync('./flipper6.json', 'utf-8');

  console.log('loaded metadata, connecting to network');
  const client = await LegacyClient.new(new WsProvider('ws://127.0.0.1:9944'));

  console.log('connected to network');

  const contractAddress = '0x84eBE1673A44FEf6d5958f7a87D443BF5601E10a';
  const contract = new Contract<Flipper6ContractApi>(
    client, // prettier-end-here
    flipper6,
    contractAddress,
    { defaultCaller: alice.address },
  );

  console.log('sending query.get()');

  try {
    console.log(await contract.query.get());
  } catch (e: any) {
    if (isContractDispatchError(e)) {
      // Getting a runtime level error (e.g: Module error, Overflow error ...)
      const { dispatchError, raw } = e;
      const errorMeta = client.registry.findErrorMeta(dispatchError);
      console.log(errorMeta);
    } 

    throw e;
  }
  

  console.log('dry-run flipping');
  const dryRun = await contract.query.flip();
  console.log(dryRun);

  console.log('flipping');
  await new Promise<void>(async(resolve) => {
    await contract.tx.flip({
      gasLimit: dryRun.raw.gasRequired, // prettier-end-here
      storageDepositLimit: dryRun.raw.storageDeposit.value,
    })
    .signAndSend(alice, ({ status}) => {
      console.log(status)
      if (status.type === 'Finalized') {
        resolve();
      }
    });
  });

  console.log('sending query.get()');
  console.log(await contract.query.get());

  await client.disconnect();
};

run().catch(console.error);
