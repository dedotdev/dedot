import { ContractMetadata, ContractMetadataSupported, GenericContractApi, GenericSubstrateApi } from '@dedot/types';
import { Dedot, Hash, isWasm, TypinkRegistry } from 'dedot';
import { ConstructorExecutor } from './ConstructorExecutor';
import { newProxyChain } from './Contract';

export class ContractDeployer<ContractApi extends GenericContractApi, ChainApi extends GenericSubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #metadata: ContractMetadataSupported;
  readonly #registry: TypinkRegistry;
  #code?: Hash | Uint8Array | string;

  constructor(api: Dedot<ChainApi>, metadata: ContractMetadataSupported | string) {
    this.#api = api;
    this.#metadata = typeof metadata === 'string' ? new ContractMetadata(metadata).metadata : metadata;
    this.#registry = new TypinkRegistry(this.#metadata);
  }

  static async create<ContractApi extends GenericContractApi, ChainApi extends GenericSubstrateApi>(
    api: Dedot<ChainApi>,
    metadata: ContractMetadataSupported | string,
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

  get tx(): ContractApi['constructor'] {
    return newProxyChain<ChainApi>(
      new ConstructorExecutor<ChainApi>(this.#api, this.#registry, this.#code!),
    ) as ContractApi['constructor'];
  }
}
