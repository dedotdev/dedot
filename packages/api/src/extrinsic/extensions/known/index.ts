/**
 * Known signed extensions that require external input.
 *
 * Note: Extensions that don't require external input are automatically handled by FallbackSignedExtension:
 * - CheckNonZeroSender
 * - CheckWeight
 * - PrevalidateAttests
 * - StorageWeightReclaim
 *
 * These extensions have empty struct or tuple types and don't need explicit implementation.
 */
import { ISignedExtension } from '../SignedExtension.js';
import { ChargeAssetTxPayment } from './ChargeAssetTxPayment.js';
import { ChargeTransactionPayment } from './ChargeTransactionPayment.js';
import { CheckGenesis } from './CheckGenesis.js';
import { CheckMetadataHash } from './CheckMetadataHash.js';
import { CheckMortality } from './CheckMortality.js';
import { CheckNonce } from './CheckNonce.js';
import { CheckSpecVersion } from './CheckSpecVersion.js';
import { CheckTxVersion } from './CheckTxVersion.js';

export type AnySignedExtension = new (...args: any[]) => ISignedExtension;

export const knownSignedExtensions: Record<string, AnySignedExtension> = {
  CheckSpecVersion,
  CheckTxVersion,
  CheckGenesis,
  CheckMortality,
  CheckNonce,
  ChargeTransactionPayment,
  ChargeAssetTxPayment,
  CheckMetadataHash,
};
