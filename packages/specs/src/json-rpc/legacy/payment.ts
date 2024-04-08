import { GenericJsonRpcApis } from '@dedot/types';
import { BlockHash, Bytes, FeeDetails, RuntimeDispatchInfo } from '@dedot/codecs';

export interface PaymentJsonRpcApis extends GenericJsonRpcApis {
  /**
   * Query the detailed fee of a given encoded extrinsic
   *
   * @rpcname payment_queryFeeDetails
   * @param {Bytes} extrinsic
   * @param {BlockHash} at
   **/
  payment_queryFeeDetails: (extrinsic: Bytes, at?: BlockHash) => Promise<FeeDetails>;

  /**
   * Retrieves the fee information for an encoded extrinsic
   *
   * @rpcname payment_queryInfo
   * @param {Bytes} extrinsic
   * @param {BlockHash} at
   **/
  payment_queryInfo: (extrinsic: Bytes, at?: BlockHash) => Promise<RuntimeDispatchInfo>;
}
