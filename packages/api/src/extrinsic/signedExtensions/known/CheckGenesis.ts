import { SignedExtension } from '../SignedExtension';
import { Hash } from '@delightfuldot/codecs';

/**
 * @description Genesis hash check to provide replay protection between different networks.
 */
export class CheckGenesis extends SignedExtension<null, Hash> {
  async init() {
    this.additionalSigned = this.api.genesisHash;
  }

  toPayload() {
    return {
      genesisHash: this.additionalSigned,
    };
  }
}
