import { SignedExtension } from '../SignedExtension';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { bnToHex, u8aToHex } from '@polkadot/util';
import { assert, ensurePresence } from '@delightfuldot/utils';

/**
 * @name ChargeAssetTxPayment
 */
export class ChargeAssetTxPayment extends SignedExtension<{ tip: bigint; assetId?: number | object }> {
  async init(): Promise<void> {
    this.data = {
      tip: this.payloadOptions.tip || 0n,
      assetId: this.payloadOptions.assetId,
    };
  }

  toPayload(): Partial<SignerPayloadJSON> {
    const { tip, assetId } = this.data;

    return {
      tip: bnToHex(tip, { isLe: false }),
      // @ts-ignore
      assetId: this.#encodeAssetId(assetId),
    };
  }

  #encodeAssetId(assetId?: number | object) {
    if (assetId === null || assetId === undefined || typeof assetId === 'number') {
      return assetId;
    }

    if (typeof assetId === 'object') {
      return u8aToHex(this.$AssetId().tryEncode(assetId));
    }

    return assetId;
  }

  $AssetId() {
    const extensionTypeDef = this.registry.findPortableType(this.signedExtensionDef.typeId);
    assert(extensionTypeDef.type.tag === 'Struct');

    const assetIdTypeDef = extensionTypeDef.type.value.fields.find((f) => f.name === 'asset_id');

    return this.registry.findPortableCodec(ensurePresence(assetIdTypeDef).typeId);
  }
}
