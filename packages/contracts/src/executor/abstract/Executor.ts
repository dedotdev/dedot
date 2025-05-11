import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { TypinkRegistry } from '../../TypinkRegistry.js';
import { ContractMessageArg, ContractMessage, ExecutionOptions, ContractMetadata } from '../../types/index.js';
import { palletReviveCompatible } from '../../utils.js';

export abstract class Executor<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  readonly palletReviveCompatible: boolean;

  protected constructor(
    readonly client: ISubstrateClient<ChainApi>,
    readonly registry: TypinkRegistry,
    readonly options: ExecutionOptions = {},
  ) {
    this.palletReviveCompatible = palletReviveCompatible(this.registry.metadata);
  }

  get metadata(): ContractMetadata {
    return this.registry.metadata;
  }

  abstract doExecute(...paths: string[]): unknown;

  tryEncode(param: ContractMessageArg, value: any) {
    const { type } = param.type;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }

  tryDecode(meta: ContractMessage, raw: any) {
    const {
      returnType: { type },
    } = meta;

    const $codec = this.registry.findCodec(type);

    return $codec.tryDecode(raw);
  }
}
