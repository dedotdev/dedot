import { SignedExtension } from '../SignedExtension.js';
import { numberToHex } from '@dedot/utils';
import { SignerPayloadJSON } from '@polkadot/types/types';

/**
 * @description Ensure the runtime version registered in the transaction is the same as at present.
 */
export class CheckSpecVersion extends SignedExtension<{}, number> {
  async init(): Promise<void> {
    this.additionalSigned = this.api.runtimeVersion!.specVersion;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      specVersion: numberToHex(this.additionalSigned),
    };
  }
}
