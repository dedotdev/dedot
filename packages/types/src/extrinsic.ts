import { IKeyringPair, Signer } from '@polkadot/types/types';
import {
  ApplyExtrinsicResult,
  BlockHash,
  DispatchError,
  DispatchInfo,
  Hash,
  RuntimeDispatchInfo,
  TransactionStatus,
} from '@dedot/codecs';
import { HexString } from '@dedot/utils';
import { Callback, IEventRecord, Unsub } from './index.js';

export type AddressOrPair = IKeyringPair | string; // | AccountId32Like | MultiAddressLike;

export interface PayloadOptions {
  nonce?: number;
  tip?: bigint;
  assetId?: number | object; // TODO support generic types

  // TODO support customize mortality
  // blockHash?: Uint8Array | HexString;
  // era?: HexString

  [prop: string]: any;
}
export interface SignerOptions extends PayloadOptions {
  signer?: Signer;
}

export type DryRunResult = ApplyExtrinsicResult;
export type TxPaymentInfo = RuntimeDispatchInfo;

export interface ISubmittableResult<EventRecord extends IEventRecord = IEventRecord, TxStatus extends any = any> {
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

export interface ISubmittableExtrinsic<R extends ISubmittableResult = ISubmittableResult> {
  paymentInfo(account: AddressOrPair, options?: Partial<PayloadOptions>): Promise<TxPaymentInfo>;

  send(): Promise<Hash>;

  send(callback: Callback<R>): Promise<Unsub>;

  sign(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<this>;

  signAndSend(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<Hash>;

  signAndSend(account: AddressOrPair, callback: Callback<R>): Promise<Unsub>;

  signAndSend(account: AddressOrPair, options: Partial<SignerOptions>, callback?: Callback<R>): Promise<Unsub>;
}

export interface ISubmittableExtrinsicLegacy<R extends ISubmittableResult = ISubmittableResult>
  extends ISubmittableExtrinsic<R> {
  dryRun(account: AddressOrPair, optionsOrHash?: Partial<SignerOptions> | BlockHash): Promise<DryRunResult>;
}

export type TransactionStatusLegacy = TransactionStatus;

// We want to mimic an enum type for the new transaction status
export type TransactionStatusV2 =
  | { tag: 'Validated' } // emits after we validate the transaction via `call.taggedTransactionQueue.validateTransaction`
  | { tag: 'Broadcasting' } // emits after we submit the transaction via TxBroadcaster
  | { tag: 'BestChainBlockIncluded'; value: { blockHash: HexString; txIndex: number } | null }
  | { tag: 'Finalized'; value: { blockHash: HexString; txIndex: number } }
  | { tag: 'Invalid'; value: { error: string } }
  | { tag: 'Drop'; value: { error: string } };
