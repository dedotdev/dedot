import { SignOptions } from '@polkadot/keyring/types';
import { IKeyringPair } from '@polkadot/types/types';
import { BlockHash, Extrinsic, Hash, SignedBlock, TransactionStatus } from '@dedot/codecs';
import type {
  AddressOrPair,
  AsyncMethod,
  Callback,
  DryRunResult,
  GenericSubstrateApi,
  GenericTxCall,
  IRuntimeTxCall,
  ISubmittableExtrinsic,
  ISubmittableResult,
  SignerOptions,
  Unsub,
} from '@dedot/types';
import {
  assert,
  blake2AsU8a,
  HexString,
  hexToU8a,
  isFunction,
  isHex,
  stringCamelCase,
  stringPascalCase,
  u8aToHex,
  UnknownApiError,
} from '@dedot/utils';
import type { FrameSystemEventRecord, SubstrateApi } from '../chaintypes/index.js';
import { Dedot } from '../client/index.js';
import { ExtraSignedExtension, SubmittableResult } from '../extrinsic/index.js';
import { Executor } from './Executor.js';
import { StorageQueryExecutor } from './StorageQueryExecutor.js';

export function isKeyringPair(account: AddressOrPair): account is IKeyringPair {
  return isFunction((account as IKeyringPair).sign);
}

/**
 * Sign a raw message
 * @param signerPair
 * @param raw
 * @param options
 */
export function signRaw(signerPair: IKeyringPair, raw: HexString, options?: SignOptions): Uint8Array {
  const u8a = hexToU8a(raw);
  // Ref: https://github.com/paritytech/polkadot-sdk/blob/943697fa693a4da6ef481ef93df522accb7d0583/substrate/primitives/runtime/src/generic/unchecked_extrinsic.rs#L234-L238
  const toSignRaw = u8a.length > 256 ? blake2AsU8a(u8a, 256) : u8a;

  return signerPair.sign(toSignRaw, options);
}

/**
 * @name TxExecutor
 * @description Execute a transaction instruction, returns a submittable extrinsic
 */
export class TxExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  doExecute(pallet: string, functionName: string) {
    const targetPallet = this.getPallet(pallet);

    assert(targetPallet.calls, new UnknownApiError(`Tx calls are not available for pallet ${targetPallet.name}`));

    const txType = this.metadata.types[targetPallet.calls]!;

    assert(txType.type.tag === 'Enum', new UnknownApiError('Tx type defs should be enum'));

    const isFlatEnum = txType.type.value.members.every((m) => m.fields.length === 0);
    const txCallDef = txType.type.value.members.find((m) => stringCamelCase(m.name) === functionName);
    assert(txCallDef, new UnknownApiError(`Tx call spec not found for ${pallet}.${functionName}`));

    const txCallFn: GenericTxCall = (...args: any[]) => {
      let call: IRuntimeTxCall;
      if (isFlatEnum) {
        call = {
          pallet: stringPascalCase(targetPallet.name),
          palletCall: stringPascalCase(txCallDef.name),
        };
      } else {
        const callParams = txCallDef.fields.reduce((o, { name }, idx) => {
          o[stringCamelCase(name!)] = args[idx];
          return o;
        }, {} as any);

        call = {
          pallet: stringPascalCase(targetPallet.name),
          palletCall: {
            name: stringPascalCase(txCallDef.name),
            params: callParams,
          },
        };
      }

      return this.createExtrinsic(call);
    };

    txCallFn.meta = {
      ...txCallDef,
      fieldCodecs: txCallDef.fields.map(({ typeId }) => this.registry.findCodec(typeId)),
      pallet: targetPallet.name,
      palletIndex: targetPallet.index,
    };

    return txCallFn;
  }

  createExtrinsic(call: IRuntimeTxCall) {
    const txExecutor = this;
    const api = this.api as unknown as Dedot<SubstrateApi>;

    class SubmittableExtrinsic extends Extrinsic implements ISubmittableExtrinsic {
      async sign(fromAccount: AddressOrPair, options?: Partial<SignerOptions>) {
        const address = isKeyringPair(fromAccount) ? fromAccount.address : fromAccount.toString();
        const extra = new ExtraSignedExtension(api as unknown as Dedot, {
          signerAddress: address,
          payloadOptions: options,
        });

        await extra.init();

        const { signer } = options || {};

        let signature;
        if (isKeyringPair(fromAccount)) {
          signature = u8aToHex(
            signRaw(fromAccount, extra.toRawPayload(this.callHex).data as HexString, { withType: true }),
          );
        } else if (signer?.signPayload) {
          const result = await signer.signPayload(extra.toPayload(this.callHex));
          signature = result.signature;
        } else {
          throw new Error('Signer not found. Cannot sign the extrinsic!');
        }

        const { signatureTypeId } = this.registry.metadata!.extrinsic;
        const $Signature = this.registry.findCodec(signatureTypeId);

        this.attachSignature({
          address: address,
          signature: $Signature.tryDecode(signature),
          extra: extra.data,
        });

        return this;
      }

      signAndSend(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<Hash>;

      signAndSend(account: AddressOrPair, callback: Callback<ISubmittableResult>): Promise<Unsub>;

      signAndSend(
        account: AddressOrPair,
        options: Partial<SignerOptions>,
        callback?: Callback<ISubmittableResult>,
      ): Promise<Unsub>;

      async signAndSend(
        fromAccount: AddressOrPair,
        partialOptions?: Partial<SignerOptions> | Callback<ISubmittableResult>,
        maybeCallback?: Callback<ISubmittableResult>,
      ): Promise<Hash | Unsub> {
        const [options, callback] = this.#normalizeOptions(partialOptions, maybeCallback);
        await this.sign(fromAccount, options);
        return this.send(callback as any);
      }

      #normalizeOptions(
        partialOptions?: Partial<SignerOptions> | Callback<ISubmittableResult>,
        callback?: Callback<ISubmittableResult>,
      ): [Partial<SignerOptions>, Callback<ISubmittableResult> | undefined] {
        if (isFunction(partialOptions)) {
          return [{}, partialOptions];
        } else {
          return [Object.assign({}, partialOptions), callback];
        }
      }

      async dryRun(account: AddressOrPair, optionsOrHash?: Partial<SignerOptions> | BlockHash): Promise<DryRunResult> {
        // TODO check if system_dryRun is available
        const dryRunFn = api.rpc.system_dryRun;

        if (isHex(optionsOrHash)) {
          return dryRunFn(this.toHex(), optionsOrHash);
        }

        await this.sign(account, optionsOrHash);
        return dryRunFn(this.toHex());
      }

      send(): Promise<Hash>;
      send(callback: Callback<ISubmittableResult>): Promise<Unsub>;
      async send(callback?: Callback<ISubmittableResult> | undefined): Promise<Hash | Unsub> {
        const isSubscription = !!callback;
        const txHash = this.hash;

        if (isSubscription) {
          return api.rpc.author_submitAndWatchExtrinsic(this.toHex(), async (status: TransactionStatus) => {
            if (status.tag === 'InBlock' || status.tag === 'Finalized') {
              const blockHash: BlockHash = status.value;

              const [signedBlock, blockEvents] = await Promise.all([
                api.rpc.chain_getBlock(blockHash),
                txExecutor.#getSystemEventsAt(blockHash),
              ]);

              const txIndex = (signedBlock as SignedBlock).block.extrinsics.findIndex(
                (tx) => this.registry.hashAsHex(tx as HexString) === txHash,
              );

              assert(txIndex >= 0, 'Extrinsic not found!');

              const events = blockEvents.filter(
                ({ phase }) => phase.tag === 'ApplyExtrinsic' && phase.value === txIndex,
              );

              return callback(new SubmittableResult({ status, txHash, events, txIndex }));
            } else {
              return callback(new SubmittableResult({ status, txHash }));
            }
          });
        } else {
          return api.rpc.author_submitExtrinsic(this.toHex());
        }
      }
    }

    return new SubmittableExtrinsic(api.registry, call);
  }

  async #getSystemEventsAt(hash: BlockHash): Promise<FrameSystemEventRecord[]> {
    const executor = new StorageQueryExecutor<ChainApi>(this.api, hash);
    const eventsQueryFn = executor.execute('system', 'events') as AsyncMethod<FrameSystemEventRecord[]>;
    return eventsQueryFn();
  }
}
