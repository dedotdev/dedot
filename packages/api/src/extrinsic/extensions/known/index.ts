import { ISignedExtension } from '../SignedExtension';
import { CheckNonZeroSender } from './CheckNonZeroSender';
import { CheckSpecVersion } from './CheckSpecVersion';
import { CheckTxVersion } from './CheckTxVersion';
import { CheckGenesis } from './CheckGenesis';
import { CheckMortality } from './CheckMortality';
import { CheckNonce } from './CheckNonce';
import { CheckWeight } from './CheckWeight';
import { ChargeTransactionPayment } from './ChargeTransactionPayment';
import { PrevalidateAttests } from './PrevalidateAttests';
import { ChargeAssetTxPayment } from './ChargeAssetTxPayment';

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
};
