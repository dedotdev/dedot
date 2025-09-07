import * as $ from '@dedot/shape';
import { assert, DedotError, ensurePresence } from '@dedot/utils';
import type { PortableRegistry } from '../registry/PortableRegistry.js';
import { GenericSubstrateApi } from '../types/index.js';
import {
  $ExtrinsicVersion,
  EXTRINSIC_FORMAT_VERSION_V5,
  ExtrinsicType,
  EXTRINSIC_FORMAT_VERSION_V4,
} from './ExtrinsicVersion.js';
import {
  GenericExtrinsic,
  ExtrinsicSignatureV4,
  Preamble,
  PreambleV4Bare,
  PreambleV4Signed,
  PreambleV5Bare,
  PreambleV5General,
} from './GenericExtrinsic.js';

export class Extrinsic<A = any, C = any, S = any, E = any> extends GenericExtrinsic<A, C, S, E> {}
export interface ExtrinsicSignature<A = any, S = any, E = any> extends ExtrinsicSignatureV4<A, S, E> {}
export const DEFAULT_EXTRINSIC_VERSION = 4;

const $ExtrinsicSignature = <ChainApi extends GenericSubstrateApi = GenericSubstrateApi>(
  registry: PortableRegistry<ChainApi>,
): $.Shape<ExtrinsicSignature> => {
  const { addressTypeId, signatureTypeId } = registry.metadata!.extrinsic;

  const $Address = registry.findCodec(addressTypeId) as $.Shape<any>;
  const $Signature = registry.findCodec(signatureTypeId) as $.Shape<any>;
  const $Extra = registry.$Extra() as $.Shape<any>;

  return $.Struct({
    address: $Address,
    signature: $Signature,
    extra: $Extra,
  }) as $.Shape<ExtrinsicSignature>;
};

export const $Extrinsic = <ChainApi extends GenericSubstrateApi = GenericSubstrateApi>(
  registry: PortableRegistry<ChainApi>,
): $.Shape<
  Extrinsic<
    ChainApi['types']['Address'], // --
    ChainApi['types']['RuntimeCall'],
    ChainApi['types']['Signature'],
    ChainApi['types']['Extra']
  >
> => {
  assert(registry, 'PortableRegistry is required to compose $Extrinsic codec');

  const { callTypeId } = registry.metadata!.extrinsic;
  const $RuntimeCall = registry.findCodec(callTypeId) as $.Shape<any>;
  const $Signature = $ExtrinsicSignature<ChainApi>(registry);

  const staticSize =
    $ExtrinsicVersion.staticSize +
    $RuntimeCall.staticSize + // --
    $Signature.staticSize; // TODO adjust this based on extrinsic version

  const $BaseEx = $.createShape<Extrinsic>({
    metadata: [],
    staticSize,
    subDecode(buffer: $.DecodeBuffer) {
      const { version, type } = $ExtrinsicVersion.subDecode(buffer);

      if (version === EXTRINSIC_FORMAT_VERSION_V4) {
        const signature =
          type === ExtrinsicType.Signed // --
            ? $Signature.subDecode(buffer)
            : undefined;

        const call = $RuntimeCall.subDecode(buffer);

        let preamble: Preamble;
        if (type === ExtrinsicType.Signed) {
          preamble = {
            version: EXTRINSIC_FORMAT_VERSION_V4,
            extrinsicType: ExtrinsicType.Signed,
            signature: signature!,
          } as PreambleV4Signed;
        } else {
          preamble = {
            version: EXTRINSIC_FORMAT_VERSION_V4,
            extrinsicType: ExtrinsicType.Bare,
          } as PreambleV4Bare;
        }

        return new Extrinsic(registry, call, preamble);
      } else if (version === EXTRINSIC_FORMAT_VERSION_V5) {
        let versionedExtensions: any = undefined;

        if (type === ExtrinsicType.General) {
          const extensionVersion = $.u8.subDecode(buffer);
          const extra = registry.$Extra(extensionVersion).subDecode(buffer);
          versionedExtensions = { extensionVersion, extra };
        }

        const call = $RuntimeCall.subDecode(buffer);

        // Use strict Preamble structure for explicit control
        let preamble: Preamble;

        if (type === ExtrinsicType.General) {
          preamble = {
            version: EXTRINSIC_FORMAT_VERSION_V5,
            extrinsicType: ExtrinsicType.General,
            versionedExtensions,
          } as PreambleV5General;
        } else {
          preamble = {
            version: EXTRINSIC_FORMAT_VERSION_V5,
            extrinsicType: ExtrinsicType.Bare,
          } as PreambleV5Bare;
        }

        return new Extrinsic(registry, call, preamble);
      }

      throw new DedotError(`Invalid extrinsic format version: ${version}`);
    },
    subEncode(buffer: $.EncodeBuffer, extrinsic: Extrinsic): void {
      const { version, type, signature, call, extensions } = extrinsic;

      if (version === EXTRINSIC_FORMAT_VERSION_V4) {
        $ExtrinsicVersion.subEncode(buffer, { version, type });

        if (type === ExtrinsicType.Signed) {
          assert(signature, 'Signature is required for signed extrinsic!');
          $Signature.subEncode(buffer, signature);
        }
      } else if (version === EXTRINSIC_FORMAT_VERSION_V5) {
        $ExtrinsicVersion.subEncode(buffer, { version, type });

        if (type === ExtrinsicType.General) {
          assert(extensions, 'VersionedExtensions is required for general extrinsic!');
          const extensionVersion = ensurePresence(extensions.extensionVersion, 'extensionVersion is required!');

          $.u8.subEncode(buffer, extensionVersion);
          if (extensions.extra) {
            registry.$Extra(extensionVersion).subEncode(buffer, extensions.extra);
          }
        }
      }

      $RuntimeCall.subEncode(buffer, call);
    },
  });

  return $.withMetadata($.metadata('$Extrinsic'), $.lenPrefixed($BaseEx));
};
