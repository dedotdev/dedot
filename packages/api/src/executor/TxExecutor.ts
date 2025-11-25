import * as $ from '@dedot/shape';
import type { GenericTxCall, IRuntimeTxCall } from '@dedot/types';
import { assert, stringCamelCase, stringPascalCase, UnknownApiError } from '@dedot/utils';
import { SubmittableExtrinsic } from '../extrinsic/index.js';
import { ISubstrateClient } from '../types.js';
import { Executor } from './Executor.js';

/**
 * @name TxExecutor
 * @description Execute a transaction instruction, returns a submittable extrinsic
 */
export class TxExecutor extends Executor {
  doExecute(pallet: string, functionName: string) {
    const targetPallet = this.getPallet(pallet);

    assert(targetPallet.calls, new UnknownApiError(`Tx calls are not available for pallet ${targetPallet.name}`));

    const txType = this.metadata.types[targetPallet.calls.typeId]!;

    assert(txType.typeDef.type === 'Enum', new UnknownApiError('Tx type defs should be enum'));

    const isFlatEnum = txType.typeDef.value.members.every((m) => m.fields.length === 0);
    const txCallDef = txType.typeDef.value.members.find((m) => stringCamelCase(m.name) === functionName);
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

  protected createExtrinsic(call: IRuntimeTxCall): any {
    return new SubmittableExtrinsic(this.client as ISubstrateClient, call);
  }
}
