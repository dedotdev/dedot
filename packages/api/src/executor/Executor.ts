import type { BlockHash, PalletDefLatest } from '@dedot/codecs';
import type { RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { assert, stringCamelCase, UnknownApiError } from '@dedot/utils';
import { HashOrSource, ISubstrateClient } from '../types.js';

/**
 * @name Executor
 * @description Execution abstraction for a specific action
 */
export abstract class Executor<ChainApi extends VersionedGenericSubstrateApi = VersionedGenericSubstrateApi> {
  constructor(
    public api: ISubstrateClient<ChainApi[RpcVersion]>,
    public hashOrSource?: HashOrSource,
  ) {}

  async toBlockHash(hashOrSource?: HashOrSource): Promise<BlockHash | undefined> {
    if (hashOrSource === 'best') return;
    if (hashOrSource === 'finalized') {
      // @ts-ignore TODO we need a better way / more organized way to archive this
      if (this.chainHead) {
        // @ts-ignore
        return this.chainHead.finalizedHash as BlockHash;
      } else {
        return (await this.api.rpc.chain_getFinalizedHead()) as BlockHash;
      }
    }

    return hashOrSource;
  }

  get provider() {
    return this.api.provider;
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
