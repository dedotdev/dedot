import { AccountId32 } from '@dedot/codecs';
import { TypinkRegistry } from '@dedot/codecs/registry/TypinkRegistry';
import { Arg, ContractMessage, ContractMetadataSupported } from '@dedot/types';
import { GenericSubstrateApi } from '@dedot/types';
import { Dedot } from 'dedot';

export default abstract class Executor<ChainApi extends GenericSubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #registry: TypinkRegistry;
  readonly #address?: AccountId32;

  constructor(api: Dedot<ChainApi>, registry: TypinkRegistry, address?: AccountId32 | string) {
    this.#api = api;
    this.#registry = registry;
    if (address) {
      this.#address = new AccountId32(address);
    }
  }

  get api(): Dedot<ChainApi> {
    return this.#api;
  }

  get contractMetadata(): ContractMetadataSupported {
    return this.#registry.metadata;
  }

  get address(): AccountId32 | undefined {
    if (this.#address) {
      return this.#address;
    }
  }

  get registry() {
    return this.#registry;
  }

  abstract doExecute(...paths: string[]): unknown;

  tryEncode(param: Arg, value: any) {
    const { type } = param.type;

    const $codec = this.registry.findCodec(type);

    return $codec.tryEncode(value);
  }

  tryDecode(messageMeta: ContractMessage, raw: any) {
    const {
      returnType: { type },
    } = messageMeta;

    const $codec = this.registry.findCodec(type);

    return $codec.tryDecode(raw);
  }
}
