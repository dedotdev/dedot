import { BlockHash, Hash, SignedBlock, TransactionStatus } from '@dedot/codecs';
import {
  type AddressOrPair,
  type Callback,
  type DryRunResult,
  IEventRecord,
  ISubmittableExtrinsicLegacy,
  type SignerOptions,
  type Unsub,
} from '@dedot/types';
import { assert, blake2AsHex, HexString, hexToU8a, isHex, SubmittableResult } from 'dedot';
import { BaseExtrinsic } from './BaseExtrinsic.js';

export class SubmittableExtrinsicLegacy extends BaseExtrinsic implements ISubmittableExtrinsicLegacy {
  async dryRun(account: AddressOrPair, optionsOrHash?: Partial<SignerOptions> | BlockHash): Promise<DryRunResult> {
    const dryRunFn = this.api.rpc.system_dryRun;

    if (isHex(optionsOrHash)) {
      return dryRunFn(this.toHex(), optionsOrHash);
    }

    await this.sign(account, optionsOrHash);
    return dryRunFn(this.toHex());
  }

  send(): Promise<Hash>;
  send(callback: Callback): Promise<Unsub>;
  send(callback?: Callback | undefined): Promise<Hash | Unsub> {
    const isSubscription = !!callback;
    const txHash = this.hash;

    if (isSubscription) {
      return this.api.rpc.author_submitAndWatchExtrinsic(this.toHex(), async (status: TransactionStatus) => {
        if (status.tag === 'InBlock' || status.tag === 'Finalized') {
          const blockHash: BlockHash = status.value;

          const [signedBlock, blockEvents] = await Promise.all([
            this.api.rpc.chain_getBlock(blockHash),
            this.api.queryAt(blockHash).system.events(),
          ]);

          const txIndex = (signedBlock as SignedBlock).block.extrinsics.findIndex(
            (tx) => blake2AsHex(hexToU8a(tx as HexString)) === txHash,
          );

          assert(txIndex >= 0, 'Extrinsic not found!');

          const events = blockEvents.filter(({ phase }) => phase.tag === 'ApplyExtrinsic' && phase.value === txIndex);

          return callback(
            new SubmittableResult<IEventRecord, TransactionStatus>({
              status,
              txHash,
              events,
              txIndex,
            }),
          );
        } else {
          return callback(
            new SubmittableResult<IEventRecord, TransactionStatus>({
              status,
              txHash,
            }),
          );
        }
      });
    } else {
      return this.api.rpc.author_submitExtrinsic(this.toHex());
    }
  }
}
