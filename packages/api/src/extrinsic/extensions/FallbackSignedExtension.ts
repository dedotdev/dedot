import { PortableRegistry } from '@dedot/codecs';
import { SignerPayloadJSON } from '@dedot/types';
import { SignedExtension } from './SignedExtension.js';
import { ISubstrateClient } from '../../types.js';

/**
 * A fallback signed extension that can be used for extensions
 * that don't require external input.
 * 
 * This extension is automatically used for:
 * - Unknown extensions with empty struct or tuple types
 * - Known extensions that don't require input, such as:
 *   - CheckNonZeroSender: Ensures sender is not the zero address
 *   - CheckWeight: Block resource (weight) limit check
 *   - PrevalidateAttests: Validates `attest` calls prior to execution
 *   - StorageWeightReclaim: Storage weight reclaim mechanism
 * 
 * These extensions have empty struct or tuple types and don't need explicit implementation.
 */
export class FallbackSignedExtension extends SignedExtension {
  private readonly extensionIdent: string;

  constructor(
    client: ISubstrateClient,
    options: any,
    extensionIdent: string
  ) {
    super(client, options);
    this.extensionIdent = extensionIdent;
  }

  get identifier(): string {
    return this.extensionIdent;
  }

  async init(): Promise<void> {
    // Initialize with empty data and additionalSigned
    this.data = {};
    this.additionalSigned = [];
  }

  toPayload(): Partial<SignerPayloadJSON> {
    return {}; // No payload contribution
  }
}

/**
 * Checks if a type is an empty struct or tuple (doesn't require external input).
 * 
 * @param registry The portable registry
 * @param typeId The type ID to check
 * @returns True if the type is an empty struct or tuple, false otherwise
 */
export function isEmptyStructOrTuple(registry: PortableRegistry, typeId: number): boolean {
  try {
    const type = registry.findType(typeId);
    
    // Check if it's an empty struct
    if (type.typeDef.type === 'Struct' && type.typeDef.value.fields.length === 0) {
      return true;
    }
    
    // Check if it's an empty tuple
    if (type.typeDef.type === 'Tuple' && type.typeDef.value.fields.length === 0) {
      return true;
    }
  } catch (error) {
    // Ignore errors
  }
  
  // All other cases (including errors) require input
  return false;
}
