// Generated by dedot cli

import type { BytesLike, H160 } from 'dedot/codecs';
import type {
  ContractSubmittableExtrinsic,
  ContractTxOptions,
  GenericContractTx,
  GenericContractTxCall,
} from 'dedot/contracts';
import type { GenericSubstrateApi } from 'dedot/types';

export interface ContractTx<ChainApi extends GenericSubstrateApi> extends GenericContractTx<ChainApi> {
  /**
   *
   * @param {H160} to
   * @param {bigint} value
   * @param {BytesLike} data
   * @param {ContractTxOptions} options
   *
   * @selector 0xdb20f9f5
   **/
  psp22Transfer: GenericContractTxCall<
    ChainApi,
    (to: H160, value: bigint, data: BytesLike, options?: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >;

  /**
   *
   * @param {H160} from
   * @param {H160} to
   * @param {bigint} value
   * @param {BytesLike} data
   * @param {ContractTxOptions} options
   *
   * @selector 0x54b3c76e
   **/
  psp22TransferFrom: GenericContractTxCall<
    ChainApi,
    (
      from: H160,
      to: H160,
      value: bigint,
      data: BytesLike,
      options?: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >;

  /**
   *
   * @param {H160} spender
   * @param {bigint} value
   * @param {ContractTxOptions} options
   *
   * @selector 0xb20f1bbd
   **/
  psp22Approve: GenericContractTxCall<
    ChainApi,
    (spender: H160, value: bigint, options?: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >;

  /**
   *
   * @param {H160} spender
   * @param {bigint} deltaValue
   * @param {ContractTxOptions} options
   *
   * @selector 0x96d6b57a
   **/
  psp22IncreaseAllowance: GenericContractTxCall<
    ChainApi,
    (spender: H160, deltaValue: bigint, options?: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >;

  /**
   *
   * @param {H160} spender
   * @param {bigint} deltaValue
   * @param {ContractTxOptions} options
   *
   * @selector 0xfecb57d5
   **/
  psp22DecreaseAllowance: GenericContractTxCall<
    ChainApi,
    (spender: H160, deltaValue: bigint, options?: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >;
}
