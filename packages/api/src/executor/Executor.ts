import type { SubstrateApi } from '@dedot/chaintypes';
import { stringCamelCase } from '@polkadot/util';
import { BlockHash, PalletDefLatest } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { Dedot } from '../client/index.js';

/**
 * @name Executor
 * @description Execution abstraction for a specific action
 */
export abstract class Executor<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #api: Dedot<ChainApi>;
  readonly #atBlockHash?: BlockHash;

  constructor(api: Dedot<ChainApi>, atBlockHash?: BlockHash) {
    this.#api = api;
    this.#atBlockHash = atBlockHash;
  }

  get api(): Dedot<ChainApi> {
    return this.#api;
  }

  get atBlockHash() {
    return this.#atBlockHash;
  }

  get provider() {
    return this.api.provider;
  }

  get registry() {
    return this.api.registry;
  }

  get metadata() {
    return this.api.metadataLatest;
  }

  getPallet(name: string, throwErr = true): PalletDefLatest {
    const targetPallet = this.metadata.pallets.find((p) => stringCamelCase(p.name) === name);
    if (!targetPallet && throwErr) {
      throw new Error(`Pallet not found: ${name}`);
    }

    return targetPallet!;
  }

  abstract execute(...paths: string[]): unknown;
}
