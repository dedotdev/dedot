import * as $ from '@delightfuldot/shape';

export type TypeId = number;
export const $TypeId: $.Shape<TypeId> = $.compactU32;

export type Field = {
  name: string | undefined;
  typeId: TypeId;
  typeName: string | undefined;
  docs: string[];
};

export const $Field: $.Shape<Field> = $.Struct({
  name: $.Option($.str),
  typeId: $TypeId,
  typeName: $.Option($.str),
  docs: $.Vec($.str),
});

export const $PrimitiveKind = $.FlatEnum([
  'bool',
  'char',
  'str',
  'u8',
  'u16',
  'u32',
  'u64',
  'u128',
  'u256',
  'i8',
  'i16',
  'i32',
  'i64',
  'i128',
  'i256',
]);

export const $EnumTypeDef = $.Struct({
  members: $.Vec(
    $.Struct({
      name: $.str,
      fields: $.Vec($Field),
      index: $.u8,
      docs: $.Vec($.str),
    }),
  ),
});

export const $TypeDef = $.Enum({
  Struct: $.Struct({ fields: $.Vec($Field) }),
  Enum: $EnumTypeDef,
  Sequence: $.Struct({ typeParam: $TypeId }),
  SizedVec: $.Struct({ len: $.u32, typeParam: $TypeId }),
  Tuple: $.Struct({ fields: $.Vec($TypeId) }),
  Primitive: $.Struct({ kind: $PrimitiveKind }),
  Compact: $.Struct({ typeParam: $TypeId }),
  BitSequence: $.Struct({ bitOrderType: $TypeId, bitStoreType: $TypeId }),
});

export const $Type = $.Struct({
  id: $.compact($.u32),
  path: $.Vec($.str),
  params: $.Vec($.Struct({ name: $.str, typeId: $.Option($TypeId) })),
  type: $TypeDef,
  docs: $.Vec($.str),
});

export type Type = $.Output<typeof $Type>;
