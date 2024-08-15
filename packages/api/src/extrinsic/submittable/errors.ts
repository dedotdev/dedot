import type { Result } from '@dedot/codecs';
import { DedotError } from '@dedot/utils';
import type {
  SpRuntimeTransactionValidityTransactionValidityError,
  SpRuntimeTransactionValidityValidTransaction,
} from '../../chaintypes/index.js';

/**
 * This throws out if the extrinsic is invalid
 * after verifying via `call.taggedTransactionQueue.validateTransaction`
 */
export class InvalidTxError extends DedotError {
  name = 'InvalidTxError';
  constructor(
    message: string,
    public data: Result<
      SpRuntimeTransactionValidityValidTransaction,
      SpRuntimeTransactionValidityTransactionValidityError
    >,
  ) {
    super(message);
  }
}
