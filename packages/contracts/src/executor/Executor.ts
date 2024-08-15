import { ISubstrateClient } from '@dedot/api';
import { SubstrateApi } from '@dedot/api/chaintypes';
import { AccountId32, AccountId32Like } from '@dedot/codecs';
import { GenericSubstrateApi, RpcVersion } from '@dedot/types';
import { TypinkRegistry } from '../TypinkRegistry.js';
import { ContractMessageArg, ContractMessage } from '../types/index.js';
import { ContractMetadata } from '../types/index.js';

export abstract class Executor<ChainApi extends GenericSubstrateApi = SubstrateApi[RpcVersion]> {
  readonly #address?: AccountId32;

  constructor(
    readonly client: ISubstrateClient<ChainApi>,
    readonly registry: TypinkRegistry,
    address?: AccountId32Like,
  ) {
    if (address) {
      this.#address = new AccountId32(address);
    }
  }

  get metadata(): ContractMetadata {
    return this.registry.metadata;
  }

  get address(): AccountId32 | undefined {
    return this.#address;
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
