import { PortableType, TypeDef } from '@dedot/codecs';
import { stringCamelCase } from '@dedot/utils';
import { ContractMetadata, ContractTypeDef, ReturnFlags } from 'src/types';

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

export const normalizeContractTypeDef = (def: ContractTypeDef): TypeDef => {
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

const KNOWN_LAZY_TYPES = {
  LAZY: ['ink_storage', 'lazy', 'Lazy'].join('::'),
  MAPPING: ['ink_storage', 'lazy', 'mapping', 'Mapping'].join('::'),
  STORAGE_VEC: ['ink_storage', 'lazy', 'vec', 'StorageVec'].join('::'),
};

export enum KnownLazyType {
  LAZY = 'LAZY',
  MAPPING = 'MAPPING',
  STORAGE_VEC = 'STORAGE_VEC',
}

/**
 * Check if a type is lazy/non-packed storage
 *
 * @param typePath
 */
export function isLazyType(typePath?: string | string[] | undefined): KnownLazyType | undefined {
  if (!typePath) return;

  if (Array.isArray(typePath)) {
    typePath = typePath.join('::');
  }

  if (typePath === KNOWN_LAZY_TYPES.LAZY) return KnownLazyType.LAZY;
  if (typePath === KNOWN_LAZY_TYPES.MAPPING) return KnownLazyType.MAPPING;
  if (typePath === KNOWN_LAZY_TYPES.STORAGE_VEC) return KnownLazyType.STORAGE_VEC;
}
