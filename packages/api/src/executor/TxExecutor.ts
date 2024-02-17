import { Executor } from './Executor';
import {
  AddressOrPair,
  Callback,
  DryRunResult,
  GenericSubstrateApi,
  GenericTxCall,
  IRuntimeTxCall,
  ISubmittableExtrinsic,
  ISubmittableResult,
  SignerOptions,
  Unsub,
} from '@delightfuldot/types';
import { SubstrateApi } from '@delightfuldot/chaintypes';
import { assert, HexString } from '@delightfuldot/utils';
import { hexToU8a, isFunction, objectSpread, stringCamelCase, stringPascalCase, u8aToHex } from '@polkadot/util';
import { BlockHash, Extrinsic, Hash, SignedBlock, TransactionStatus } from '@delightfuldot/codecs';
import DelightfulApi from '../DelightfulApi';
import { IKeyringPair } from '@polkadot/types/types';
import { ExtraSignedExtension, SubmittableResult } from '../extrinsic';
import { SignOptions } from '@polkadot/keyring/types';
import { blake2AsHex, blake2AsU8a } from '@polkadot/util-crypto';

export function isKeyringPair(account: string | IKeyringPair): account is IKeyringPair {
  return isFunction((account as IKeyringPair).sign);
}

export function sign(signerPair: IKeyringPair, raw: HexString, options?: SignOptions): Uint8Array {
  const u8a = hexToU8a(raw);
  const encoded = u8a.length > 256 ? blake2AsU8a(u8a, 256) : u8a;

  return signerPair.sign(encoded, options);
}

export class TxExecutor<ChainApi extends GenericSubstrateApi = SubstrateApi> extends Executor<ChainApi> {
  execute(pallet: string, functionName: string) {
    const targetPallet = this.getPallet(pallet);

    assert(targetPallet.calls, 'Tx call type not found');

    const txType = this.metadata.types[targetPallet.calls]!;

    assert(txType.type.tag === 'Enum', 'Tx type should be enum');

    const isFlatEnum = txType.type.value.members.every((m) => m.fields.length === 0);
    const txCallDef = txType.type.value.members.find((m) => stringCamelCase(m.name) === functionName);
    assert(txCallDef, 'Tx call not found');

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
      fieldCodecs: txCallDef.fields.map(({ typeId }) => this.registry.findPortableCodec(typeId)),
      pallet: targetPallet.name,
      palletIndex: targetPallet.index,
    };

    return txCallFn;
  }

  createExtrinsic(call: IRuntimeTxCall) {
    const api = this.api as unknown as DelightfulApi<SubstrateApi>;

    // TODO implements ISubmittableExtrinsic
    class SubmittableExtrinsic extends Extrinsic implements ISubmittableExtrinsic {
      async sign(fromAccount: AddressOrPair, options?: Partial<SignerOptions>) {
        const address = isKeyringPair(fromAccount) ? fromAccount.address : fromAccount.toString();
        const extra = new ExtraSignedExtension(api as unknown as DelightfulApi, {
          signerAddress: address,
          payloadOptions: options,
        });

        await extra.init();

        const { signer } = options || {};

        let signature;
        if (isKeyringPair(fromAccount)) {
          signature = u8aToHex(
            sign(fromAccount, extra.toRawPayload(this.callRaw).data as HexString, { withType: true }),
          );
        } else if (signer?.signPayload) {
          const result = await signer.signPayload(extra.toPayload(this.callRaw));
          signature = result.signature;
        } else if (signer?.signRaw) {
          const result = await signer.signRaw(extra.toRawPayload(this.callRaw));
          signature = result.signature;
        } else {
          throw new Error('Cannot sign');
        }

        const { signatureTypeId } = this.registry.metadata!.extrinsic;
        const $Signature = this.registry.findPortableCodec(signatureTypeId);

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
          return [objectSpread({}, partialOptions), callback];
        }
      }

      get $Codec() {
        return this.registry.findCodec('Extrinsic');
      }

      toU8a() {
        return this.$Codec.tryEncode(this);
      }

      toHex() {
        return u8aToHex(this.toU8a());
      }

      get hash(): Hash {
        return blake2AsHex(this.toU8a());
      }

      dryRun(account: AddressOrPair, options?: Partial<SignerOptions>): Promise<DryRunResult> {
        throw new Error('To implement!');
      }

      send(): Promise<Hash>;
      send(callback: Callback<ISubmittableResult>): Promise<Unsub>;
      async send(callback?: Callback<ISubmittableResult> | undefined): Promise<Hash | Unsub> {
        const isSubscription = !!callback;
        const txHash = this.hash;

        if (isSubscription) {
          return api.rpc.author.submitAndWatchExtrinsic(this.toHex(), async (status: TransactionStatus) => {
            if (status.tag === 'InBlock' || status.tag === 'Finalized') {
              const blockHash: BlockHash = status.value;

              const [signedBlock, events] = await Promise.all([
                api.rpc.chain.getBlock(blockHash),
                api.queryAt(blockHash).system.events(),
              ]);

              const txIndex = (signedBlock as SignedBlock).block.extrinsics.findIndex(
                (tx) => blake2AsHex(hexToU8a(tx as HexString)) === txHash,
              );

              assert(txIndex >= 0, 'Extrinsic not found!');

              const txEvents = events.filter(({ phase }) => phase.tag === 'ApplyExtrinsic' && phase.value === txIndex);

              return callback(new SubmittableResult({ status, txHash, events: txEvents, txIndex }));
            } else {
              return callback(new SubmittableResult({ status, txHash }));
            }
          });
        } else {
          return api.rpc.author.submitExtrinsic(this.toHex());
        }
      }
    }

    return new SubmittableExtrinsic(api.registry, call);
  }
}
