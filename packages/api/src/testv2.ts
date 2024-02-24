import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { AstarApi, PolkadotApi } from '@delightfuldot/chaintypes';
import { ApiPromise } from '@polkadot/api';
import { WsProvider } from '@polkadot/rpc-provider';
import { SignerPayload } from '@polkadot/types/interfaces';
import { objectSpread } from '@polkadot/util';
import { SignerPayloadJSON } from '@polkadot/types/types';

const run = async () => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const api = await ApiPromise.create({ provider: new WsProvider('wss://rococo-asset-hub-rpc.polkadot.io/') });

  const transferTx = api.tx.balances.transferKeepAlive(
    '5CDCFpLH7mNKcJrH5zAvKZMmCCRnYx9FWxm6kZjgskRhrvSi',
    2_000_000_000_000n,
  );

  const options = {
    assetId: {
      parents: 1,
      interior: 'Here',
    },
  };
  await transferTx.signAsync(alice, options);

  // @ts-ignore
  const assetId = transferTx.inner.signature.assetId.toHex();

  // console.log(assetId);

  const payload = api.registry.createTypeUnsafe<SignerPayload>('SignerPayload', [
    objectSpread({}, options, {
      address: alice.address,
      method: transferTx.method,
      version: 4,
    }),
  ]);

  console.log(payload.toPayload());

  const payloadJSON: SignerPayloadJSON = objectSpread(payload.toPayload(), { assetId });

  console.log(payloadJSON);

  const newPayload = api.registry.createType('ExtrinsicPayload', payloadJSON, { version: payloadJSON.version });

  console.log(newPayload.toJSON());
};

run().catch(console.error);
