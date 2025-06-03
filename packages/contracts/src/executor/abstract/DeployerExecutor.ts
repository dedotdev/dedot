import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { TypinkRegistry } from '../../TypinkRegistry.js';
import { ContractConstructorMessage, ExecutionOptions } from '../../types/index.js';
import { normalizeLabel } from '../../utils/index.js';
import { Executor } from './Executor.js';

export abstract class DeployerExecutor<ChainApi extends GenericSubstrateApi> extends Executor<ChainApi> {
  readonly code: Hash | Uint8Array | HexString | string;

  constructor(
    client: ISubstrateClient<ChainApi>,
    registry: TypinkRegistry,
    code: Hash | Uint8Array | HexString | string,
    options?: ExecutionOptions,
  ) {
    super(client, registry, options);

    // TODO validate code based on ink! version (wasm or pvm)
    this.code = code;
  }

  protected findConstructorMeta(constructor: string): ContractConstructorMessage | undefined {
    return this.metadata.spec.constructors.find((one) => normalizeLabel(one.label) === constructor);
  }
}
