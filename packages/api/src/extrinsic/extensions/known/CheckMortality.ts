import { SignedExtension } from '../SignedExtension.js';
import { $Header, BlockHash, EraLike, Hash, Header } from '@dedot/codecs';
import { assert, bnMin, isZeroHex, numberToHex, u8aToHex } from '@dedot/utils';
import { SignerPayloadJSON } from '@polkadot/types/types';
import { DedotClient } from '../../../client/index.js';

export const MAX_FINALITY_LAG: number = 5;
export const FALLBACK_MAX_HASH_COUNT: number = 250;
export const FALLBACK_PERIOD: number = 6 * 1000;
export const MORTAL_PERIOD: number = 5 * 60 * 1000;

export interface SigningHeader {
  hash: BlockHash;
  number: number;
}

/**
 * @description Check for transaction mortality.
 */
export class CheckMortality extends SignedExtension<EraLike, Hash> {
  #signingHeader!: SigningHeader;

  async init() {
    this.#signingHeader = await this.#getSigningHeader();
    this.data = { period: this.#calculateMortalLength(), current: BigInt(this.#signingHeader.number) };
    this.additionalSigned = this.#signingHeader.hash;
  }

  async #getSigningHeader() {
    if (this.api.rpcVersion === 'v2') {
      return this.#getSigningHeaderRpcV2();
    }

    return this.#getSigningHeaderViaLegacyRpc();
  }

  async #getSigningHeaderRpcV2(): Promise<SigningHeader> {
    const api = this.api as DedotClient;
    const hash = api.chainHead.finalizedHash;
    const { number } = $Header.tryDecode(await api.chainHead.header(hash));

    return { hash, number };
  }

  // Ref: https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/api-derive/src/tx/signingInfo.ts#L34-L64
  async #getSigningHeaderViaLegacyRpc(): Promise<SigningHeader> {
    const [header, finalizedHash] = await Promise.all([
      this.api.rpc.chain_getHeader(),
      this.api.rpc.chain_getFinalizedHead(),
    ]);

    assert(header, 'Current header not found');

    const [currentHeader, finalizedHeader] = await Promise.all([
      Promise.resolve(header).then((header) => {
        const { parentHash } = header;
        if (parentHash.length === 0 || isZeroHex(parentHash)) {
          return header;
        } else {
          return this.api.rpc.chain_getHeader(parentHash);
        }
      }),
      this.api.rpc.chain_getHeader(finalizedHash),
    ]);

    assert(currentHeader, 'Cannot determine current header');

    if (!finalizedHeader || currentHeader.number - finalizedHeader.number > MAX_FINALITY_LAG) {
      return this.#toSigningHeader(currentHeader);
    }

    return this.#toSigningHeader(finalizedHeader);
  }

  async #toSigningHeader(header: Header): Promise<SigningHeader> {
    const { number } = header;
    const hash = (await this.api.rpc.chain_getBlockHash(header.number))!;

    return { hash, number };
  }

  // Ref: https://github.com/polkadot-js/api/blob/3bdf49b0428a62f16b3222b9a31bfefa43c1ca55/packages/api-derive/src/tx/signingInfo.ts#L83-L93
  #calculateMortalLength() {
    return bnMin(
      BigInt(this.#getConst<number>('system', 'blockHashCount') || FALLBACK_MAX_HASH_COUNT),
      BigInt(MORTAL_PERIOD) /
        BigInt(
          this.#getConst<bigint>('babe', 'expectedBlockTime') ||
            BigInt(this.#getConst<bigint>('timestamp', 'minimumPeriod') || 0) * 2n ||
            FALLBACK_PERIOD,
        ) +
        BigInt(MAX_FINALITY_LAG),
    );
  }

  #getConst<T>(pallet: string, name: string): T | undefined {
    try {
      return this.api.consts[pallet][name];
    } catch {
      // ignore this on purpose
    }

    return undefined;
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      era: u8aToHex(this.dataCodec.tryEncode(this.data)),
      blockHash: this.additionalSigned,
      blockNumber: numberToHex(this.#signingHeader.number),
    };
  }
}
