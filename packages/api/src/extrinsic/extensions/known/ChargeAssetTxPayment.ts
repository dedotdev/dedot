import { SignerPayloadJSON } from '@dedot/types';
import { assert, bnToHex, HexString, hexToBn, u8aToHex } from '@dedot/utils';
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

  async fromPayload(payload: SignerPayloadJSON): Promise<void> {
    const { tip, assetId } = payload;

    this.data = {
      tip: hexToBn(tip) || 0n,
      assetId: this.#decodeAssetId(assetId),
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

  #decodeAssetId(assetId?: HexString): number | object | undefined {
    // @ts-ignore
    if (assetId === null || assetId === undefined || assetId === '' || assetId === '0x') {
      return undefined;
    }

    return this.$AssetId().tryDecode(assetId);
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
