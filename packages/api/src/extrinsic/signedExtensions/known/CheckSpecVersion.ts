import { SignedExtension } from '../SignedExtension';

/**
 * @description Ensure the runtime version registered in the transaction is the same as at present.
 */
export class CheckSpecVersion extends SignedExtension<null, number> {
  async init(): Promise<void> {
    this.additionalSigned = this.api.runtimeVersion.specVersion;
  }

  toPayload() {
    return {
      specVersion: this.additionalSigned,
    };
  }
}
