import { HexString, u8aToHex } from '@dedot/utils';
import { Hash } from '../codecs/generic/index.js';
import { PortableRegistry } from '../registry/PortableRegistry.js';

export interface ExtrinsicSignatureV4<Address = any, Signature = any, Extra = any> {
  address: Address;
  signature: Signature;
  extra: Extra;
}

export class ExtrinsicV4<Address = any, Call = any, Signature = any, Extra = any> {
  readonly #version: number;
  #call: Call;
  #signature?: ExtrinsicSignatureV4<Address, Signature, Extra>;

  constructor(
    public registry: PortableRegistry,
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

  set call(call: any) {
    this.#call = call;
  }

  get callU8a(): Uint8Array {
    const { callTypeId } = this.registry.metadata!.extrinsic;
    const $RuntimeCall = this.registry.findCodec(callTypeId);
    return $RuntimeCall.tryEncode(this.call);
  }

  get callHex(): HexString {
    return u8aToHex(this.callU8a);
  }

  get callLength() {
    return this.callU8a.length;
  }

  attachSignature(signature: ExtrinsicSignatureV4<Address, Signature, Extra>) {
    this.#signature = signature;
  }

  get $Codec() {
    return this.registry.$Extrinsic;
  }

  toU8a(): Uint8Array {
    return this.$Codec.tryEncode(this);
  }

  toHex(): HexString {
    return u8aToHex(this.toU8a());
  }

  get length(): number {
    return this.toU8a().length;
  }

  get hash(): Hash {
    return this.registry.hashAsHex(this.toU8a());
  }
}
