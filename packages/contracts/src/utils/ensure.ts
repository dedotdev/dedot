import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { accountId32ToHex } from '@dedot/codecs';
import { RpcVersion } from '@dedot/types';
import {
  assert,
  DedotError,
  ensurePresence,
  HexString,
  hexToU8a,
  isEvmAddress,
  isPvm,
  isWasm,
  toHex,
} from '@dedot/utils';
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

export function ensureValidContractAddress(address: ContractAddress, registry: TypinkRegistry) {
  if (registry.isRevive()) {
    assert(
      isEvmAddress(address as HexString),
      `Invalid pallet-revive contract address: ${address}: expected a 20-byte address as a hex string or a Uint8Array`,
    );
  } else {
    assert(
      hexToU8a(accountId32ToHex(address)).length === 32,
      `Invalid pallet-contracts contract address: ${address}. expected a 32-byte address as a hex string or a Uint8Array`,
    );
  }
}

export function ensureValidCodeHashOrCode(codeHashOrCode: HexString | Uint8Array, registry: TypinkRegistry) {
  assert(
    toHex(codeHashOrCode).length === 66 || (registry.isRevive() ? isPvm(codeHashOrCode) : isWasm(codeHashOrCode)),
    'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
  );
}
