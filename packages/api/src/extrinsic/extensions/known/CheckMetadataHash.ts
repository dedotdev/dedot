import { SignerPayloadJSON } from '@polkadot/types/types';
import { Hash } from '@dedot/codecs';
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
    return {
      // @ts-ignore
      metadataHash: this.payloadOptions.metadataHash,
    };
  }
}
