import { SignedExtension } from '../SignedExtension';
import { numberToHex, u8aToHex } from '@polkadot/util';
import { SignerPayloadJSON } from '@polkadot/types/types';

/**
 * @description Nonce check and increment to give replay protection for transactions.
 */
export class CheckNonce extends SignedExtension<number> {
  async init(): Promise<void> {
    this.data = this.payloadOptions.nonce || (await this.#getNonce());
  }

  async #getNonce(): Promise<number> {
    try {
      const { nonce } = await this.api.query.system.account(this.options!.signerAddress!);
      // TODO api.rpc.system.accountNextIndex, OR runtime api call
      return nonce;
    } catch (e) {
      // ignore for now, TODO support other way to fetch account current nonce
    }

    return 0;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      nonce: numberToHex(this.data),
    };
  }
}
