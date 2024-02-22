import { CodecRegistry } from '@delightfuldot/codecs';
import { HexString } from '@delightfuldot/utils';
import { u8aToHex } from '@polkadot/util';

export interface ExtrinsicSignatureV4<Address = any, Signature = any, Extra = any> {
  address: Address;
  signature: Signature;
  extra: Extra;
}

export class ExtrinsicV4<Address = any, Call = any, Signature = any, Extra = any> {
  readonly #version: number;
  readonly #call: Call;
  #signature?: ExtrinsicSignatureV4<Address, Signature, Extra>;

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

  get callRaw(): HexString {
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
