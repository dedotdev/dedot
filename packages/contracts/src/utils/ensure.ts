import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { RpcVersion } from '@dedot/types';
import { assert, DedotError, ensurePresence, HexString } from '@dedot/utils';
import { TypinkRegistry } from 'src/TypinkRegistry';
import { ContractAddress } from 'src/types';

export const ensureStorageApiSupports = (version: string | number) => {
  const numberedVersion = typeof version === 'number' ? version : parseInt(version);

  assert(
    numberedVersion >= 5,
    `Contract Storage Api Only Available for metadata version >= 5, current version: ${version}`,
  );
};

export function ensurePalletPresence(client: ISubstrateClient<SubstrateApi[RpcVersion]>, registry: TypinkRegistry) {
  if (registry.isRevive()) {
    try {
      !!client.call.reviveApi.call.meta && !!client.tx.revive.call.meta;
    } catch {
      throw new DedotError('Pallet Revive is not available');
    }
  } else {
    try {
      !!client.call.contractsApi.call.meta && !!client.tx.contracts.call.meta;
    } catch {
      throw new DedotError('Pallet Contracts is not available');
    }
  }
}

export async function ensureContractPresence(
  client: ISubstrateClient<SubstrateApi[RpcVersion]>,
  registry: TypinkRegistry,
  address: ContractAddress,
) {
  const contractInfo = await (() => {
    if (registry.isRevive()) {
      return client.query.revive.contractInfoOf(address as HexString);
    } else {
      return client.query.contracts.contractInfoOf(address);
    }
  })();

  ensurePresence(contractInfo, `Contract with address ${address} does not exist on chain!`);
}
