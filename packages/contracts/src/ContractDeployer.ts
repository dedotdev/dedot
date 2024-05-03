import { GenericSubstrateApi } from '@dedot/types';
import { Dedot, Hash, isWasm } from 'dedot';
import { newProxyChain, ensureSupportContractsPallet } from './Contract.js';
import { TypinkRegistry } from './TypinkRegistry.js';
import { ConstructorExecutor } from './executor/index.js';
import { ContractMetadata, GenericContractApi } from './types/index.js';
import { parseRawMetadata } from './utils.js';

export class ContractDeployer<ContractApi extends GenericContractApi, ChainApi extends GenericSubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #metadata: ContractMetadata;
  readonly #registry: TypinkRegistry;
  #code?: Hash | Uint8Array | string;

  constructor(api: Dedot<ChainApi>, metadata: ContractMetadata | string) {
    ensureSupportContractsPallet(api);

    this.#api = api;
    this.#metadata = typeof metadata === 'string' ? parseRawMetadata(metadata) : metadata;
    this.#registry = new TypinkRegistry(this.#metadata);
  }

  static async create<ContractApi extends GenericContractApi, ChainApi extends GenericSubstrateApi>(
    api: Dedot<ChainApi>,
    metadata: ContractMetadata | string,
    code?: Hash | Uint8Array | string,
  ): Promise<ContractDeployer<ContractApi, ChainApi>> {
    const deployer = new ContractDeployer<ContractApi, ChainApi>(api, metadata);

    code = code || deployer.#metadata.source.hash;
    if (!isWasm(code)) {
      const isUploaded = await deployer.#isUploadedCodeHash(code as Hash);

      if (!isUploaded && !deployer.#metadata.source.wasm) {
        throw new Error(`Code hash is not on chain ${code}`);
      }

      code = isUploaded ? code : deployer.#metadata.source.wasm;
    }

    deployer.#code = code;

    return deployer;
  }

  async #isUploadedCodeHash(code: Hash): Promise<boolean> {
    const codeInfo = await this.#api.query.contracts.codeInfoOf(code);

    return !!codeInfo;
  }

  get metadata(): ContractMetadata {
    return this.#metadata;
  }

  get registry(): TypinkRegistry {
    return this.#registry;
  }

  get tx(): ContractApi['constructor'] {
    return newProxyChain<ChainApi>(
      new ConstructorExecutor<ChainApi>(this.#api, this.#registry, this.#code!),
    ) as ContractApi['constructor'];
  }
}
