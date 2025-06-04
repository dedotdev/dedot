import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ContractDeployer, create1, toEthAddress } from '@dedot/contracts';
import { assert, generateRandomHex, HexString } from '@dedot/utils';
import { FlipperContractApi } from './contracts/flipper';
// @ts-ignore
import * as flipperV5 from './contracts/flipper_v5.json';
// @ts-ignore
import * as flipperV6 from './contracts/flipper_v6.json';

await cryptoWaitReady();
export const KEYRING = new Keyring({ type: 'sr25519' });
export const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
export const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
export const CHARLIE = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

export const flipperV5Metadata = flipperV5;
export const flipperV6Metadata = flipperV6;

export const devPairs = () => {
  const alice = KEYRING.addFromUri('//Alice');
  const bob = KEYRING.addFromUri('//Bob');
  return { alice, bob };
};

export const deployFlipperV5 = async (callerPair: KeyringPair): Promise<HexString> => {
  const deployer = new ContractDeployer<FlipperContractApi>(
    contractsClient, // prettier-end-here
    flipperV5Metadata,
    flipperV5Metadata.source.wasm!,
    {
      defaultCaller: callerPair.address,
    },
  );

  const salt = generateRandomHex();

  const { raw } = await deployer.query.new(true, { salt });

  const { events } = await deployer.tx
    .new(true, { gasLimit: raw.gasRequired, salt })
    .signAndSend(callerPair)
    .untilFinalized();

  const instantiatedEvent = contractsClient.events.contracts.Instantiated.find(events);
  assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

  const contractAddress = instantiatedEvent!.palletEvent.data.contract.raw;
  return contractAddress!;
};

export const deployFlipperV6 = async (callerPair: KeyringPair): Promise<HexString> => {
  const deployer = new ContractDeployer<FlipperContractApi>(
    reviveClient,
    flipperV6Metadata,
    flipperV6Metadata.source.contract_binary!,
    {
      defaultCaller: callerPair.address,
    },
  );

  const { raw } = await deployer.query.new(true);
  const nonce = await reviveClient.call.accountNonceApi.accountNonce(callerPair.address);
  const contractAddress = create1(toEthAddress(callerPair.address), nonce);

  await deployer.tx
    .new(true, { gasLimit: raw.gasRequired, storageDepositLimit: raw.storageDeposit.value })
    .signAndSend(callerPair)
    .untilFinalized();

  console.log('Deployed contract address:', contractAddress);

  return contractAddress;
};
