import Keyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { LegacyClient, WsProvider } from 'dedot';
import * as fs from 'fs';
import { Contract } from '../../../packages/contracts/src/Contract.js';
import { ContractDeployer } from '../../../packages/contracts/src/ContractDeployer.js';
import { SolContract } from '../../../packages/contracts/src/SolContract.js';
import { SolContractDeployer } from '../../../packages/contracts/src/SolContractDeployer.js';
import { ContractMetadataV6 } from '../../../packages/contracts/src/types/index.js';
import { psp22, flipper } from './abi.js';
import { FlipperContractApi } from './flipper/index.js';
import { Psp22ContractApi } from './psp22/index.js';

const run2 = async () => {
  await cryptoWaitReady();
  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const api = await LegacyClient.new(new WsProvider('ws://localhost:9944'));

  const [code, abi] = psp22();

  // @ts-ignore
  const deployer = new SolContractDeployer<Psp22ContractApi>(api, abi, code, { defaultCaller: alicePair.address });

  const dryRunDeploy = await deployer.query.initialize(1000000000, [false, 'Test Coin'], [false, 'TC'], 5);

  console.log('Dry run results:', dryRunDeploy);

  console.log('Trying deploy contract...');

  const deployerResult = await deployer.tx
    .initialize(1000000000, [false, 'Test Coin'], [false, 'TC'], 5, {
      gasLimit: dryRunDeploy.raw.gasRequired,
      storageDepositLimit: dryRunDeploy.raw.storageDeposit.value,
    })
    .signAndSend(alicePair)
    .untilFinalized();

  const contractAddress = await deployerResult.contractAddress();

  console.log('Contract deployed at address:', contractAddress);

  // @ts-ignore
  const contract: SolContract<Psp22ContractApi> = await deployerResult.contract();

  const { data } = await contract.query.tokenName();

  console.log(data);

  await api.disconnect();
};

const run3 = async () => {
  await cryptoWaitReady();
  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const api = await LegacyClient.new(new WsProvider('ws://localhost:9944'));

  const flipper = JSON.parse(fs.readFileSync('./flipper.json', 'utf8')) as ContractMetadataV6;

  // @ts-ignore
  const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, flipper.source.contract_binary, {
    defaultCaller: alicePair.address,
  });

  const dryRunDeploy = await deployer.query.new(false);
  console.dir(dryRunDeploy, { depth: null });

  console.log('Trying deploy contract...');

  const deployerResult = await deployer.tx
    .new(false, {
      gasLimit: dryRunDeploy.raw.gasRequired,
      storageDepositLimit: dryRunDeploy.raw.storageDeposit.value,
    })
    .signAndSend(alicePair)
    .untilFinalized();

  const contractAddress = await deployerResult.contractAddress();
  console.log('Contract deployed at address:', contractAddress);

  // @ts-ignore
  const contract: Contract<FlipperContractApi> = await deployerResult.contract();

  const raw = await contract.query.throwErrorWithParams();
  console.dir(raw, { depth: null });

  await api.disconnect();
};

const run = async () => {
  await cryptoWaitReady();
  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const api = await LegacyClient.new(new WsProvider('ws://localhost:9944'));

  const [code, abi] = flipper();

  // @ts-ignore
  const deployer = new SolContractDeployer<FlipperContractApi>(api, abi, code, { defaultCaller: alicePair.address });

  const dryRunDeploy = await deployer.query.initialize(true);

  console.dir(dryRunDeploy, { depth: null });

  console.log('Trying deploy contract...');

  const deployerResult = await deployer.tx
    .initialize(true, {
      gasLimit: dryRunDeploy.raw.gasRequired,
      storageDepositLimit: dryRunDeploy.raw.storageDeposit.value,
    })
    .signAndSend(alicePair)
    .untilFinalized();

  const contractAddress = await deployerResult.contractAddress();
  console.log('Contract deployed at address:', contractAddress);

  // @ts-ignore
  const contract: SolContract<FlipperContractApi> = await deployerResult.contract();

  /*
  const {
    data: [retrieveInfo],
  } = await contract.query.get();

  console.log('Retrieve info:', retrieveInfo);

  const dryRunFlip = await contract.query.flip();

  console.log('Dry run flip results:', dryRunFlip);

  const { events } = await contract.tx
    .flip({
      gasLimit: dryRunFlip.raw.gasRequired,
      storageDepositLimit: dryRunFlip.raw.storageDeposit.value,
    })
    .signAndSend(alicePair)
    .untilFinalized();

  console.dir(contract.events.Flipped.filter(events), { depth: null });

  console.log('Flip executed successfully.');

  const {
    data: [retrieveInfo2],
  } = await contract.query.get();

  console.log('Updated retrieve info:', retrieveInfo2);
  */

  try {
    const raw = await contract.query.throwErrorWithNamedParams();

    console.dir(raw, { depth: null });
  } catch (e) {
    console.error('Error caught from throwErrorWithParams:', e);
  }

  await api.disconnect();
};

run().catch(console.error);
