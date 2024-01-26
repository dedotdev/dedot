import { SignedExtension } from '../SignedExtension';
import DelightfulApi from 'delightfuldot/DelightfulApi';
import { SignedExtensionDefLatest } from '@delightfuldot/codecs';

/**
 * @description Nonce check and increment to give replay protection for transactions.
 */
export class CheckNonce extends SignedExtension<number> {
  constructor(
    api: DelightfulApi,
    signedExtensionDef: SignedExtensionDefLatest,
    private signerAddress: string,
  ) {
    super(api, signedExtensionDef);
  }

  async init(): Promise<void> {
    this.data = await this.#getNonce();
  }

  async #getNonce(): Promise<number> {
    try {
      const { nonce } = await this.api.query.system.account(this.signerAddress);
      // TODO api.rpc.system.accountNextIndex
      return nonce;
    } catch (e) {
      // ignore for now, TODO support other way to fetch account current nonce
    }

    return 0;
  }

  toPayload() {
    return {
      nonce: this.data,
    };
  }
}
