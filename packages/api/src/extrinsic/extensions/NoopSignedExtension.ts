import { PortableRegistry } from '@dedot/codecs';
import { SignerPayloadJSON } from '@dedot/types';
import { SignedExtension } from './SignedExtension.js';
import { ISubstrateClient } from '../../types.js';

/**
 * A no-operation signed extension that can be used as a fallback for unknown extensions
 * that don't require external input.
 */
export class NoopSignedExtension extends SignedExtension {
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
