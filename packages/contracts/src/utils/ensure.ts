import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { accountId32ToHex, Hash } from '@dedot/codecs';
import { RpcVersion } from '@dedot/types';
import {
  assert,
  assertFalse,
  DedotError,
  ensurePresence,
  HexString,
  hexToU8a,
  isEvmAddress,
  isPvm,
  isWasm,
  toU8a,
} from '@dedot/utils';
import { TypinkRegistry } from 'src/TypinkRegistry';
import { ContractAddress, LooseContractMetadata } from 'src/types';

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
  const contractInfo = await (async () => {
    if (registry.isRevive()) {
      const accountInfo = await client.query.revive.accountInfoOf(address as HexString);
      if (accountInfo?.accountType && accountInfo?.accountType?.type === 'Contract') {
        return accountInfo.accountType.value;
      }
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
      `Invalid contract address: ${address}. Expected an EVM 20-byte address as a hex string or a Uint8Array`,
    );
  } else {
    assert(
      hexToU8a(accountId32ToHex(address)).length === 32,
      `Invalid contract address: ${address}. Expected a Substrate 32-byte address as a hex string or a Uint8Array`,
    );
  }
}

export function ensureValidCodeHashOrCode(codeHashOrCode: Hash | Uint8Array | string, registry: TypinkRegistry) {
  assert(
    toU8a(codeHashOrCode).length === 32 || (registry.isRevive() ? isPvm(codeHashOrCode) : isWasm(codeHashOrCode)),
    'Invalid code hash or code: expected a hash of 32-byte or a valid PVM/WASM code as a hex string or a Uint8Array',
  );
}

const UNSUPPORTED_VERSIONS = ['V3', 'V2', 'V1'];

const SUPPORTED_VERSIONS = [6, 5, '4'];

export function ensureSupportedContractMetadataVersion(metadata: LooseContractMetadata) {
  // This is for V1, V2, V3
  const unsupportedVersion = UNSUPPORTED_VERSIONS.find((o) => metadata[o]);
  if (unsupportedVersion) {
    throw new DedotError(`Unsupported metadata version: ${unsupportedVersion}`);
  }

  // This is for V4, V5, V6
  if (!SUPPORTED_VERSIONS.includes(metadata.version)) {
    throw new DedotError(`Unsupported metadata version: ${metadata.version}`);
  }
}

export function ensureParamsLength(expectedArgsLength: number, actualParamsLength: number) {
  assertFalse(
    actualParamsLength < expectedArgsLength,
    `Expected at least ${expectedArgsLength} arguments, got ${actualParamsLength}`,
  );

  // One extra param for the options
  assertFalse(
    actualParamsLength > expectedArgsLength + 1,
    `Expected at most ${expectedArgsLength + 1} arguments, got ${actualParamsLength}`,
  );
}
