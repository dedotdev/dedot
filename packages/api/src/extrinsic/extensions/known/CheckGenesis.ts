import { SignedExtension } from '../SignedExtension';
import { Hash } from '@delightfuldot/codecs';
import { SignerPayloadJSON } from '@polkadot/types/types';

/**
 * @description Genesis hash check to provide replay protection between different networks.
 */
export class CheckGenesis extends SignedExtension<{}, Hash> {
  async init() {
    this.additionalSigned = this.api.genesisHash;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      genesisHash: this.additionalSigned,
    };
  }
}
