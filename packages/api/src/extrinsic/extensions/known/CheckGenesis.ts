import { SignedExtension } from '../SignedExtension.js';
import { Hash } from '@dedot/codecs';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { ensurePresence } from '@dedot/utils';

/**
 * @description Genesis hash check to provide replay protection between different networks.
 */
export class CheckGenesis extends SignedExtension<{}, Hash> {
  async init() {
    this.additionalSigned = ensurePresence(this.api.genesisHash);
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      genesisHash: this.additionalSigned,
    };
  }
}
