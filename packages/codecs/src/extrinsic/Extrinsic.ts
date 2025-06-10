import * as $ from '@dedot/shape';
import { assert } from '@dedot/utils';
import type { PortableRegistry } from '../registry/PortableRegistry.js';
import { ExtrinsicV4, ExtrinsicSignatureV4 } from './ExtrinsicV4.js';
import { $ExtrinsicVersion } from './ExtrinsicVersion.js';

// TODO extrinsic versioning
export class Extrinsic<A = any, C = any, S = any, E = any> extends ExtrinsicV4<A, C, S, E> {}
export interface ExtrinsicSignature<A = any, S = any, E = any> extends ExtrinsicSignatureV4<A, S, E> {}
export const DEFAULT_EXTRINSIC_VERSION = 4;

export const $Extrinsic = (registry: PortableRegistry, version = DEFAULT_EXTRINSIC_VERSION) => {
  assert(registry, 'PortableRegistry is required to compose $Extrinsic codec');

  const { callTypeId, addressTypeId, signatureTypeId } = registry.metadata!.extrinsic;

  const $Address = registry.findCodec(addressTypeId) as $.Shape<any>;
  const $Signature = registry.findCodec(signatureTypeId) as $.Shape<any>;
  const $Extra = registry.$Extra(version) as $.Shape<any>;
  const $RuntimeCall = registry.findCodec(callTypeId) as $.Shape<any>;

  const $ExtrinsicSignature: $.Shape<ExtrinsicSignature> = $.Struct({
    address: $Address,
    signature: $Signature,
    extra: $Extra,
  });

  const staticSize = $ExtrinsicVersion.staticSize + $ExtrinsicSignature.staticSize + $RuntimeCall.staticSize;

  const $BaseEx = $.createShape<Extrinsic>({
    metadata: [],
    staticSize,
    subDecode(buffer: $.DecodeBuffer) {
      const { signed } = $ExtrinsicVersion.subDecode(buffer);
      const signature = signed ? $ExtrinsicSignature.subDecode(buffer) : undefined;
      const call = $RuntimeCall.subDecode(buffer);

      return new Extrinsic(registry, call, signature);
    },
    subEncode(buffer: $.EncodeBuffer, extrinsic): void {
      const { version, signed, signature, call } = extrinsic;
      $ExtrinsicVersion.subEncode(buffer, { version, signed });

      if (signed) {
        assert(signature, 'Signature is required!');
        $ExtrinsicSignature.subEncode(buffer, signature);
      }

      $RuntimeCall.subEncode(buffer, call);
    },
  });

  return $.withMetadata($.metadata('$Extrinsic'), $.lenPrefixed($BaseEx));
};
