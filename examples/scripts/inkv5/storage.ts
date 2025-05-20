import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { DedotClient, LegacyClient, WsProvider } from 'dedot';
import { AccountId32, Bytes } from 'dedot/codecs';
import { Contract, TypinkRegistry } from 'dedot/contracts';
import { MerkleizedMetadata } from 'dedot/merkleized-metadata';
import { concatU8a, toU8a, u8aToHex } from 'dedot/utils';
import { Flipper, FlipperContractApi } from './flipper/index.js';
import flipper from './flipper_v5.json';
import motherspace from './motherspace.json';
import { MotherspaceContractApi } from './motherspace/index.js';
import psp22 from './psp22.json';
import { Psp22ContractApi, Psp22Token } from './psp22/index.js';

/**
 * Example of calculating metadata hash for a real chain
 *
 * To run the script:
 * ```shell
 * tsx ./packages/merkleized-metadata/examples/calculate-hash.ts
 * ```
 */
await cryptoWaitReady();
const keyring = new Keyring({ type: 'sr25519' });
const alice = keyring.addFromUri('//Alice');

// Create a dedot client
console.log('Connecting...');
const provider = new WsProvider('ws://127.0.0.1:9944');
const client = await LegacyClient.create({ provider });

console.log(`Connected to ${client.runtimeVersion.specName} v${client.runtimeVersion.specVersion}`);

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const aliceId = new AccountId32(ALICE);

const CONTRACT_ADDRESS = '5FftMDxUkDZN7wLexPLfMTcbRFYBE8MuZhGZMZWjCBHjfriJ';
const CONTRACT_GREETER_ADDRESS = '5DZgJ7PoBpKP9Y6u93KGUvZ6W27sdPkcEU2KSUgA7krVL6g9';
const CONTRACT_PSP22_ADDRESS = '5F5WzFVG3v3ytpe7bfDVd7UccYvdtWCU2JiguacQWNACxTsC';

// console.log(u8aToHex(concatU8a(toU8a('0x00000000d446c745'), toU8a(aliceId.raw))));

// const storage = await client.call.contractsApi.getStorage(CONTRACT_PSP22_ADDRESS, '0x00000000');
//
// console.log('storage', storage);
//
// const getStorage = async (key: Uint8Array): Promise<Bytes | undefined> => {
//   const result = await client.call.contractsApi.getStorage(CONTRACT_PSP22_ADDRESS, key);
//   console.log('getStorage', result);
//   if (result.isOk) {
//     return result.value;
//   }
//
//   throw new Error(result.err);
// };
//
// const registry = new TypinkRegistry(psp22 as any, getStorage);
// if (storage.isErr) {
//   throw new Error('Cannot get storage!');
// }
//
// const decoded = registry.findCodec(14).tryDecode(storage.value) as Psp22Token;
//
// console.log('=====');
// console.log('root', decoded.decimals);
// console.log('alice balance', await decoded.data.balances.get(ALICE));
// console.log('bob balance', await decoded.data.balances.get(BOB));

const contract = new Contract<MotherspaceContractApi>(
  client, // --
  motherspace as any,
  CONTRACT_PSP22_ADDRESS,
  {
    defaultCaller: alice.address,
  },
);

// const root: Psp22Token = await contract.storage.root();
const unpacked = contract.storage.unpacked();

// console.log(root);
console.log(unpacked);
// console.log(await unpacked.data.balances.get(ALICE));
// console.log(await unpacked.data.balances.get(BOB));

// Disconnect the client
await client.disconnect();
