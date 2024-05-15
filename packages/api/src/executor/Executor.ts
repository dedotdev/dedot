import type { BlockHash, PalletDefLatest } from '@dedot/codecs';
import type { GenericSubstrateApi } from '@dedot/types';
import { assert, stringCamelCase, UnknownApiError } from '@dedot/utils';
import { ISubstrateClientAt } from '../types.js';

/**
 * @name Executor
 * @description Execution abstraction for a specific action
 */
export abstract class Executor<ChainApi extends GenericSubstrateApi = GenericSubstrateApi> {
  readonly #atBlockHash?: BlockHash;

  constructor(
    public api: ISubstrateClientAt<ChainApi>,
    atBlockHash?: BlockHash,
  ) {
    this.#atBlockHash = atBlockHash;
  }

  get atBlockHash() {
    return this.#atBlockHash || this.api.atBlockHash;
  }

  get registry() {
    return this.api.registry;
  }

  get metadata() {
    return this.registry.metadata;
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
