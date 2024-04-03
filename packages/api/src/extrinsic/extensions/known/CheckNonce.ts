import { SignedExtension } from '../SignedExtension.js';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { assert, numberToHex } from '@dedot/utils';

/**
 * @description Nonce check and increment to give replay protection for transactions.
 */
export class CheckNonce extends SignedExtension<number> {
  async init(): Promise<void> {
    this.data = this.payloadOptions.nonce || (await this.#getNonce());
  }

  async #getNonce(): Promise<number> {
    const { signerAddress } = this.options || {};

    assert(signerAddress, 'Signer address not found');

    try {
      return (await this.api.query.system.account(signerAddress)).nonce;
    } catch {}

    try {
      return await this.api.call.accountNonceApi.accountNonce(signerAddress);
    } catch {}

    // TODO fallback to api.jsonrpc.system_accountNextIndex if needed

    return 0;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      nonce: numberToHex(this.data),
    };
  }
}
