import { SignedExtension } from '../SignedExtension';
import { bnToHex } from '@polkadot/util';
import { SignerPayloadJSON } from '@polkadot/types/types';

export class ChargeTransactionPayment extends SignedExtension<bigint> {
  async init(): Promise<void> {
    this.data = this.payloadOptions.tip || 0n;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      tip: bnToHex(this.data, { isLe: false }),
    };
  }
}
