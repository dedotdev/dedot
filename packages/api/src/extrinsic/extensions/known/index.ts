import { ISignedExtension } from '../SignedExtension.js';
import { ChargeAssetTxPayment } from './ChargeAssetTxPayment.js';
import { ChargeTransactionPayment } from './ChargeTransactionPayment.js';
import { CheckGenesis } from './CheckGenesis.js';
import { CheckMetadataHash } from './CheckMetadataHash.js';
import { CheckMortality } from './CheckMortality.js';
import { CheckNonZeroSender } from './CheckNonZeroSender.js';
import { CheckNonce } from './CheckNonce.js';
import { CheckSpecVersion } from './CheckSpecVersion.js';
import { CheckTxVersion } from './CheckTxVersion.js';
import { CheckWeight } from './CheckWeight.js';
import { PrevalidateAttests } from './PrevalidateAttests.js';

export type AnySignedExtension = new (...args: any[]) => ISignedExtension;

export const knownSignedExtensions: Record<string, AnySignedExtension> = {
  CheckNonZeroSender,
  CheckSpecVersion,
  CheckTxVersion,
  CheckGenesis,
  CheckMortality,
  CheckNonce,
  CheckWeight,
  ChargeTransactionPayment,
  PrevalidateAttests,
  ChargeAssetTxPayment,
  CheckMetadataHash,
};
