import type { DispatchError, DispatchInfo, Hash } from '@dedot/codecs';
import type { IEventRecord, ISubmittableResult } from '@dedot/types';
import type { FrameSystemEventRecord } from '../../chaintypes/index.js';

export interface SubmittableResultInputs<E extends IEventRecord = FrameSystemEventRecord, TxStatus extends any = any> {
  events?: E[];
  status: TxStatus;
  txHash: Hash;
  txIndex?: number;
}

export class SubmittableResult<E extends IEventRecord = FrameSystemEventRecord, TxStatus extends any = any>
  implements ISubmittableResult<E, TxStatus>
{
  status: TxStatus;
  events: E[];
  dispatchInfo?: DispatchInfo;
  dispatchError?: DispatchError;
  txHash: Hash;
  txIndex?: number;

  constructor({ events, status, txHash, txIndex }: SubmittableResultInputs<E, TxStatus>) {
    this.events = events || [];
    this.status = status;
    this.txHash = txHash;
    this.txIndex = txIndex;

    [this.dispatchInfo, this.dispatchError] = this._extractDispatchInfo();
  }

  _extractDispatchInfo(): [DispatchInfo | undefined, DispatchError | undefined] {
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
