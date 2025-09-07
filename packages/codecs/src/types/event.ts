import { Phase, H256, Hash } from '../codecs/index.js';

export interface IRuntimeEvent {
  pallet: string;
  palletEvent:
    | string
    | {
        name: string;
        data?: any;
      };
}

export interface IEventRecord<E extends IRuntimeEvent = IRuntimeEvent, H extends Hash = H256> {
  phase: Phase;
  event: E;
  topics: Array<H>;
}
