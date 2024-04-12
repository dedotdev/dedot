import { Dedot } from 'dedot';
import { Arg, ContractMessage, ContractMetadata } from '../types';
import { AccountId32, MetadataLatest, PortableRegistry } from '@dedot/codecs';
import { extractContractTypes } from '../utils';
import { GenericSubstrateApi } from '@dedot/types';

export default abstract class Executor<ChainApi extends GenericSubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #address: AccountId32;
  readonly #contractMetadata: ContractMetadata;
  readonly #registry: PortableRegistry;

  constructor(api: Dedot<ChainApi>, contractMetadata: ContractMetadata, address: AccountId32 | string) {
    this.#api = api;
    this.#contractMetadata = contractMetadata;
    this.#address = new AccountId32(address);
    this.#registry = new PortableRegistry({ types: extractContractTypes(contractMetadata) } as MetadataLatest);
  }

  get api(): Dedot<ChainApi> {
    return this.#api;
  }

  get contractMetadata(): ContractMetadata {
    return this.#contractMetadata;
  }

  get address(): AccountId32 {
    return this.#address;
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
