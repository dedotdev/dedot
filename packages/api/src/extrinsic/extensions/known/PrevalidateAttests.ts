import { SignedExtension } from '../SignedExtension.js';

/**
 * @description Validate `attest` calls prior to execution.
 * Needed to avoid a DoS attack since they are otherwise free to place on chain.
 */
export class PrevalidateAttests extends SignedExtension {}
