import * as $ from '@delightfuldot/shape';

export type TypeId = number;
export const $TypeId: $.Shape<TypeId> = $.compact($.u32);

export type Field = {
  name: string | undefined,
  typeId: TypeId,
  typeName: string | undefined;
  docs: string[]
}
export const $Field: $.Shape<Field> = $.Struct({
  name: $.Option($.str),
  typeId: $TypeId,
  typeName: $.Option($.str),
  docs: $.Vec($.str),
});

export const $PrimitiveKind = $.Enum({
  bool: null,
  char: null,
  str: null,
  u8: null,
  u16: null,
  u32: null,
  u64: null,
  u128: null,
  u256: null,
  i8: null,
  i16: null,
  i32: null,
  i64: null,
  i128: null,
  i256: null,
});

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
  Vec: $.Struct({ typeParam: $TypeId }),
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
