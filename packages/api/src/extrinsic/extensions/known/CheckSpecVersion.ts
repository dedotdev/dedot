import { SignerPayloadJSON } from '@dedot/types';
import { hexToNumber, numberToHex } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

/**
 * @description Ensure the runtime version registered in the transaction is the same as at present.
 */
export class CheckSpecVersion extends SignedExtension<{}, number> {
  async init(): Promise<void> {
    this.additionalSigned = this.client.runtimeVersion.specVersion;
  }

  async fromPayload(payload: SignerPayloadJSON): Promise<void> {
    const { specVersion } = payload;

    this.additionalSigned = hexToNumber(specVersion);
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      specVersion: numberToHex(this.additionalSigned),
    };
  }
}
