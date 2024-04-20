import { PortableType, TypeDef } from '@dedot/codecs';
import { ContractMetadata, Def } from '@dedot/types';

export const extractContractTypes = (contractMetadata: ContractMetadata): PortableType[] => {
  const { types } = contractMetadata;

  return types.map(
    ({ type, id }) =>
      ({
        id,
        type: normalizeContractTypeDef(type.def),
        params: [],
        path: type?.path || [],
        docs: [],
      }) as PortableType,
  );
};

export const normalizeContractTypeDef = (def: Def) => {
  let tag: string;
  let value: any;

  if ('variant' in def) {
    tag = 'Enum';
    value = {
      members:
        def.variant?.variants?.map((variant) => ({
          fields: variant.fields?.map((fields) => ({ typeId: fields.type })) || [],
          index: variant.index,
          name: variant.name,
        })) || [],
    };
  } else if ('tuple' in def) {
    tag = 'Tuple';
    value = {
      fields: def.tuple,
    };
  } else if ('sequence' in def) {
    tag = 'Sequence';
    value = {
      typeParam: def.sequence?.type,
    };
  } else if ('composite' in def) {
    tag = 'Struct';
    value = {
      fields: def.composite?.fields.map((one) => ({
        typeId: one.type,
        name: one.name,
        typeName: one.typeName,
      })),
    };
  } else if ('primitive' in def) {
    tag = 'Primitive';
    value = {
      kind: def.primitive,
    };
  } else if ('array' in def) {
    tag = 'SizedVec';
    value = {
      len: def.array?.len,
      typeParam: def.array?.type,
    };
  } else {
    throw Error('Invalid contract type def');
  }

  return { tag, value } as TypeDef;
};
