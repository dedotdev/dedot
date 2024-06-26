import { SignerPayloadJSON } from '@polkadot/types/types';
import { assert, bnToHex, u8aToHex } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

/**
 * @name ChargeAssetTxPayment
 */
export class ChargeAssetTxPayment extends SignedExtension<{ tip: bigint; assetId?: number | object }> {
  async init(): Promise<void> {
    const { tip, assetId } = this.payloadOptions;

    this.data = {
      tip: tip || 0n,
      assetId,
    };
  }

  toPayload(): Partial<SignerPayloadJSON> {
    const { tip, assetId } = this.data;

    return {
      tip: bnToHex(tip),
      // @ts-ignore
      assetId: this.#encodeAssetId(assetId),
    };
  }

  #encodeAssetId(assetId?: number | object) {
    if (assetId === null || assetId === undefined) {
      return undefined;
    }

    return u8aToHex(this.$AssetId().tryEncode(assetId));
  }

  $AssetId() {
    const extensionTypeDef = this.registry.findType(this.signedExtensionDef.typeId);
    assert(extensionTypeDef.typeDef.type === 'Struct');

    const assetIdTypeDef = extensionTypeDef.typeDef.value.fields.find((f) => f.name === 'asset_id')!;
    const $codec = this.registry.findCodec(assetIdTypeDef.typeId);
    const codecMetadata = $codec.metadata[0]!;
    if (codecMetadata.name === '$.option') {
      return codecMetadata.args![0]; // inner shape
    }

    return $codec;
  }
}
