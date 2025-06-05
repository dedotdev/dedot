import { DedotClient, WsProvider } from 'dedot';
import { Contract } from 'dedot/contracts';
import { devPairs } from '../keyring.js';
import { FlipperContractApi } from './flipper/index.js';
import flipper6 from './flipper_v6.json';

const { alice } = await devPairs();

const client = await DedotClient.new(new WsProvider('wss://sys.ibp.network/asset-hub-westend'));

const contractAddress = '0x90b7109346eEbbd8218336fF67CB7F7b5b599eFE';
// Create contract instance for the first deployed contract
const contract = new Contract<FlipperContractApi>(client, flipper6, contractAddress, {
  defaultCaller: alice.address,
});

// Get the current value
console.log('🔍 Reading current value from first contract...');
const getValue1 = await contract.query.get();
console.log(`   📖 Current value: ${getValue1.data}`);
console.log(`   ⛽ Gas consumed: ${getValue1.raw.gasConsumed.refTime.toLocaleString()}`);
console.log();

const root = await contract.storage.root();

console.log('RootStorage.Value', root.value);

const { raw } = await contract.query.flip();

// Flipping
console.log('Flipping Value');
await contract.tx
  .flip({
    gasLimit: raw.gasRequired,
    storageDepositLimit: raw.storageDeposit.value,
  })
  .signAndSend(alice, ({ status }) => console.log(status.type))
  .untilBestChainBlockIncluded();

const newRootStorage = await contract.storage.root();

console.log('NewRootStorage.Value', newRootStorage.value);

await client.disconnect();
