import type { BlockHash, PalletDefLatest } from '@dedot/codecs';
import { assert, HexString, isNumber, stringCamelCase, UnknownApiError } from '@dedot/utils';
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
    readonly client: ISubstrateClientAt<any> | ISubstrateClient<any, any>,
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

  /**
   * Check if a parameter type is an Option type
   */
  protected isOptionalParam(typeId: number): boolean {
    try {
      const type = this.registry.findType(typeId);
      const { typeDef, path } = type;

      // Check if it's an Enum with path "Option"
      if (typeDef.type === 'Enum' && path.join('::') === 'Option') {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Pad args array with undefined for missing trailing optional parameters.
   * This allows users to omit optional parameters at the end of the parameter list.
   */
  protected padArgsForOptionalParams<T extends { typeId?: number }>(args: any[], params: T[]): any[] {
    // If args already match params length, no padding needed
    if (args.length === params.length) {
      return args;
    }

    // If more args than params, validation will fail later
    if (args.length > params.length) {
      return args;
    }

    // Check that all missing parameters are optional
    for (let i = args.length; i < params.length; i++) {
      const param = params[i];
      if (!isNumber(param.typeId) || !this.isOptionalParam(param.typeId)) {
        // Required parameter is missing, let the validation fail naturally
        return args;
      }
    }

    // All missing parameters are optional, pad with undefined
    return [...args, ...Array(params.length - args.length).fill(undefined)];
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
