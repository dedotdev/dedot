import { SignedExtension } from '../SignedExtension';

/**
 * @description Ensure the transaction version registered in the transaction is the same as at present.
 */
export class CheckTxVersion extends SignedExtension<null, number> {
  async init(): Promise<void> {
    this.additionalSigned = this.api.runtimeVersion.transactionVersion;
  }

  toPayload() {
    return {
      transactionVersion: this.additionalSigned,
    };
  }
}
