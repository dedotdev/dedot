import { SignerPayloadJSON } from '@polkadot/types/types';
import { Hash } from '@dedot/codecs';
import { ensurePresence } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

/**
 * @description Genesis hash check to provide replay protection between different networks.
 */
export class CheckGenesis extends SignedExtension<{}, Hash> {
  async init() {
    this.additionalSigned = ensurePresence(this.client.genesisHash);
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      genesisHash: this.additionalSigned,
    };
  }
}
