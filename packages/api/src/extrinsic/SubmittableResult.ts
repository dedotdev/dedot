import { IEventRecord, ISubmittableResult } from '@dedot/types';
import { DispatchError, DispatchInfo, Hash, TransactionStatus } from '@dedot/codecs';
import { FrameSystemEventRecord } from '@dedot/chaintypes/substrate';

export interface SubmittableResultInputs<E extends IEventRecord = FrameSystemEventRecord> {
  events?: E[];
  status: TransactionStatus;
  txHash: Hash;
  txIndex?: number;
}

export class SubmittableResult<E extends IEventRecord = FrameSystemEventRecord> implements ISubmittableResult<E> {
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

    [this.dispatchInfo, this.dispatchError] = this.#extractInfo();
  }

  #extractInfo(): [DispatchInfo | undefined, DispatchError | undefined] {
    for (const { event } of this.events as FrameSystemEventRecord[]) {
      const { pallet, palletEvent } = event;
      if (pallet === 'System' && palletEvent.name === 'ExtrinsicFailed') {
        const { dispatchInfo, dispatchError } = palletEvent.data;
        return [dispatchInfo, dispatchError];
      } else if (pallet === 'System' && palletEvent.name === 'ExtrinsicSuccess') {
        const { dispatchInfo } = palletEvent.data;
        return [dispatchInfo, undefined];
      }
    }

    return [undefined, undefined];
  }
}
