import { SignerPayloadJSON } from '@dedot/types';
import { bnToHex, hexToBn } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

export class ChargeTransactionPayment extends SignedExtension<bigint> {
  async init(): Promise<void> {
    this.data = this.payloadOptions.tip || 0n;
  }

  async fromPayload(payload: SignerPayloadJSON): Promise<void> {
    const { tip } = payload;

    this.data = hexToBn(tip) || 0n;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      tip: bnToHex(this.data),
    };
  }
}
