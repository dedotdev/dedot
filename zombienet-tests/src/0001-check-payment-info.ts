import { RpcVersion, TxPaymentInfo } from '@dedot/types';
import { assert, Dedot, DedotClient, ISubstrateClient, WsProvider } from 'dedot';
import { SubstrateApi } from 'dedot/chaintypes';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

export const run = async (nodeName: any, networkInfo: any) => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  const getPaymentInfo = (api: ISubstrateClient<SubstrateApi[RpcVersion]>): Promise<TxPaymentInfo> => {
    return api.tx.balances.transferKeepAlive(ALICE, BigInt(10 * 1e12)).paymentInfo(BOB);
  };

  const apiV1 = await Dedot.new(new WsProvider(wsUri));
  const paymentInfoV1 = await getPaymentInfo(apiV1);

  console.log('Payment Info V1', paymentInfoV1);
  assert(typeof paymentInfoV1.partialFee === 'bigint', '[V1] Partial fee should be of type bigint');

  const apiV2 = await DedotClient.new(new WsProvider(wsUri));
  const paymentInfoV2 = await getPaymentInfo(apiV2);

  console.log('Payment Info V2', paymentInfoV2);
  assert(typeof paymentInfoV2.partialFee === 'bigint', '[V2] Partial fee should be of type bigint');
};
