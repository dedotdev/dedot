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
