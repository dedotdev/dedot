import { ISubstrateClient } from '@dedot/api';
import { Hash } from '@dedot/codecs';
import { GenericSubstrateApi } from '@dedot/types';
import { HexString } from '@dedot/utils';
import { ExecutionOptions, SolABI, SolABIConstructor } from '../../../types/index.js';
import { SolExecutor } from './SolExecutor.js';

export abstract class SolDeployerExecutor<ChainApi extends GenericSubstrateApi> extends SolExecutor<ChainApi> {
  readonly code: Hash | Uint8Array | HexString | string;

  constructor(
    client: ISubstrateClient<ChainApi>,
    abi: SolABI,
    code: Hash | Uint8Array | HexString | string,
    options?: ExecutionOptions,
  ) {
    super(client, abi, options);

    this.code = code;
  }

  protected findConstructorFragment(): SolABIConstructor {
    let fragment = this.abi.find((a) => a.type === 'constructor') as SolABIConstructor;

    // Fallback to default constructor
    if (!fragment) {
      fragment = {
        inputs: [],
        stateMutability: 'nonpayable',
        type: 'constructor',
      } as SolABIConstructor;
    }

    return fragment;
  }
}
