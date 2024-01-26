import { CheckNonZeroSender } from './CheckNonZeroSender';
import { CheckSpecVersion } from './CheckSpecVersion';
import { CheckTxVersion } from './CheckTxVersion';
import { CheckGenesis } from './CheckGenesis';
import { CheckMortality } from './CheckMortality';
import { CheckNonce } from './CheckNonce';
import { CheckWeight } from './CheckWeight';
import { ChargeTransactionPayment } from './ChargeTransactionPayment';
import { PrevalidateAttests } from './PrevalidateAttests';
import { ISignedExtension } from '../SignedExtension';

const knownSignedExtensions: Record<string, new (...args: any[]) => ISignedExtension> = {
  CheckNonZeroSender,
  CheckSpecVersion,
  CheckTxVersion,
  CheckGenesis,
  CheckMortality,
  CheckNonce,
  CheckWeight,
  ChargeTransactionPayment,
  PrevalidateAttests,
};

export default knownSignedExtensions;
