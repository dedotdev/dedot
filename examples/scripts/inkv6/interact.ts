import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { Contract } from 'dedot/contracts';
import { FlipperContractApi } from './flipper/index.js';
import flipper6 from './flipper_v6.json';

await cryptoWaitReady();
const alice = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');

const client = await LegacyClient.new(new WsProvider('ws://127.0.0.1:9944'));

const address = '0x454b9F63b034a12Ec26264E15B159Fb2f8Bc7E6e';
const contract = new Contract<FlipperContractApi>(
  client, // --
  flipper6 as any,
  address,
  { defaultCaller: alice.address },
);

console.dir(await contract.query.flipWithSeed('0x1212'), { depth: null });
