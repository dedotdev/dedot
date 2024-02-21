import { SignedExtension } from '../SignedExtension';

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
}
