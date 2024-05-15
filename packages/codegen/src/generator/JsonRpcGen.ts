import { subscriptionsInfo } from '@dedot/api';
import { ApiGen } from './ApiGen.js';
import { TypesGen } from './TypesGen.js';
import { beautifySourceCode, compileTemplate } from './utils.js';

const HIDDEN_RPCS = [
  // Ref: https://github.com/paritytech/polkadot-sdk/blob/43415ef58c143b985e09015cd000dbd65f6d3997/substrate/client/rpc-servers/src/lib.rs#L152C9-L158
  'rpc_methods',
];

const ALIAS_RPCS = [
  // TODO include these into the specs
  'account_nextIndex',
  'system_dryRunAt',
  'state_callAt',
  'state_getKeysPagedAt',
  'state_getStorageAt',
  'state_getStorageHashAt',
  'state_getStorageSizeAt',
  'chain_getRuntimeVersion',
  'chain_getHead',
  'chain_getFinalisedHead',
  'childstate_getKeysPagedAt',

  // Subscription pairs
  'chain_subscribeRuntimeVersion',
  'chain_unsubscribeRuntimeVersion',

  'chain_unsubscribeNewHead',
  'chain_subscribeNewHead',

  'subscribe_newHead',
  'unsubscribe_newHead',

  'chain_subscribeFinalisedHeads',
  'chain_unsubscribeFinalisedHeads',
];

export class JsonRpcGen extends ApiGen {
  constructor(
    readonly typesGen: TypesGen,
    readonly rpcMethods: string[],
  ) {
    super(typesGen);
    HIDDEN_RPCS.filter((one) => !rpcMethods.includes(one)).forEach((one) => rpcMethods.push(one));
    rpcMethods.sort();
  }

  generate(useSubPaths: boolean = false) {
    this.typesGen.clearCache();
    this.typesGen.typeImports.addKnownType('GenericJsonRpcApis', 'RpcVersion');
    this.typesGen.typeImports.addKnownJsonRpcType('JsonRpcApis');

    const toExclude = Object.values(subscriptionsInfo).flat();

    const importTypes = this.typesGen.typeImports.toImports({ useSubPaths });
    const template = compileTemplate('json-rpc.hbs');
    const jsonRpcMethods = this.rpcMethods
      .filter((one) => !ALIAS_RPCS.includes(one)) // exclude alias rpcs
      .filter((one) => !toExclude.includes(one)) // exclude unsubscribe methods
      .map((one) => `'${one}'`)
      .join(' | ');

    return beautifySourceCode(template({ importTypes, jsonRpcMethods }));
  }
}
