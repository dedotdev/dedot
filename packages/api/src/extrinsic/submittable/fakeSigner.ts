import type { Signer, SignerResult } from '@polkadot/types/types';
import { u8aToHex } from '@dedot/utils';

const FAKE_SIGNATURE = new Uint8Array(64 * 8).fill(0);

export const fakeSigner = {
  signPayload: async (): Promise<SignerResult> => {
    return {
      id: Date.now(),
      signature: u8aToHex(FAKE_SIGNATURE),
    };
  },
} as Signer;
