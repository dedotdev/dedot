import { ApplyExtrinsicResult, BlockHash, DispatchError, DispatchInfo, Hash, RuntimeDispatchInfo } from '@dedot/codecs';
import { Callback, IEventRecord, Unsub } from '@dedot/codecs/types';
import { HexString } from '@dedot/utils';
import { IKeyringPair, InjectedSigner } from './pjs-types.js';

export type AddressOrPair = IKeyringPair | string; // | AccountId32Like | MultiAddressLike;

export interface PayloadOptions<AssetId extends any = any> {
  nonce?: number;
  tip?: bigint;
  assetId?: AssetId;
  metadataHash?: HexString; // If empty -> disabled, if not empty -> enabled

  // TODO support customize mortality
  // blockHash?: Uint8Array | HexString;
  // era?: HexString

  [prop: string]: any;
}
export interface SignerOptions<AssetId extends any = any> extends PayloadOptions<AssetId> {
  signer?: InjectedSigner;
}

export type DryRunResult = ApplyExtrinsicResult;
export type TxPaymentInfo = RuntimeDispatchInfo;

export interface ISubmittableResult<EventRecord extends IEventRecord = IEventRecord> {
  status: TxStatus;
  events: EventRecord[];
  dispatchError?: DispatchError;
  dispatchInfo?: DispatchInfo;
  txHash: Hash;
  txIndex?: number;
}

export interface IRuntimeTxCall {
  pallet: string;
  palletCall:
    | {
        name: string;
        params?: object;
      }
    | string
    | null;
}

interface PromiseWithUntil<T, R> extends Promise<T> {
  untilFinalized(): Promise<R>;
  untilBestChainBlockIncluded(): Promise<R>;
}

export interface TxUnsub<R extends ISubmittableResult = ISubmittableResult> extends PromiseWithUntil<Unsub, R> {}

export interface TxHash<R extends ISubmittableResult = ISubmittableResult> extends PromiseWithUntil<Hash, R> {}

export interface ISubmittableExtrinsic<R extends ISubmittableResult = ISubmittableResult, AssetId extends any = any> {
  paymentInfo(account: AddressOrPair, options?: Partial<PayloadOptions<AssetId>>): Promise<TxPaymentInfo>;

  send(): TxHash<R>;

  send(callback: Callback<R>): TxUnsub<R>;

  sign(account: AddressOrPair, options?: Partial<SignerOptions<AssetId>>): Promise<this>;

  signAndSend(account: AddressOrPair, options?: Partial<SignerOptions<AssetId>>): TxHash<R>;

  signAndSend(account: AddressOrPair, callback: Callback<R>): TxUnsub<R>;

  signAndSend(account: AddressOrPair, options: Partial<SignerOptions<AssetId>>, callback?: Callback<R>): TxUnsub<R>;
}

export interface ISubmittableExtrinsicLegacy<R extends ISubmittableResult = ISubmittableResult>
  extends ISubmittableExtrinsic<R> {
  dryRun(account: AddressOrPair, optionsOrHash?: Partial<SignerOptions> | BlockHash): Promise<DryRunResult>;
}

// We want to mimic an enum type for the new transaction status
export type TxStatus =
  | { type: 'Validated' } // emits after we validate the transaction via `call.taggedTransactionQueue.validateTransaction`
  | { type: 'Broadcasting' } // emits after we submit the transaction via TxBroadcaster
  | { type: 'BestChainBlockIncluded'; value: { blockHash: HexString; blockNumber: number; txIndex: number } }
  | { type: 'NoLongerInBestChain' } // similar to Retracted
  | { type: 'Finalized'; value: { blockHash: HexString; blockNumber: number; txIndex: number } }
  | { type: 'Invalid'; value: { error: string } }
  | { type: 'Drop'; value: { error: string } };
