import { LegacyJsonRpcApis } from './legacy/index.js';
import { JsonRpcApisV2 } from './v2/index.js';

export * from './legacy/index.js';
export * from './v2/index.js';
export * from './subscriptionsInfo.js';
export * from './scaleResponses.js';

export interface JsonRpcApis extends LegacyJsonRpcApis, JsonRpcApisV2 {}
