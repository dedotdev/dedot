import { SignedExtension } from '../SignedExtension';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { bnToHex } from '@dedot/utils';

export class ChargeTransactionPayment extends SignedExtension<bigint> {
  async init(): Promise<void> {
    this.data = this.payloadOptions.tip || 0n;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      tip: bnToHex(this.data),
    };
  }
}
