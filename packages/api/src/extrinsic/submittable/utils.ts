import { Hash, TransactionStatus } from '@dedot/codecs';
import { AddressOrPair, IKeyringPair, ISubmittableResult, TxStatus, Unsub } from '@dedot/types';
import { assert, blake2AsU8a, Deferred, deferred, HexString, hexToU8a, isFunction } from '@dedot/utils';
import { RejectedTxError } from './errors.js';

export function isKeyringPair(account: AddressOrPair): account is IKeyringPair {
  return isFunction((account as IKeyringPair).sign);
}

/**
 * Sign a raw message
 * @param signerPair
 * @param raw
 */
export function signRaw(signerPair: IKeyringPair, raw: HexString): Uint8Array {
  const u8a = hexToU8a(raw);
  // Ref: https://github.com/paritytech/polkadot-sdk/blob/943697fa693a4da6ef481ef93df522accb7d0583/substrate/primitives/runtime/src/generic/unchecked_extrinsic.rs#L234-L238
  const toSignRaw = u8a.length > 256 ? blake2AsU8a(u8a, 256) : u8a;

  return signerPair.sign(toSignRaw, { withType: true });
}

type TxInfo = { txIndex: number; blockNumber: number };

/**
 * Convert transaction status to transaction event
 *
 * Ref: https://github.com/paritytech/polkadot-sdk/blob/98a364fe6e7abf10819f5fddd3de0588f7c38700/substrate/client/rpc-spec-v2/src/transaction/transaction.rs#L132-L159
 * @param txStatus
 * @param txInfo
 */
export function toTxStatus(txStatus: TransactionStatus, txInfo?: TxInfo): TxStatus {
  switch (txStatus.type) {
    case 'Ready':
    case 'Future':
      return { type: 'Validated' };
    case 'Broadcast':
      return { type: 'Broadcasting' };
    case 'Retracted':
      return { type: 'NoLongerInBestChain' };
    case 'InBlock':
      assert(txInfo, 'TxInfo is required');
      return {
        type: 'BestChainBlockIncluded',
        value: {
          blockHash: txStatus.value,
          ...txInfo,
        },
      };
    case 'Finalized':
      assert(txInfo, 'TxInfo is required');
      return {
        type: 'Finalized',
        value: {
          blockHash: txStatus.value,
          ...txInfo,
        },
      };
    case 'FinalityTimeout':
      return {
        type: 'Drop',
        value: {
          error: 'Maximum number of finality watchers has been reached',
        },
      };
    case 'Dropped':
      return {
        type: 'Drop',
        value: {
          error: 'Extrinsic dropped from the pool due to exceeding limits',
        },
      };
    case 'Usurped':
      return {
        type: 'Invalid',
        value: {
          error: 'Extrinsic was rendered invalid by another extrinsic',
        },
      };
    case 'Invalid':
      return {
        type: 'Invalid',
        value: {
          error: 'Extrinsic marked as invalid',
        },
      };
  }
}

export function txDefer() {
  const deferTx = deferred<Unsub | Hash>();
  let deferFinalized: Deferred<ISubmittableResult> | undefined;
  let deferBestChainBlockIncluded: Deferred<ISubmittableResult> | undefined;

  Object.assign(deferTx.promise, {
    untilFinalized: () => {
      deferFinalized = deferred<ISubmittableResult>();
      return deferFinalized.promise;
    },
    untilBestChainBlockIncluded: () => {
      deferBestChainBlockIncluded = deferred<ISubmittableResult>();
      return deferBestChainBlockIncluded.promise;
    },
  });

  const onTxProgress = (result: ISubmittableResult) => {
    const { status } = result;
    if (status.type === 'BestChainBlockIncluded') {
      deferBestChainBlockIncluded?.resolve(result);
    } else if (status.type === 'Finalized') {
      deferBestChainBlockIncluded?.resolve(result);
      deferFinalized?.resolve(result);
    } else if (status.type === 'Invalid' || status.type === 'Drop') {
      const e = new RejectedTxError(result);
      deferBestChainBlockIncluded?.reject(e);
      deferFinalized?.reject(e);
    }
  };

  return {
    deferTx,
    deferFinalized: () => deferFinalized,
    deferBestChainBlockIncluded: () => deferBestChainBlockIncluded,
    onTxProgress,
  };
}
