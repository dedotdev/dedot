import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { SolRegistry } from '../../../SolRegistry.js';
import { ExecutionOptions } from '../../../types/index.js';
import { SolExecutor } from './SolExecutor.js';

export abstract class SolDeployerExecutor extends SolExecutor {
  readonly code: Hash | Uint8Array | HexString | string;

  constructor(
    client: ISubstrateClient,
    registry: SolRegistry,
    code: Hash | Uint8Array | HexString | string,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    this.code = code;
  }
}
