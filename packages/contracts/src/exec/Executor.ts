import { Dedot } from 'dedot';
import { Arg, ContractMessage, ContractMetadata } from '../types';
import { AccountId32, MetadataLatest, PortableRegistry } from '@dedot/codecs';
import { extractContractTypes } from '../utils';

export default abstract class Executor {
  readonly #api: Dedot;
  readonly #address: AccountId32;
  readonly #contractMetadata: ContractMetadata;
  readonly #registry: PortableRegistry;

  constructor(api: Dedot, contractMetadata: ContractMetadata, address: AccountId32 | string) {
    this.#api = api;
    this.#contractMetadata = contractMetadata;
    this.#address = new AccountId32(address);
    this.#registry = new PortableRegistry({ types: extractContractTypes(contractMetadata) } as MetadataLatest);
  }

  get api(): Dedot {
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
