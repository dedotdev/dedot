import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { ExecutionOptions } from '../../../types/index.js';
import { SolExecutor } from './SolExecutor.js';
import { ConstructorFragment, Interface } from '@ethersproject/abi';

export abstract class SolDeployerExecutor<ChainApi extends GenericSubstrateApi> extends SolExecutor<ChainApi> {
  readonly code: Hash | Uint8Array | HexString | string;

  constructor(
    client: ISubstrateClient<ChainApi>,
    interf: Interface,
    code: Hash | Uint8Array | HexString | string,
    options?: ExecutionOptions,
  ) {
    super(client, interf, options);

    this.code = code;
  }

  protected findConstructorFragment(): ConstructorFragment | undefined {
    return this.interf.deploy;
  }
}
