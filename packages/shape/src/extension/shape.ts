import { AnyShape, Decoder, Encoder, Predicate, Shape } from 'subshape';
import { hexFixLength, hexToU8a, isHex } from "@polkadot/util";

declare module 'subshape' {
  export interface Decoder<T extends AnyShape = Shape<any>, I = any, O = I> {
    (shape: T, input: I): O
  }

  export type Encoder = Decoder;

  export interface Predicate<I = any> {
    (input: I): boolean;
  }

  interface Shape<in I, out O = I> {
    encoders: [Predicate, Encoder][];
    decoders: [Predicate, Decoder][];
    registerEncoder: (predicate: Predicate, encoder: Encoder) => void;
    registerDecoder: (predicate: Predicate, decoder: Decoder) => void;
    tryEncode: (input: any) => any;
    tryDecode: (input: any) => any;
  }
}

Shape.prototype.tryDecode = function (input: any) {
  try {
    // console.log('this.decoders', this.decoders);
    if (this.decoders && this.decoders.length > 0) {
      for (const one of this.decoders.reverse()) {
        const [predicate, decoder] = one as [Predicate, Decoder];

        if (predicate(input)) {
          return decoder.call(this, this, input);
        }
      }
    }
  } catch (e) {
    console.error(e);
    // ignore this, fall back to default encoder
  }


  // console.log('isHex(input)', isHex(input), input);
  if (isHex(input, -1, true)) {
    input = hexToU8a(hexFixLength(input));
  }

  return this.decode(input);
}

Shape.prototype.registerDecoder = function (predicate: Predicate, decoder: Decoder) {
  this.decoders = this.decoders || [];
  this.decoders.push([predicate, decoder])
}

Shape.prototype.tryEncode = function (input: any) {
  try {
    console.log('this.encoders', this.encoders);
    if (this.encoders && this.encoders.length > 0) {
      for (const one of this.encoders.reverse()) {
        const [predicate, encoder] = one as [Predicate, Encoder];

        if (predicate(input)) {
          // TODO check if the out is correct
          return encoder.call(this, this, input);
        }
      }
    }
  } catch (e) {
    console.error(e);
    // ignore this, fall back to default encoder
  }

  return this.encode(input);
}

Shape.prototype.registerEncoder = function (predicate: Predicate, encoder: Encoder) {
  this.encoders = this.encoders || [];
  this.encoders.push([predicate, encoder])
}
