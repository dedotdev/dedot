import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Contract, ContractAddress, ContractDeployer } from '@dedot/contracts';
import { generateRandomHex } from '@dedot/utils';
// Import from examples - inkv5
import * as inkv5FlipperMetadata from '../../../examples/scripts/inkv5/flipper.json';
import { FlipperContractApi as Inkv5FlipperApi } from '../../../examples/scripts/inkv5/flipper/index.js';
import * as inkv5LazyVecMetadata from '../../../examples/scripts/inkv5/lazyvec.json';
import { LazyvecContractApi } from '../../../examples/scripts/inkv5/lazyvec/index.js';
import * as inkv5Psp22Metadata from '../../../examples/scripts/inkv5/psp22.json';
import { Psp22ContractApi as Inkv5Psp22Api } from '../../../examples/scripts/inkv5/psp22/index.js';
import * as inkv6Erc20Metadata from '../../../examples/scripts/inkv6/erc20.json';
import { Erc20ContractApi as Inkv6Erc20Api } from '../../../examples/scripts/inkv6/erc20/index.js';
// Import from examples - inkv6
import * as inkv6FlipperMetadata from '../../../examples/scripts/inkv6/flipper.json';
import { FlipperContractApi as Inkv6FlipperApi } from '../../../examples/scripts/inkv6/flipper/index.js';
import * as inkv6Psp22Metadata from '../../../examples/scripts/inkv6/psp22v6.json';
import { Psp22v6ContractApi } from '../../../examples/scripts/inkv6/psp22v6/index.js';
// Import from examples - sol
import {
  ballot,
  erc20 as solErc20,
  flipper as solFlipper,
  psp22 as solPsp22,
  storage as solStorage, // @ts-ignore
} from '../../../examples/scripts/sol/abi.js';
import { BallotContractApi } from '../../../examples/scripts/sol/ballot/index.js';
import { Erc20ContractApi as SolErc20Api } from '../../../examples/scripts/sol/erc20/index.js';
import { FlipperContractApi as SolFlipperApi } from '../../../examples/scripts/sol/flipper/index.js';
import { Psp22ContractApi as SolPsp22Api } from '../../../examples/scripts/sol/psp22/index.js';
import { StorageContractApi as SolStorageApi } from '../../../examples/scripts/sol/storage/index.js';
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

// Export metadata from examples
export { inkv5FlipperMetadata, inkv5LazyVecMetadata, inkv5Psp22Metadata };
export { inkv6FlipperMetadata, inkv6Erc20Metadata, inkv6Psp22Metadata };
export { ballot, solErc20, solFlipper, solPsp22, solStorage };

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

// ============================================================================
// Deployment helpers for examples contracts
// ============================================================================

// inkv5 deployment helpers
export const deployInkv5Flipper = async (signer: KeyringPair): Promise<Contract<Inkv5FlipperApi>> => {
  const deployer = new ContractDeployer<Inkv5FlipperApi>(
    contractsClient,
    inkv5FlipperMetadata,
    inkv5FlipperMetadata.source.wasm!,
    { defaultCaller: signer.address },
  );

  const txResult = await deployer.tx.new(true, { salt: generateRandomHex() }).signAndSend(signer).untilFinalized();

  return await txResult.contract();
};

export const deployInkv5LazyVec = async (signer: KeyringPair): Promise<Contract<LazyvecContractApi>> => {
  const deployer = new ContractDeployer<LazyvecContractApi>(
    contractsClient,
    inkv5LazyVecMetadata,
    inkv5LazyVecMetadata.source.wasm!,
    { defaultCaller: signer.address },
  );

  const txResult = await deployer.tx.default({ salt: generateRandomHex() }).signAndSend(signer).untilFinalized();

  return await txResult.contract();
};

export const deployInkv5Psp22 = async (
  signer: KeyringPair,
  totalSupply: bigint = 1000000000000n,
): Promise<Contract<Inkv5Psp22Api>> => {
  const deployer = new ContractDeployer<Inkv5Psp22Api>(
    contractsClient,
    inkv5Psp22Metadata,
    inkv5Psp22Metadata.source.wasm!,
    { defaultCaller: signer.address },
  );

  const txResult = await deployer.tx
    .new(totalSupply, 'Test Token', 'TST', 18, { salt: generateRandomHex() })
    .signAndSend(signer)
    .untilFinalized();

  return await txResult.contract();
};

// inkv6 deployment helpers
export const deployInkv6Flipper = async (signer: KeyringPair): Promise<Contract<Inkv6FlipperApi>> => {
  const deployer = new ContractDeployer<Inkv6FlipperApi>(
    reviveClient,
    inkv6FlipperMetadata,
    inkv6FlipperMetadata.source.contract_binary!,
    { defaultCaller: signer.address },
  );

  const txResult = await deployer.tx.new(true, { salt: generateRandomHex() }).signAndSend(signer).untilFinalized();

  return await txResult.contract();
};

export const deployInkv6Erc20 = async (
  signer: KeyringPair,
  initialSupply: bigint = 1_000_000n * 10n ** 18n,
): Promise<Contract<Inkv6Erc20Api>> => {
  const deployer = new ContractDeployer<Inkv6Erc20Api>(
    reviveClient,
    inkv6Erc20Metadata,
    inkv6Erc20Metadata.source.contract_binary!,
    { defaultCaller: signer.address },
  );

  const txResult = await deployer.tx
    .new(initialSupply, { salt: generateRandomHex() })
    .signAndSend(signer)
    .untilFinalized();

  return await txResult.contract();
};

export const deployInkv6Psp22 = async (
  signer: KeyringPair,
  totalSupply: bigint = 1_000_000_000_000n,
): Promise<Contract<Psp22v6ContractApi>> => {
  const deployer = new ContractDeployer<Psp22v6ContractApi>(
    reviveClient,
    inkv6Psp22Metadata,
    inkv6Psp22Metadata.source.contract_binary!,
    { defaultCaller: signer.address },
  );

  const txResult = await deployer.tx
    .new(totalSupply, 'Storage Test Token', 'STT', 9, { salt: generateRandomHex() })
    .signAndSend(signer)
    .untilFinalized();

  return await txResult.contract();
};

// sol deployment helpers
export const deploySolFlipper = async (signer: KeyringPair): Promise<Contract<SolFlipperApi>> => {
  const [code, abi] = solFlipper();
  const deployer = new ContractDeployer<SolFlipperApi>(reviveClient, abi, code, {
    defaultCaller: signer.address,
  });

  const txResult = await deployer.tx.new(true).signAndSend(signer).untilFinalized();

  return await txResult.contract();
};

export const deploySolPsp22 = async (
  signer: KeyringPair,
  initialSupply: bigint = 1000000000n,
): Promise<Contract<SolPsp22Api>> => {
  const [code, abi] = solPsp22();
  const deployer = new ContractDeployer<SolPsp22Api>(reviveClient, abi, code, {
    defaultCaller: signer.address,
  });

  const txResult = await deployer.tx
    .new(initialSupply, [true, 'Test Coin'], [true, 'TC'], 5)
    .signAndSend(signer)
    .untilFinalized();

  return await txResult.contract();
};

export const deploySolStorage = async (signer: KeyringPair): Promise<Contract<SolStorageApi>> => {
  const [code, abi] = solStorage();
  const deployer = new ContractDeployer<SolStorageApi>(reviveClient, abi, code, {
    defaultCaller: signer.address,
  });

  const txResult = await deployer.tx.new().signAndSend(signer).untilFinalized();

  return await txResult.contract();
};

export const deploySolBallot = async (
  signer: KeyringPair,
  proposalNames: any[],
): Promise<Contract<BallotContractApi>> => {
  const [code, abi] = ballot();
  const deployer = new ContractDeployer<BallotContractApi>(reviveClient, abi, code, {
    defaultCaller: signer.address,
  });

  const txResult = await deployer.tx.new(proposalNames).signAndSend(signer).untilFinalized();

  return await txResult.contract();
};

export const deploySolErc20 = async (
  signer: KeyringPair,
  initialSupply: bigint = 1000000n,
): Promise<Contract<SolErc20Api>> => {
  const [code, abi] = solErc20();
  const deployer = new ContractDeployer<SolErc20Api>(reviveClient, abi, code, {
    defaultCaller: signer.address,
  });

  const txResult = await deployer.tx.new(initialSupply).signAndSend(signer).untilFinalized();

  return await txResult.contract();
};
