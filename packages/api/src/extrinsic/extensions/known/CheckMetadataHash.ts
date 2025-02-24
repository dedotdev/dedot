import { Hash } from '@dedot/codecs';
import { SignerPayloadJSON } from '@dedot/types';
import { assert, isHex } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

export type CheckMetadataHashMode = 'Disabled' | 'Enabled';

/**
 * @description Genesis hash check to provide replay protection between different networks.
 */
export class CheckMetadataHash extends SignedExtension<{ mode: CheckMetadataHashMode }, Hash | undefined> {
  async init() {
    let metadataHash = this.payloadOptions.metadataHash;

    if (metadataHash) {
      assert(isHex(metadataHash), 'Metadata hash is not a valid hex string');
      this.data = { mode: 'Enabled' };
      this.additionalSigned = metadataHash;
    } else {
      this.data = { mode: 'Disabled' };
      this.additionalSigned = undefined;
    }
  }

  toPayload(): Partial<SignerPayloadJSON> {
    // Ref: https://github.com/paritytech/polkadot-sdk/blob/8dbe4ee80734bba6644c7e5f879a363ce7c0a19f/substrate/frame/metadata-hash-extension/src/lib.rs#L55-L58
    let enabled = this.data.mode === 'Enabled';
    return {
      mode: enabled ? 1 : 0, // 0 -> disabled, 1 -> enabled
      metadataHash: this.additionalSigned,
    };
  }
}
