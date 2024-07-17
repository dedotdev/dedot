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
  metadataHash?: HexString; // If empty -> disabled, if not empty -> enabled

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

// We want to mimic an enum type for the new transaction status
export type TransactionEvent =
  | { type: 'Validated' } // emits after we validate the transaction via `call.taggedTransactionQueue.validateTransaction`
  | { type: 'Broadcasting' } // emits after we submit the transaction via TxBroadcaster
  | { type: 'BestChainBlockIncluded'; value: { blockHash: HexString; txIndex: number } }
  | { type: 'NoLongerInBestChain' } // similar to Retracted
  | { type: 'Finalized'; value: { blockHash: HexString; txIndex: number } }
  | { type: 'Invalid'; value: { error: string } }
  | { type: 'Drop'; value: { error: string } };
