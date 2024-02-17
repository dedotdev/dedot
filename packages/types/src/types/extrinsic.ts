import {
  ApplyExtrinsicResult,
  DispatchError,
  DispatchInfo,
  Hash,
  RuntimeDispatchInfo,
  TransactionStatus,
} from '@delightfuldot/codecs';
import { Callback, Unsub } from './index';
import { IKeyringPair, Signer } from '@polkadot/types/types';

export type AddressOrPair = IKeyringPair | string; // | AccountId32Like | MultiAddressLike;

export interface PayloadOptions {
  nonce?: number;
  tip?: bigint;

  // TODO support customize mortality
  // blockHash?: Uint8Array | HexString;
  // era?: HexString
}
export interface SignerOptions extends PayloadOptions {
  signer?: Signer;
}

export type DryRunResult = ApplyExtrinsicResult;
export type PaymentInfoResult = RuntimeDispatchInfo;

export interface ISubmittableResult<EventRecord = any> {
  dispatchError?: DispatchError;
  dispatchInfo?: DispatchInfo;
  events: EventRecord[];
  status: TransactionStatus;
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
  hasDryRun: boolean;

  hasPaymentInfo: boolean;

  dryRun(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<DryRunResult>;

  paymentInfo(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<PaymentInfoResult>;

  send(): Promise<Hash>;

  send(callback: Callback<R>): Promise<Unsub>;

  signAsync(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<this>;

  signAndSend(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<Hash>;

  signAndSend(account: AddressOrPair, callback: Callback<R>): Promise<Unsub>;

  signAndSend(account: AddressOrPair, options: Partial<SignerOptions>, callback?: Callback<R>): Promise<Unsub>;
}
