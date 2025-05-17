import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId20, PortableType, TypeDef } from '@dedot/codecs';
import { GenericSubstrateApi, InkContractTypeDef, ReturnFlags, RpcVersion } from '@dedot/types';
import { HexString, hexToU8a, keccakAsU8a, stringCamelCase, toHex, u8aToHex } from '@dedot/utils';
import { BytesLike, encodeRlp } from 'ethers';
import { Executor } from './executor/index.js';
import { ContractMetadata } from './types.js';

export const extractContractTypes = (contractMetadata: ContractMetadata): PortableType[] => {
  const { types } = contractMetadata;

  return types.map(
    ({ type, id }) =>
      ({
        id,
        typeDef: normalizeContractTypeDef(type.def),
        params: [],
        path: type?.path || [],
        docs: [],
      }) as PortableType,
  );
};

export const normalizeContractTypeDef = (def: InkContractTypeDef): TypeDef => {
  let type: string;
  let value: any;

  if (def.variant) {
    type = 'Enum';
    value = {
      members:
        def.variant.variants?.map((variant) => ({
          fields: variant.fields?.map((fields) => ({ typeId: fields.type, typeName: fields.typeName })) || [],
          index: variant.index,
          name: variant.name,
        })) || [],
    };
  } else if (def.tuple) {
    type = 'Tuple';
    value = {
      fields: def.tuple,
    };
  } else if (def.sequence) {
    type = 'Sequence';
    value = {
      typeParam: def.sequence.type,
    };
  } else if (def.composite) {
    type = 'Struct';
    value = {
      fields:
        def.composite.fields?.map((one) => ({
          typeId: one.type,
          name: one.name,
          typeName: one.typeName,
        })) || [],
    };
  } else if (def.primitive) {
    type = 'Primitive';
    value = {
      kind: def.primitive,
    };
  } else if (def.array) {
    type = 'SizedVec';
    value = {
      len: def.array.len,
      typeParam: def.array.type,
    };
  } else if (def.compact) {
    type = 'Compact';
    value = {
      typeParam: def.compact.type,
    };
  } else if (def.bitsequence) {
    type = 'BitSequence';
    value = {
      bitOrderType: def.bitsequence.bit_order_type,
      bitStoreType: def.bitsequence.bit_store_type,
    };
  } else {
    throw Error(`Invalid contract type def: ${JSON.stringify(def)}`);
  }

  return { type, value } as TypeDef;
};

const UNSUPPORTED_VERSIONS = ['V3', 'V2', 'V1'] as const;

const SUPPORTED_VERSIONS = [5, '4'] as const;

export const parseRawMetadata = (rawMetadata: string): ContractMetadata => {
  const metadata = JSON.parse(rawMetadata);

  // This is for V2, V2, V3
  const unsupportedVersion = UNSUPPORTED_VERSIONS.find((o) => metadata[o]);
  if (unsupportedVersion) {
    throw new Error(`Unsupported metadata version: ${unsupportedVersion}`);
  }

  // This is for V4, V5
  if (!SUPPORTED_VERSIONS.includes(metadata.version)) {
    throw new Error(`Unsupported metadata version: ${metadata.version}`);
  }

  return metadata as ContractMetadata;
};

export function newProxyChain<ChainApi extends GenericSubstrateApi>(carrier: Executor<ChainApi>): unknown {
  return new Proxy(carrier, {
    get(target: Executor<ChainApi>, property: string | symbol): any {
      return target.doExecute(property.toString());
    },
  });
}

export function ensureSupportRevivePallet(client: ISubstrateClient<SubstrateApi[RpcVersion]>) {
  try {
    !!client.call.reviveApi.call.meta && !!client.tx.revive.call.meta;
  } catch {
    throw new Error('Contracts pallet is not available');
  }
}

export function normalizeLabel(label?: string): string {
  if (!label) return '';
  return stringCamelCase(label.replaceAll('::', '_'));
}

// https://github.com/paritytech/polkadot-sdk/blob/d2fd53645654d3b8e12cbf735b67b93078d70113/substrate/frame/contracts/uapi/src/flags.rs#L23-L26
const REVERT_FLAG: number = 1;

export function toReturnFlags(bits: number): ReturnFlags {
  return {
    bits,
    revert: bits === REVERT_FLAG,
  };
}

// https://github.com/paritytech/polkadot-sdk/blob/5405e473854b139f1d0735550d90687eaf1a13f9/substrate/frame/revive/src/address.rs#L197-L204
export function create1(deployer: AccountId20, nonce: number): string {
  const encodedData = encodeRlp([deployer.raw, toHex(nonce)]);
  const hash = keccakAsU8a(encodedData);

  return u8aToHex(hash.subarray(12));
}

// https://github.com/paritytech/polkadot-sdk/blob/5405e473854b139f1d0735550d90687eaf1a13f9/substrate/frame/revive/src/address.rs#L206-L219
export function create2(deployer: AccountId20, code: BytesLike, inputData: BytesLike, salt: BytesLike): string {
  const codeBytes = typeof code === 'string' ? hexToU8a(code) : code;
  const inputDataBytes = typeof inputData === 'string' ? hexToU8a(inputData) : inputData;
  const saltBytes = typeof salt === 'string' ? hexToU8a(salt) : salt;

  const initCodeHash = keccakAsU8a(new Uint8Array([...codeBytes, ...inputDataBytes]));

  const bytes = new Uint8Array(1 + (20 + 32 + 32)); // 0xff + deployer + salt + initCodeHash
  bytes[0] = 0xff;
  bytes.set(hexToU8a(deployer.raw), 1);
  bytes.set(saltBytes, 21);
  bytes.set(initCodeHash, 53);

  const hash = keccakAsU8a(bytes);

  return u8aToHex(hash.subarray(12));
}

function isEthDerived(accountId: Uint8Array): boolean {
  if (accountId.length >= 32) {
    return accountId[20] === 0xee && accountId[21] === 0xee;
  }

  return false;
}

// https://github.com/paritytech/polkadot-sdk/blob/5405e473854b139f1d0735550d90687eaf1a13f9/substrate/frame/revive/src/address.rs#L101-L113
export function toEthAddress(accountId: Uint8Array | string): HexString {
  const accountBytes = typeof accountId === 'string' ? hexToU8a(accountId) : accountId;

  const accountBuffer = new Uint8Array(32);
  accountBuffer.set(accountBytes.slice(0, 32));

  if (isEthDerived(accountBytes)) {
    // This was originally an eth address
    // We just strip the 0xEE suffix to get the original address
    return ('0x' + Buffer.from(accountBuffer.slice(0, 20)).toString('hex')) as HexString;
  } else {
    const accountHash = keccakAsU8a(accountBuffer);
    return u8aToHex(accountHash.subarray(12));
  }
}
