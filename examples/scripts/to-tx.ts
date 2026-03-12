import { DedotClient, WsProvider } from 'dedot';
import { devPairs } from './keyring.js';

/**
 * Example of using `client.toTx()` to convert a raw hex-encoded transaction
 * into a submittable extrinsic with `paymentInfo` and `send` methods.
 *
 * To run the script:
 * ```shell
 * tsx ./examples/scripts/to-tx.ts
 * ```
 */
const { alice } = await devPairs();

console.log('Connecting to local dev node...');
const client = await DedotClient.new(new WsProvider('ws://127.0.0.1:9944'));
console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

// Build and sign a remark extrinsic to get a raw hex string
const remarkTx = client.tx.system.remark('Hello from toTx!');
await remarkTx.sign(alice);
const txHex = remarkTx.toHex();
console.log('Signed tx hex:', txHex);

// Convert the hex back into a submittable extrinsic using `toTx`
const submittable = client.toTx(txHex);

// Query payment info to show fee estimation works
const paymentInfo = await submittable.paymentInfo(alice.address);
console.log('Estimated fee:', paymentInfo.partialFee.toString());

// Send the submittable extrinsic and wait for finalization
const result = await submittable
  .send((result) => {
    console.log('Tx status:', result.status.type);
  })
  .untilFinalized();

if (result.status.type === 'Finalized') {
  console.log('Tx finalized at block:', result.status.value.blockHash);
}

await client.disconnect();
