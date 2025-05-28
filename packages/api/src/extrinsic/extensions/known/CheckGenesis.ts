import { Hash } from '@dedot/codecs';
import { SignerPayloadJSON } from '@dedot/types';
import { ensurePresence } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

/**
 * @description Genesis hash check to provide replay protection between different networks.
 */
export class CheckGenesis extends SignedExtension<{}, Hash> {
  async init() {
    this.additionalSigned = ensurePresence(this.client.genesisHash);
  }

  async fromPayload(payload: SignerPayloadJSON): Promise<void> {
    this.additionalSigned = ensurePresence(payload.genesisHash, 'Genesis hash not found in the payload');
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      genesisHash: this.additionalSigned,
    };
  }
}
