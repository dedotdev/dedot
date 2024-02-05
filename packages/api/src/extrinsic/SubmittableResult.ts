import { ISubmittableResult } from '@delightfuldot/types';
import { DispatchError, DispatchInfo, Hash, TransactionStatus } from '@delightfuldot/codecs';

export interface SubmittableResultInputs<E = any> {
  events?: E[];
  status: TransactionStatus;
  txHash: Hash;
  txIndex?: number;
}

export class SubmittableResult<E = any> implements ISubmittableResult<E> {
  dispatchInfo?: DispatchInfo;
  dispatchError?: DispatchError;
  events: E[];
  status: TransactionStatus;
  txHash: Hash;
  txIndex?: number;

  constructor({ events, status, txHash, txIndex }: SubmittableResultInputs<E>) {
    this.events = events || [];
    this.status = status;
    this.txHash = txHash;
    this.txIndex = txIndex;

    const extrinsicSuccessEvent = this.events.find(
      (e: any) => e.event.pallet === 'System' && e.event.palletEvent.name === 'ExtrinsicSuccess',
    ) as any;

    if (extrinsicSuccessEvent) {
      this.dispatchInfo = extrinsicSuccessEvent?.event?.palletEvent?.data.dispatchInfo;
    } else {
      const extrinsicFailedEvent = this.events.find(
        (e: any) => e.event.pallet === 'System' && e.event.palletEvent.name === 'ExtrinsicFailed',
      ) as any;

      this.dispatchInfo = extrinsicFailedEvent?.event?.palletEvent?.data.dispatchInfo;
      this.dispatchError = extrinsicFailedEvent?.event?.palletEvent?.data.dispatchError;
    }
  }
}
