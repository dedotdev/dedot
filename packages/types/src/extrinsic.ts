import { ApplyExtrinsicResult, BlockHash, DispatchError, DispatchInfo, Hash, TransactionStatus } from '@dedot/codecs';
import { Callback, IEventRecord, Unsub } from './index.js';
import { IKeyringPair, Signer } from '@polkadot/types/types';
import { HexString } from '@dedot/utils';

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

export interface ISubmittableResult<EventRecord extends IEventRecord = IEventRecord, TxStatus extends any = any> {
  dispatchError?: DispatchError;
  dispatchInfo?: DispatchInfo;
  events: EventRecord[];
  status: TxStatus;
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
