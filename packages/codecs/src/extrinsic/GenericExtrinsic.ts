import { assert, DedotError, HexString, u8aToHex } from '@dedot/utils';
import { Hash } from '../codecs/generic/index.js';
import { PortableRegistry } from '../registry/PortableRegistry.js';
import { EXTRINSIC_FORMAT_VERSION_V4, EXTRINSIC_FORMAT_VERSION_V5, ExtrinsicType } from './ExtrinsicVersion.js';

export interface ExtrinsicSignatureV4<Address = any, Signature = any, Extra = any> {
  address: Address;
  signature: Signature;
  extra: Extra;
}

export interface VersionedExtensions<Extra = any> {
  extensionVersion: number;
  extra: Extra;
}

// V4 specific preambles
export interface PreambleV4Bare {
  version: 4;
  extrinsicType: ExtrinsicType.Bare;
}

export interface PreambleV4Signed<Address = any, Signature = any, Extra = any> {
  version: 4;
  extrinsicType: ExtrinsicType.Signed;
  signature: ExtrinsicSignatureV4<Address, Signature, Extra>;
}

// V5 specific preambles
export interface PreambleV5Bare {
  version: 5;
  extrinsicType: ExtrinsicType.Bare;
}

export interface PreambleV5General<Extra = any> {
  version: 5;
  extrinsicType: ExtrinsicType.General;
  versionedExtensions: VersionedExtensions<Extra>;
}

// Union type for all valid preambles
export type Preamble<Address = any, Signature = any, Extra = any> =
  | PreambleV4Bare
  | PreambleV4Signed<Address, Signature, Extra>
  | PreambleV5Bare
  | PreambleV5General<Extra>;

// Type guard to check if preamble is the new Preamble interface
function isPreamble<Address, Signature, Extra>(preamble: any): preamble is Preamble<Address, Signature, Extra> {
  // Basic validation - return false for invalid structure
  if (!preamble || typeof preamble !== 'object' || Array.isArray(preamble)) {
    return false;
  }

  if (!('version' in preamble) || !('extrinsicType' in preamble)) {
    return false;
  }

  const { version, extrinsicType } = preamble;

  // Validate allowed combinations
  if (version === EXTRINSIC_FORMAT_VERSION_V4) {
    assert(extrinsicType !== ExtrinsicType.General, 'Version 4 does not support General extrinsic type');
    return extrinsicType === ExtrinsicType.Bare || extrinsicType === ExtrinsicType.Signed;
  } else if (version === EXTRINSIC_FORMAT_VERSION_V5) {
    assert(extrinsicType !== ExtrinsicType.Signed, 'Version 5 does not support Signed extrinsic type');
    return extrinsicType === ExtrinsicType.Bare || extrinsicType === ExtrinsicType.General;
  }

  return false;
}

export class GenericExtrinsic<Address = any, Call = any, Signature = any, Extra = any> {
  readonly #version: number;
  #extrinsicType: ExtrinsicType;
  #signature?: ExtrinsicSignatureV4<Address, Signature, Extra>;
  #extensions?: VersionedExtensions<Extra>;

  constructor(
    public registry: PortableRegistry<any>,
    public call: Call,
    preamble?: ExtrinsicSignatureV4<Address, Signature, Extra> | Preamble<Address, Signature, Extra>,
  ) {
    if (isPreamble(preamble)) {
      // Use explicit version and type from strict Preamble
      this.#version = preamble.version;
      this.#extrinsicType = preamble.extrinsicType;

      // Type narrowing based on version and extrinsicType
      if (preamble.version === EXTRINSIC_FORMAT_VERSION_V4 && preamble.extrinsicType === ExtrinsicType.Signed) {
        this.#signature = (preamble as PreambleV4Signed<Address, Signature, Extra>).signature;
      } else if (preamble.version === EXTRINSIC_FORMAT_VERSION_V5 && preamble.extrinsicType === ExtrinsicType.General) {
        this.#extensions = (preamble as PreambleV5General<Extra>).versionedExtensions;
      }
      // For bare types (v4 or v5), no additional data needed
    } else if (preamble) {
      // Legacy ExtrinsicSignatureV4 - default to v4 signed
      this.#version = 4;
      this.#extrinsicType = ExtrinsicType.Signed;
      this.#signature = preamble;
    } else {
      // No preamble - default to v4 bare
      this.#version = 4;
      this.#extrinsicType = ExtrinsicType.Bare;
    }
  }

  get signed() {
    return this.#extrinsicType === ExtrinsicType.Signed;
  }

  get type() {
    return this.#extrinsicType;
  }

  get version() {
    return this.#version;
  }

  get signature() {
    return this.#signature;
  }

  get extensions() {
    return this.#extensions;
  }

  get preamble(): Preamble<Address, Signature, Extra> {
    if (this.version === EXTRINSIC_FORMAT_VERSION_V4) {
      if (this.signed && this.signature) {
        return {
          version: EXTRINSIC_FORMAT_VERSION_V4,
          extrinsicType: ExtrinsicType.Signed,
          signature: this.signature,
        };
      } else {
        return {
          version: EXTRINSIC_FORMAT_VERSION_V4,
          extrinsicType: ExtrinsicType.Bare,
        };
      }
    } else if (this.version === EXTRINSIC_FORMAT_VERSION_V5) {
      return {
        version: EXTRINSIC_FORMAT_VERSION_V5,
        extrinsicType: ExtrinsicType.General,
        versionedExtensions: this.extensions!,
      };
    }

    throw new DedotError('Invalid extrinsic version');
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
    if (this.version === EXTRINSIC_FORMAT_VERSION_V4) {
      this.#extrinsicType = ExtrinsicType.Signed;
      this.#signature = signature;
      return;
    }

    throw new DedotError(`Signature not supported for extrinsic version: ${this.version}`);
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
