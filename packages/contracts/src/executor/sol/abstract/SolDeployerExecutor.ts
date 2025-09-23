import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { SolRegistry } from '../../../SolRegistry';
import { ExecutionOptions } from '../../../types/index.js';
import { SolExecutor } from './SolExecutor.js';

export abstract class SolDeployerExecutor<ChainApi extends GenericSubstrateApi> extends SolExecutor<ChainApi> {
  readonly code: Hash | Uint8Array | HexString | string;

  constructor(
    client: ISubstrateClient<ChainApi>,
    registry: SolRegistry,
    code: Hash | Uint8Array | HexString | string,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    this.code = code;
  }
}
