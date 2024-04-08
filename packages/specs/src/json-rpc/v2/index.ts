import { GenericJsonRpcApis } from '@dedot/types';
import { ChainHeadUnstable, ChainHeadV1 } from './chainHead/index.js';
import { ChainSpecUnstable, ChainSpecV1 } from './chainSpec/index.js';

export * from './types/index.js';

export interface JsonRpcApisV2
  extends ChainHeadUnstable,
    ChainHeadV1,
    ChainSpecUnstable,
    ChainSpecV1,
    GenericJsonRpcApis {}
