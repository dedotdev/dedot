import { DedotClient, ISubstrateClient, LegacyClient, WsProvider } from 'dedot';
import { TxPaymentInfo } from 'dedot/types';
import { assert } from 'dedot/utils';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const getPaymentInfo = (api: ISubstrateClient): Promise<TxPaymentInfo> => {
    return api.tx.balances.transferKeepAlive(ALICE, BigInt(10 * 1e12)).paymentInfo(BOB);
  };

  const apiV1 = await LegacyClient.new(new WsProvider(wsUri));
  const paymentInfoV1 = await getPaymentInfo(apiV1);

  console.log('[API-V1] Payment Info', paymentInfoV1);
  assert(typeof paymentInfoV1.partialFee === 'bigint', '[API-V1] Partial fee should be of type bigint');

  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  const paymentInfoV2 = await getPaymentInfo(apiV2);

  console.log('[API-V2] Payment Info', paymentInfoV2);
  assert(typeof paymentInfoV2.partialFee === 'bigint', '[API-V2] Partial fee should be of type bigint');
};
