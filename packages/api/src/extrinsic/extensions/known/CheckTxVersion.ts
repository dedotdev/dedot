import { SignerPayloadJSON } from '@polkadot/types/types';
import { numberToHex } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

/**
 * @description Ensure the transaction version registered in the transaction is the same as at present.
 */
export class CheckTxVersion extends SignedExtension<{}, number> {
  async init(): Promise<void> {
    this.additionalSigned = this.api.runtimeVersion.transactionVersion;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      transactionVersion: numberToHex(this.additionalSigned),
    };
  }
}
