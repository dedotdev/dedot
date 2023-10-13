import DelightfulApi from '../DelightfulApi';
import { stringCamelCase } from "@polkadot/util";
import { Pallet } from "@delightfuldot/codecs";

export abstract class Executor {
  readonly #api: DelightfulApi;
  constructor(api: DelightfulApi) {
    this.#api = api;
  }

  get api() {
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

  getPallet(name: string, throwErr = false): Pallet {
    const targetPallet = this.metadata.pallets.find((p) => stringCamelCase(p.name) === name);
    if (!targetPallet && throwErr) {
      throw new Error(`Pallet not found: ${name}`)
    }

    return targetPallet!;
  }

  abstract execute(...paths: string[]): unknown;
}


