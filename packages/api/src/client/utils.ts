import { $Header, BlockHash, Header, Metadata } from '@dedot/codecs';
import { blake2_256, HashFn, keccak_256, u8aToHex } from '@dedot/utils';

const HASHERS: Record<string, HashFn> = {
  BlakeTwo256: blake2_256, // commonly used in polkadot-sdk based-chains
  Keccak256: keccak_256, // widely used in EVM-compatible chains, e.g: Hyperbridge
};

/**
 * Detects the hasher from V16 metadata by looking at the System pallet's Hashing associated type
 *
 * @param metadata - The metadata to inspect
 * @returns The detected HashFn or undefined if detection fails
 */
export function detectHasherFromMetadata(metadata: Metadata): HashFn | undefined {
  try {
    const latest = metadata.latest;

    // Find the System pallet
    const systemPallet = latest.pallets.find((p) => p.name === 'System');
    if (!systemPallet) return undefined;

    // Find the Hashing associated type
    const hashingType = systemPallet.associatedTypes.find((t) => t.name === 'Hashing');
    if (!hashingType) return undefined;

    // Get the type definition
    const typeDef = latest.types[hashingType.typeId];
    if (!typeDef) return undefined;

    // Get the hasher name from the type path (last element)
    const hasherName = typeDef.path.at(-1);
    if (!hasherName) return undefined;

    return HASHERS[hasherName];
  } catch {}

  return undefined;
}

/**
 * Detects the hasher by trying different hash functions on a block header
 * and comparing the result with the expected block hash
 *
 * @param header - The block header to hash
 * @param expectedHash - The expected block hash
 * @returns The matching HashFn or undefined if no match is found
 */
export function detectHasherFromHeader(header: Header, expectedHash: BlockHash): HashFn | undefined {
  try {
    const encodedHeader = $Header.tryEncode(header);

    return Object.values(HASHERS).find((h) => u8aToHex(h(encodedHeader)) === expectedHash);
  } catch {}

  return undefined;
}
