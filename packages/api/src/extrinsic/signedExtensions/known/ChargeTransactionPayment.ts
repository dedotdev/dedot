import { SignedExtension } from '../SignedExtension';

export class ChargeTransactionPayment extends SignedExtension<bigint> {
  async init(): Promise<void> {
    this.data = 0n; // leave this as 0 for now as tip
  }

  toPayload() {
    return {
      tip: this.data,
    };
  }
}
