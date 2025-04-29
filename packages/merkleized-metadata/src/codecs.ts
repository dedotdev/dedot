import * as $ from '@dedot/shape';

export const $TypeRef = $.Enum({
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
  compactU8: null,
  compactU16: null,
  compactU32: null,
  compactU64: null,
  compactU128: null,
  compactU256: null,
  void: null,
  perId: $.compactU32,
});

export type TypeRef = $.Input<typeof $TypeRef>;
