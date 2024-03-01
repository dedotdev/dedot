import { CodecRegistry } from '../../registry';
import * as $ from '@dedot/shape';
import { assert } from '@dedot/utils';
import { $ExtrinsicVersion } from './ExtrinsicVersion';
import { ExtrinsicV4, ExtrinsicSignatureV4 } from './ExtrinsicV4';

// TODO extrinsic versioning
export class Extrinsic<A = any, C = any, S = any, E = any> extends ExtrinsicV4<A, C, S, E> {}
export interface ExtrinsicSignature<A = any, S = any, E = any> extends ExtrinsicSignatureV4<A, S, E> {}

export const $Extrinsic = $.deferred((registry?: CodecRegistry) => {
  assert(registry, 'CodecRegistry is required to compose $Extrinsic codec');

  const { callTypeId, addressTypeId, signatureTypeId, extraTypeId } = registry.metadata!.extrinsic;

  const $Address = registry.findPortableCodec(addressTypeId) as $.Shape<any>;
  const $Signature = registry.findPortableCodec(signatureTypeId) as $.Shape<any>;
  const $Extra = registry.findPortableCodec(extraTypeId) as $.Shape<any>;
  const $RuntimeCall = registry.findPortableCodec(callTypeId) as $.Shape<any>;

  const $ExtrinsicSignature: $.Shape<ExtrinsicSignature> = $.Struct({
    address: $Address,
    signature: $Signature,
    extra: $Extra,
  });

  const staticSize = $ExtrinsicVersion.staticSize + $ExtrinsicSignature.staticSize + $RuntimeCall.staticSize;

  const $BaseEx = $.createShape<Extrinsic>({
    metadata: $.metadata('$Extrinsic'),
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

  return $.lenPrefixed($BaseEx);
});
