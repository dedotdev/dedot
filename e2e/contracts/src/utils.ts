import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ContractAddress, ContractDeployer, CREATE1, toEthAddress } from '@dedot/contracts';
import { assert, generateRandomHex } from '@dedot/utils';
import { FlipperContractApi } from './contracts/flipper';
import * as flipperV5 from './contracts/flipper_v5.json';
import * as flipperV6 from './contracts/flipper_v6.json';

await cryptoWaitReady();
export const KEYRING = new Keyring({ type: 'sr25519' });

export const flipperV5Metadata = flipperV5;
export const flipperV6Metadata = flipperV6;

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
    {
      defaultCaller: signer.address,
    },
  );

  const salt = generateRandomHex();

  const { raw } = await deployer.query.new(true, { salt });

  const { events } = await deployer.tx
    .new(true, { gasLimit: raw.gasRequired, salt })
    .signAndSend(signer)
    .untilFinalized();

  const instantiatedEvent = contractsClient.events.contracts.Instantiated.find(events);
  assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

  return instantiatedEvent!.palletEvent.data.contract.address();
};

export const deployFlipperV6 = async (signer: KeyringPair): Promise<ContractAddress> => {
  const deployer = new ContractDeployer<FlipperContractApi>(
    reviveClient,
    flipperV6Metadata,
    flipperV6Metadata.source.contract_binary!,
    {
      defaultCaller: signer.address,
    },
  );

  const { raw } = await deployer.query.new(true);
  const nonce = await reviveClient.call.accountNonceApi.accountNonce(signer.address);
  const contractAddress = CREATE1(toEthAddress(signer.address), nonce);

  await deployer.tx
    .new(true, { gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value })
    .signAndSend(signer)
    .untilFinalized();

  console.log('Deployed contract address:', contractAddress);

  return contractAddress;
};
