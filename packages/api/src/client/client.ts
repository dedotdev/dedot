import { JsonRpcProvider, WsProvider } from '@dedot/providers';
import { RpcV2, RpcVersion, VersionedGenericSubstrateApi } from '@dedot/types';
import { SubstrateApi } from '../chaintypes/index.js';
import { isJsonRpcProvider } from '../json-rpc/index.js';
import { ApiOptions, DedotClientEvent, ISubstrateClient } from '../types.js';
import { DedotClient } from './DedotClient.js';
import { LegacyClient } from './LegacyClient.js';

type PolkadotClientOptions<Rv extends RpcVersion = RpcV2, Auto extends boolean = true> = ApiOptions & {
  rpcVersion?: Rv;
  autoConnect?: Auto;
};

export function createClient<
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
  Rv extends RpcVersion = RpcVersion,
  Auto extends boolean = true,
>(
  options: PolkadotClientOptions<Rv, Auto> | JsonRpcProvider,
): Auto extends true
  ? Promise<ISubstrateClient<ChainApi, Rv, DedotClientEvent>>
  : ISubstrateClient<ChainApi, Rv, DedotClientEvent> {
  let rpcVersion: RpcVersion = 'v2';
  let autoConnect = true;
  if (!isJsonRpcProvider(options)) {
    if (options['rpcVersion'] === 'legacy') {
      rpcVersion = 'legacy';
    }

    if (options['autoConnect'] === false) {
      autoConnect = false;
    }
  }

  let client: ISubstrateClient<ChainApi, Rv>;
  if (rpcVersion === 'legacy') {
    client = new LegacyClient(options) as any;
  } else {
    client = new DedotClient(options) as any;
  }

  if (autoConnect) {
    // @ts-ignore
    return client.connect();
  }

  // @ts-ignore
  return client;
}
