import type { SubstrateApi } from '@delightfuldot/chaintypes';
import { stringCamelCase } from '@polkadot/util';
import { PalletDefLatest } from '@delightfuldot/codecs';
import { GenericSubstrateApi } from '@delightfuldot/types';
import DelightfulApi from '../DelightfulApi';

/**
 * @name Executor
 * @description Execution abstraction for a specific action
 */
export abstract class Executor<ChainApi extends GenericSubstrateApi = SubstrateApi> {
  readonly #api: DelightfulApi<ChainApi>;
  constructor(api: DelightfulApi<ChainApi>) {
    this.#api = api;
  }

  get api(): DelightfulApi<ChainApi> {
    return this.#api;
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
