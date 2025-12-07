import { DedotClient, ExtraSignedExtension, signRawMessage, WsProvider } from 'dedot';
import { SignerPayloadJSON, SignerResult } from 'dedot/types';
import { assert, u8aToHex } from 'dedot/utils';
import { devPairs } from './keyring.js';

const client = await DedotClient.new(new WsProvider('wss://pas-rpc.stakeworld.io'));

const { alice } = await devPairs();

const signer = {
  signPayload: async (payload: SignerPayloadJSON): Promise<SignerResult> => {
    const extra = new ExtraSignedExtension(client, { signerAddress: payload.address });
    await extra.fromPayload(payload);

    const rawPayload = extra.toRawPayload(payload.method).data;
    const signature = u8aToHex(signRawMessage(alice, rawPayload));

    assert(
      JSON.stringify(extra.toPayload(payload.method)) === JSON.stringify(payload),
      'JSON Payload should remain the same!',
    );

    return {
      id: Date.now(),
      signature,
    };
  },
};

const signedTx = await client.tx.system
  .remarkWithEvent('Hello') // -
  .sign(alice.address, { signer, tip: 1_000_0000n });

const result = await client
  .sendTx(signedTx.toHex(), (progress) => {
    console.log(progress);
  })
  .untilBestChainBlockIncluded();

console.log('result', result);

await client.disconnect();
