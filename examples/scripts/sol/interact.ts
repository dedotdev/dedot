import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import { SolContractDeployer } from '../../../packages/contracts/src/SolContractDeployer.js';
import { psp22, flipper } from './abi.js';
import { FlipperContractApi } from './flipper/index.js';
import { Psp22ContractApi } from './psp22/index.js';

const psp22Run = async () => {
  await cryptoWaitReady();
  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const api = await LegacyClient.new(new WsProvider('ws://localhost:9944'));

  const [code, abi] = psp22();

  const deployer = new SolContractDeployer<Psp22ContractApi>(api, abi, code, { defaultCaller: alicePair.address });

  console.log('Trying deploy contract...');

  const deployerResult = await deployer.tx
    .initialize(1000000000n, [true, 'Test Coin'], [true, 'TC'], 5)
    .signAndSend(alicePair)
    .untilFinalized();

  const contractAddress = await deployerResult.contractAddress();
  console.log('Contract deployed at address:', contractAddress);

  const contract = await deployerResult.contract();

  const { data } = await contract.query.tokenName();

  console.log(data);

  await api.disconnect();
};

const flipperRun = async () => {
  await cryptoWaitReady();

  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const api = await LegacyClient.new(new WsProvider('ws://localhost:9944'));
  const [code, abi] = flipper();

  const deployer = new SolContractDeployer<FlipperContractApi>(api, abi, code, { defaultCaller: alicePair.address });

  console.log('Trying deploy contract...');

  const deployerResult = await deployer.tx.initialize(true).signAndSend(alicePair).untilFinalized();
  const contractAddress = await deployerResult.contractAddress();

  console.log('Contract deployed at address:', contractAddress);

  const contract = await deployerResult.contract();

  const { data: before } = await contract.query.get();
  console.log('Before flip:', before);

  const { events } = await contract.tx.flip().signAndSend(alicePair).untilFinalized();

  const eventsFiltered = contract.events.Flipped.filter(events);
  console.log('Events: ', eventsFiltered);

  const { data: after } = await contract.query.get();
  console.log('After flip:', after);

  await api.disconnect();
};

flipperRun().catch(console.error);
