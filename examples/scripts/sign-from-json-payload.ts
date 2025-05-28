import { IKeyringPair, SignerPayloadJSON, SignerResult } from '@dedot/types';
import { DedotClient, ExtraSignedExtension, WsProvider } from 'dedot';
import { HexString, assert, hexToU8a, u8aToHex, blake2AsU8a } from 'dedot/utils';
import { devPairs } from './keyring.js';

const client = await DedotClient.new(new WsProvider('wss://rpc.ibp.network/westend'));

const { alice } = await devPairs();

export function signRaw(signerPair: IKeyringPair, raw: HexString | string): Uint8Array {
  const u8a = hexToU8a(raw);
  // Ref: https://github.com/paritytech/polkadot-sdk/blob/943697fa693a4da6ef481ef93df522accb7d0583/substrate/primitives/runtime/src/generic/unchecked_extrinsic.rs#L234-L238
  const toSignRaw = u8a.length > 256 ? blake2AsU8a(u8a) : u8a;

  return signerPair.sign(toSignRaw, { withType: true });
}

const signer = {
  signPayload: async (payload: SignerPayloadJSON): Promise<SignerResult> => {
    const extra = new ExtraSignedExtension(client, { signerAddress: payload.address });
    await extra.fromPayload(payload);

    const signature = u8aToHex(signRaw(alice, extra.toRawPayload(payload.method as HexString).data));

    assert(
      JSON.stringify(extra.toPayload(payload.method as HexString)) === JSON.stringify(payload),
      'JSON Payload should remain the same!',
    );

    return {
      id: Date.now(),
      signature,
    };
  },
};

await client.tx.system
  .remarkWithEvent('Hello') // -
  .signAndSend(alice.address, { signer, tip: 1_000_0000n }, ({ status }) => {
    console.log(status);
  })
  .untilFinalized();

await client.disconnect();
