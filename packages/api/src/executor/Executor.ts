import type { BlockHash, PalletDefLatest } from '@dedot/codecs';
import type { GenericSubstrateApi } from '@dedot/types';
import { assert, stringCamelCase, UnknownApiError } from '@dedot/utils';
import type { SubstrateApi } from '../chaintypes/index.js';
import { ISubstrateApi } from '../types.js';

/**
 * @name Executor
 * @description Execution abstraction for a specific action
 */
export abstract class Executor<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #api: ISubstrateApi<ChainApi>;
  readonly #atBlockHash?: BlockHash;

  constructor(api: ISubstrateApi<ChainApi>, atBlockHash?: BlockHash) {
    this.#api = api;
    this.#atBlockHash = atBlockHash;
  }

  get api(): ISubstrateApi<ChainApi> {
    return this.#api;
  }

  get atBlockHash() {
    return this.#atBlockHash || this.api.atBlockHash;
  }

  get registry() {
    return this.api.registry;
  }

  get metadata() {
    return this.api.metadata.latest;
  }

  getPallet(name: string): PalletDefLatest {
    const targetPallet = this.metadata.pallets.find((p) => stringCamelCase(p.name) === name);

    assert(targetPallet, new UnknownApiError(`Pallet not found: ${name}`));

    return targetPallet;
  }

  execute(...paths: string[]): unknown {
    try {
      return this.doExecute(...paths);
    } catch (e: any) {
      if (!this.api.options?.throwOnUnknownApi && e instanceof UnknownApiError) {
        return undefined;
      }

      throw e;
    }
  }

  abstract doExecute(...paths: string[]): unknown;
}
