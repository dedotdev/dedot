import { SignedExtension } from '../SignedExtension';
import { EraLike, Hash, Header } from '@delightfuldot/codecs';
import { min } from '@delightfuldot/utils';
import { numberToHex, u8aToHex } from '@polkadot/util';
import { SignerPayloadJSON } from '@polkadot/types/types';

export const MAX_FINALITY_LAG = 5;
export const FALLBACK_MAX_HASH_COUNT = 250;
export const FALLBACK_PERIOD = 6 * 1000;
export const MORTAL_PERIOD = 5 * 60 * 1000;

/**
 * @description Check for transaction mortality.
 */
export class CheckMortality extends SignedExtension<EraLike, Hash> {
  #signingHeader?: Header;
  async init() {
    this.#signingHeader = await this.#determineSigningHeader();
    this.data = { period: this.#calculateMortalLength(), current: BigInt(this.#signingHeader!.number) };
    this.additionalSigned = (await this.api.rpc.chain.getBlockHash(this.#signingHeader!.number))!;
  }

  async #determineSigningHeader(): Promise<Header> {
    const [header, finalizedHash] = await Promise.all([
      this.api.rpc.chain.getHeader(),
      this.api.rpc.chain.getFinalizedHead(),
    ]);

    const [currentHeader, finalizedHeader] = await Promise.all([
      Promise.resolve(header!).then((header) => {
        // TODO check empty parentHash, zero hash
        if (header!.parentHash.length === 0) {
          return header;
        } else {
          return this.api.rpc.chain.getHeader(header!.parentHash);
        }
      }),
      this.api.rpc.chain.getHeader(finalizedHash),
    ]);

    if (!finalizedHeader || currentHeader!.number - finalizedHeader.number > MAX_FINALITY_LAG) {
      return currentHeader as Header;
    }

    return finalizedHeader;
  }

  #calculateMortalLength() {
    return min(
      BigInt(this.api.consts.system.blockHashCount || FALLBACK_MAX_HASH_COUNT),
      BigInt(MORTAL_PERIOD) /
        // BigInt(this.api.consts.babe.expectedBlockTime) ||
        (BigInt(this.api.consts.timestamp.minimumPeriod) * 2n || BigInt(FALLBACK_PERIOD)) +
        BigInt(MAX_FINALITY_LAG),
    );
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {
      era: u8aToHex(this.dataCodec.tryEncode(this.data)),
      blockHash: this.additionalSigned,
      blockNumber: numberToHex(this.#signingHeader!.number),
    };
  }
}
