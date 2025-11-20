import { $Header, BlockHash, Header, Metadata } from '@dedot/codecs';
import { blake2_256, HashFn, HexString, keccak_256, u8aToHex } from '@dedot/utils';

/**
 * List of supported hashers for detection
 */
export const SUPPORTED_HASHERS: HashFn[] = [blake2_256, keccak_256];

/**
 * Maps a hasher name from metadata to a HashFn
 *
 * @param hasherName - The hasher name from metadata (e.g., 'BlakeTwo256', 'Keccak256')
 * @returns The corresponding HashFn or undefined if not supported
 */
export function mapHasherNameToFn(hasherName: string): HashFn | undefined {
  switch (hasherName) {
    case 'BlakeTwo256':
      return blake2_256;
    case 'Keccak256':
      return keccak_256;
    default:
      return undefined;
  }
}

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

    return mapHasherNameToFn(hasherName);
  } catch {
    return undefined;
  }
}

/**
 * Detects the hasher by trying different hash functions on a block header
 * and comparing the result with the expected block hash
 *
 * @param header - The block header to hash
 * @param expectedHash - The expected block hash
 * @param hashers - List of hashers to try (defaults to SUPPORTED_HASHERS)
 * @returns The matching HashFn or undefined if no match is found
 */
export function detectHasherFromBlockHeader(
  header: Header,
  expectedHash: BlockHash,
  hashers: HashFn[] = SUPPORTED_HASHERS,
): HashFn | undefined {
  try {
    // Encode the header
    const encodedHeader = $Header.tryEncode(header);

    // Try each hasher
    for (const hasher of hashers) {
      const calculatedHash = u8aToHex(hasher(encodedHeader));

      if (calculatedHash === expectedHash) {
        return hasher;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export interface HeaderWithHash {
  header: Header;
  hash: HexString;
}
