import { hexToU8a, isBoolean, isHex, isNumber, isString } from '@dedot/utils';
import {
  AnyShape,
  bool,
  Decoder,
  Encoder,
  i128,
  i16,
  i256,
  i32,
  i64,
  i8,
  Predicate,
  Shape,
  ShapeMap,
  ShapeSet,
  str,
  u128,
  u16,
  u256,
  u32,
  u64,
  u8,
} from 'deshape';

declare module 'deshape' {
  export interface Decoder<T extends AnyShape = Shape<any>, I = any, O = any> {
    (shape: T, input: I): O;
  }

  export interface Encoder<T extends AnyShape = Shape<any>, I = any> {
    (shape: T, input: I): Uint8Array;
  }

  export interface Predicate<I = any> {
    (input: I): boolean;
  }

  interface Shape<in I, out O = I> {
    encoders: [Predicate, Encoder][];
    decoders: [Predicate, Decoder][];
    registerEncoder: (predicate: Predicate, encoder: Encoder) => void;
    registerDecoder: (predicate: Predicate, decoder: Decoder) => void;
    tryEncode: (input: any) => Uint8Array;
    tryDecode: (input: any) => O;
    // Native JS/TS type for codec.
    // This is useful when we want to quickly find an equivalent native type for a codec.
    nativeType?: string;
  }

  export interface ShapeMap<K, V> {
    toJSON(): Record<string, any>;
  }

  export interface ShapeSet<T> {
    toJSON(): Record<string, any>;
  }
}

Shape.prototype.tryDecode = function (input: any) {
  if (this.decoders && this.decoders.length > 0) {
    for (const one of this.decoders.reverse()) {
      const [predicate, decoder] = one as [Predicate, Decoder];

      if (predicate(input)) {
        return decoder.call(this, this, input);
      }
    }
  }

  if (isHex(input)) {
    input = hexToU8a(input);
  }

  return this.decode(input);
};

Shape.prototype.registerDecoder = function (predicate: Predicate, decoder: Decoder) {
  this.decoders = this.decoders || [];
  this.decoders.push([predicate, decoder]);
};

Shape.prototype.tryEncode = function (input: any): Uint8Array {
  if (this.encoders && this.encoders.length > 0) {
    for (const one of this.encoders.reverse()) {
      const [predicate, encoder] = one as [Predicate, Encoder];

      if (predicate(input)) {
        return encoder.call(this, this, input);
      }
    }
  }

  return this.encode(input);
};

Shape.prototype.registerEncoder = function (predicate: Predicate, encoder: Encoder) {
  this.encoders = this.encoders || [];
  this.encoders.push([predicate, encoder]);
};

ShapeMap.prototype.toJSON = function () {
  return Object.fromEntries(this);
};

ShapeSet.prototype.toJSON = function () {
  return Array.from(this);
};

// Register decoder from plain values, TODO support more!
const identity = (_: Shape<any>, input: any) => input;
bool.registerDecoder(isBoolean, identity);
i128.registerDecoder(isNumber, identity);
i16.registerDecoder(isNumber, identity);
i256.registerDecoder(isNumber, identity);
i32.registerDecoder(isNumber, identity);
i64.registerDecoder(isNumber, identity);
i8.registerDecoder(isNumber, identity);
u128.registerDecoder(isNumber, identity);
u16.registerDecoder(isNumber, identity);
u256.registerDecoder(isNumber, identity);
u32.registerDecoder(isNumber, identity);
u64.registerDecoder(isNumber, identity);
u8.registerDecoder(isNumber, identity);
str.registerDecoder((input) => isString(input) && !isHex(input), identity);

// Register native types for primitive codecs.
bool.nativeType = 'boolean';
i256.nativeType = 'bigint';
i128.nativeType = 'bigint';
i64.nativeType = 'bigint';
i32.nativeType = 'number';
i16.nativeType = 'number';
i8.nativeType = 'number';
u256.nativeType = 'bigint';
u128.nativeType = 'bigint';
u64.nativeType = 'bigint';
u32.nativeType = 'number';
u16.nativeType = 'number';
u8.nativeType = 'number';
str.nativeType = 'string';

export * from 'deshape';
