import type { BlockHash, PalletDefLatest } from '@dedot/codecs';
import { assert, HexString, stringCamelCase, UnknownApiError } from '@dedot/utils';
import { ISubstrateClient, ISubstrateClientAt } from '../types.js';

export interface StateCallParams {
  func: string;
  params: HexString;
  at?: BlockHash;
}

/**
 * @name Executor
 * @description Execution abstraction for a specific action
 */
export abstract class Executor {
  readonly #atBlockHash?: BlockHash;

  constructor(
    readonly client: ISubstrateClientAt<any, any> | ISubstrateClient<any, any, any>,
    atBlockHash?: BlockHash,
  ) {
    this.#atBlockHash = atBlockHash;
  }

  get atBlockHash() {
    // @ts-ignore
    return this.#atBlockHash || this.client.atBlockHash;
  }

  get registry() {
    return this.client.registry;
  }

  get metadata() {
    return this.registry.metadata;
  }

  getPallet(name: string): PalletDefLatest {
    const targetPallet = this.metadata.pallets.find((p) => stringCamelCase(p.name) === name);

    assert(targetPallet, new UnknownApiError(`Pallet not found: ${name}`));

    return targetPallet;
  }

  protected stateCall(callParams: StateCallParams): Promise<HexString> {
    const { func, params, at } = callParams;

    const args = [func, params];
    if (at) args.push(at);

    return this.client.rpc.state_call(...args);
  }

  execute(...paths: string[]): unknown {
    try {
      return this.doExecute(...paths);
    } catch (e: any) {
      if (!this.client.options?.throwOnUnknownApi && e instanceof UnknownApiError) {
        return undefined;
      }

      throw e;
    }
  }

  abstract doExecute(...paths: string[]): unknown;
}
