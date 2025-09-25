import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Contract, ContractAddress, ContractDeployer } from '@dedot/contracts';
import { generateRandomHex } from '@dedot/utils';
import { flipperSol } from './contracts/abi.js';
import { FlipperContractApi } from './contracts/flipper';
import { FlipperSolContractApi } from './contracts/flipper-sol';
import * as flipperV5 from './contracts/flipper_v5.json';
import * as flipperV6 from './contracts/flipper_v6.json';

await cryptoWaitReady();
export const KEYRING = new Keyring({ type: 'sr25519' });

export const flipperV5Metadata = flipperV5;
export const flipperV6Metadata = flipperV6;

// Sol contract metadata and constants
const [FLIPPER_SOL_CODE, FLIPPER_SOL_ABI] = flipperSol();
export const flipperSolAbi = FLIPPER_SOL_ABI;
export const flipperSolCode = FLIPPER_SOL_CODE;

export const devPairs = () => {
  const alice = KEYRING.addFromUri('//Alice');
  const bob = KEYRING.addFromUri('//Bob');
  return { alice, bob };
};

export const deployFlipperV5 = async (signer: KeyringPair): Promise<ContractAddress> => {
  const deployer = new ContractDeployer<FlipperContractApi>(
    contractsClient, // prettier-end-here
    flipperV5Metadata,
    flipperV5Metadata.source.wasm!,
    { defaultCaller: signer.address },
  );

  const salt = generateRandomHex();

  const txResult = await deployer.tx // --
    .new(true, { salt })
    .signAndSend(signer)
    .untilFinalized();

  return await txResult.contractAddress();
};

export const deployFlipperV6 = async (signer: KeyringPair): Promise<ContractAddress> => {
  const deployer = new ContractDeployer<FlipperContractApi>(
    reviveClient,
    flipperV6Metadata,
    flipperV6Metadata.source.contract_binary!,
    { defaultCaller: signer.address },
  );

  const txResult = await deployer.tx // --
    .new(true)
    .signAndSend(signer)
    .untilFinalized();

  return await txResult.contractAddress();
};

export const deployFlipperSol = async (signer: KeyringPair): Promise<Contract<FlipperSolContractApi>> => {
  const deployer = new ContractDeployer<FlipperSolContractApi>(reviveClient, flipperSolAbi, flipperSolCode, {
    defaultCaller: signer.address,
  });

  const txResult = await deployer.tx
    .new(true) // initialize with true
    .signAndSend(signer)
    .untilFinalized();

  return await txResult.contract();
};
