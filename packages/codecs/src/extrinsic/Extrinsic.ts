import { CodecRegistry } from '@delightfuldot/codecs';
import * as $ from '@delightfuldot/shape';
import { assert, ensurePresence, HexString } from '@delightfuldot/utils';
import { $ExtrinsicVersion } from './ExtrinsicVersion';
import { u8aToHex } from '@polkadot/util';

export interface ExtrinsicSignatureV4<Address = any, Signature = any, Extra = any> {
  address: Address;
  signature: Signature;
  extra: Extra;
}

export class ExtrinsicV4<Address = any, Call = any, Signature = any, Extra = any> {
  #version: number;
  #signature?: ExtrinsicSignatureV4<Address, Signature, Extra>;
  #call: Call;

  constructor(
    public registry: CodecRegistry,
    call: Call,
    signature?: ExtrinsicSignatureV4<Address, Signature, Extra>,
  ) {
    this.#version = 4;
    this.#call = call;
    this.#signature = signature;
  }

  get signed() {
    return !!this.#signature;
  }

  get version() {
    return this.#version;
  }

  get signature() {
    return this.#signature;
  }

  get call() {
    return this.#call;
  }

  get rawCall(): HexString {
    const { callTypeId } = this.registry.metadata!.extrinsic;
    const $RuntimeCall = this.registry.findPortableCodec(callTypeId);
    return u8aToHex($RuntimeCall.tryEncode(this.call));
  }

  attachSignature(signature: ExtrinsicSignatureV4<Address, Signature, Extra>) {
    this.#signature = signature;
  }

  toJSON() {
    return {
      version: this.version,
      signed: this.signed,
      signature: this.signature,
      call: this.call,
    };
  }
}

// TODO extrinsic versioning
export class Extrinsic<A = any, C = any, S = any, E = any> extends ExtrinsicV4<A, C, S, E> {}

export const $Extrinsic = $.deferred((registry: CodecRegistry) => {
  ensurePresence(registry, 'Registry is missing!'); // TODO polish the message

  const { callTypeId, addressTypeId, signatureTypeId, extraTypeId } = registry.metadata!.extrinsic;

  const $Address = registry.findPortableCodec(addressTypeId) as $.Shape<any>;
  const $Signature = registry.findPortableCodec(signatureTypeId) as $.Shape<any>;
  const $Extra = registry.findPortableCodec(extraTypeId) as $.Shape<any>;
  const $RuntimeCall = registry.findPortableCodec(callTypeId) as $.Shape<any>;

  type Address = $.Input<typeof $Address>;
  type Signature = $.Input<typeof $Signature>;
  type Extra = $.Input<typeof $Extra>;
  type RuntimeCall = $.Input<typeof $RuntimeCall>;

  const $ExtrinsicSignature: $.Shape<ExtrinsicSignatureV4<Address, Signature, Extra>> = $.Struct({
    address: $Address,
    signature: $Signature,
    extra: $Extra,
  });

  const staticSize = $ExtrinsicVersion.staticSize + $ExtrinsicSignature.staticSize + $RuntimeCall.staticSize;

  const $extrinsicInner = $.createShape<Extrinsic<Address, RuntimeCall, Signature, Extra>>({
    metadata: $.metadata('$Extrinsic'), // TODO add factory
    staticSize,
    subDecode(buffer: $.DecodeBuffer) {
      const version = $ExtrinsicVersion.subDecode(buffer);
      const signature = version.signed ? $ExtrinsicSignature.subDecode(buffer) : undefined;
      const call = $RuntimeCall.subDecode(buffer);

      return new Extrinsic(registry, call, signature);
    },
    subEncode(buffer: $.EncodeBuffer, extrinsic): void {
      const { version, signature, call, signed } = extrinsic;
      $ExtrinsicVersion.subEncode(buffer, { version, signed });

      if (signed) {
        assert(signature, 'Signature is required!');
        $ExtrinsicSignature.subEncode(buffer, signature);
      }

      $RuntimeCall.subEncode(buffer, call);
    },
    subAssert(state: $.AssertState): void {
      // TODO to implement
    },
  });

  // return $.withMetadata($.metadata('$Extrinsic', $Extrinsic, registry), $.lenPrefixed($extrinsicInner));
  return $.lenPrefixed($extrinsicInner);
});
