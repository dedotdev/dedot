import Keyring from '@polkadot/keyring';
import { ISubstrateClient } from 'dedot';
import { ContractDeployer, ContractMetadata } from 'dedot/contracts';
import { assert } from 'dedot/utils';
import { FlipperContractApi } from './contracts/flipper';

export const deployFlipper = async (api: ISubstrateClient, flipper: ContractMetadata, salt: string) => {
  const alicePair = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  const caller = alicePair.address;

  const wasm = flipper.source.wasm!;
  const deployer = new ContractDeployer<FlipperContractApi>(api, flipper, wasm);

  // Dry-run to estimate gas fee
  const {
    raw: { gasRequired },
  } = await deployer.query.new(true, {
    caller,
    salt,
  });

  const contractAddress: string = await new Promise(async (resolve) => {
    await deployer.tx.new(true, { gasLimit: gasRequired, salt }).signAndSend(alicePair, async ({ status, events }) => {
      console.log(`[${api.rpcVersion}] Transaction status:`, status.type);

      if (status.type === 'Finalized') {
        const instantiatedEvent = events
          .map(({ event }) => event) // prettier-end-here
          .find(api.events.contracts.Instantiated.is); // narrow down the type for type suggestions

        assert(instantiatedEvent, 'Event Contracts.Instantiated should be available');

        const contractAddress = instantiatedEvent.palletEvent.data.contract.address();
        resolve(contractAddress);
      }
    });
  });

  return contractAddress;
};
