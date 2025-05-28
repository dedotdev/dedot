import { EraLike } from '@dedot/codecs';
import { SignerPayloadJSON } from '@dedot/types';
import { assert, hexToNumber, numberToHex } from '@dedot/utils';
import { SignedExtension } from '../SignedExtension.js';

/**
 * @description Nonce check and increment to give replay protection for transactions.
 */
export class CheckNonce extends SignedExtension<number> {
  async init(): Promise<void> {
    this.data = this.payloadOptions.nonce || (await this.#getNonce());
  }

  async fromPayload(payload: SignerPayloadJSON): Promise<void> {
    const { nonce } = payload;

    this.data = hexToNumber(nonce);
  }

  async #getNonce(): Promise<number> {
    const { signerAddress } = this.options || {};

    assert(signerAddress, 'Signer address not found');

    try {
      return (await this.client.query.system.account(signerAddress)).nonce;
    } catch {}

    try {
      return await this.client.call.accountNonceApi.accountNonce(signerAddress);
    } catch {}

    // TODO fallback to api.rpc.system_accountNextIndex if needed

    return 0;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      nonce: numberToHex(this.data),
    };
  }
}
