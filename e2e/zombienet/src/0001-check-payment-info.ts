import { DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { TxPaymentInfo } from 'dedot/types';
import { assert } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const getPaymentInfo = (api: ISubstrateClient): Promise<TxPaymentInfo> => {
    return api.tx.balances.transferKeepAlive(ALICE, BigInt(10 * 1e12)).paymentInfo(BOB);
  };

  const apiLegacy = await DedotClient.new({ provider: new WsProvider(wsUri), rpcVersion: 'legacy' });
  const paymentInfoLegacy = await getPaymentInfo(apiLegacy);

  console.log('[Legacy] Payment Info', paymentInfoLegacy);
  assert(typeof paymentInfoLegacy.partialFee === 'bigint', '[Legacy] Partial fee should be of type bigint');

  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  const paymentInfoV2 = await getPaymentInfo(apiV2);

  console.log('[V2] Payment Info', paymentInfoV2);
  assert(typeof paymentInfoV2.partialFee === 'bigint', '[V2] Partial fee should be of type bigint');
};
