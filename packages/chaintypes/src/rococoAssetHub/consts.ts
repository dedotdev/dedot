// Generated by @delightfuldot/codegen

import type { GenericChainConsts } from '@delightfuldot/types';
import type { RuntimeVersion, Bytes, Permill } from '@delightfuldot/codecs';
import type {
  FrameSystemLimitsBlockWeights,
  FrameSystemLimitsBlockLength,
  SpWeightsRuntimeDbWeight,
  SpWeightsWeightV2Weight,
  PalletNftsBitFlagsPalletFeature,
  FrameSupportPalletId,
  StagingXcmV3MultilocationMultiLocation,
} from './types';

export interface ChainConsts extends GenericChainConsts {
  system: {
    /**
     * Block & extrinsics weights: base values and limits.
     **/
    blockWeights: FrameSystemLimitsBlockWeights;

    /**
     * The maximum length of a block (in bytes).
     **/
    blockLength: FrameSystemLimitsBlockLength;

    /**
     * Maximum number of block number to block hash mappings to keep (oldest pruned first).
     **/
    blockHashCount: number;

    /**
     * The weight of runtime database operations the runtime can invoke.
     **/
    dbWeight: SpWeightsRuntimeDbWeight;

    /**
     * Get the chain's current version.
     **/
    version: RuntimeVersion;

    /**
     * The designated SS58 prefix of this chain.
     *
     * This replaces the "ss58Format" property declared in the chain spec. Reason is
     * that the runtime should know about the prefix in order to make use of it as
     * an identifier of the chain.
     **/
    ss58Prefix: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  parachainSystem: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  timestamp: {
    /**
     * The minimum period between blocks.
     *
     * Be aware that this is different to the *expected* period that the block production
     * apparatus provides. Your chosen consensus system will generally work with this to
     * determine a sensible block time. For example, in the Aura pallet it will be double this
     * period on default settings.
     **/
    minimumPeriod: bigint;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  parachainInfo: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  balances: {
    /**
     * The minimum amount required to keep an account open. MUST BE GREATER THAN ZERO!
     *
     * If you *really* need it to be zero, you can enable the feature `insecure_zero_ed` for
     * this pallet. However, you do so at your own risk: this will open up a major DoS vector.
     * In case you have multiple sources of provider references, you may also get unexpected
     * behaviour if you set this to zero.
     *
     * Bottom line: Do yourself a favour and make it at least one!
     **/
    existentialDeposit: bigint;

    /**
     * The maximum number of locks that should exist on an account.
     * Not strictly enforced, but used for weight estimation.
     **/
    maxLocks: number;

    /**
     * The maximum number of named reserves that can exist on an account.
     **/
    maxReserves: number;

    /**
     * The maximum number of individual freeze locks that can exist on an account at any time.
     **/
    maxFreezes: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  transactionPayment: {
    /**
     * A fee multiplier for `Operational` extrinsics to compute "virtual tip" to boost their
     * `priority`
     *
     * This value is multiplied by the `final_fee` to obtain a "virtual tip" that is later
     * added to a tip component in regular `priority` calculations.
     * It means that a `Normal` transaction can front-run a similarly-sized `Operational`
     * extrinsic (with no tip), by including a tip value greater than the virtual tip.
     *
     * ```rust,ignore
     * // For `Normal`
     * let priority = priority_calc(tip);
     *
     * // For `Operational`
     * let virtual_tip = (inclusion_fee + tip) * OperationalFeeMultiplier;
     * let priority = priority_calc(tip + virtual_tip);
     * ```
     *
     * Note that since we use `final_fee` the multiplier applies also to the regular `tip`
     * sent with the transaction. So, not only does the transaction get a priority bump based
     * on the `inclusion_fee`, but we also amplify the impact of tips applied to `Operational`
     * transactions.
     **/
    operationalFeeMultiplier: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  assetTxPayment: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  authorship: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  collatorSelection: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  session: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  aura: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  auraExt: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  xcmpQueue: {
    /**
     * The maximum number of inbound XCMP channels that can be suspended simultaneously.
     *
     * Any further channel suspensions will fail and messages may get dropped without further
     * notice. Choosing a high value (1000) is okay; the trade-off that is described in
     * [`InboundXcmpSuspended`] still applies at that scale.
     **/
    maxInboundSuspended: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  polkadotXcm: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  cumulusXcm: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  messageQueue: {
    /**
     * The size of the page; this implies the maximum message size which can be sent.
     *
     * A good value depends on the expected message sizes, their weights, the weight that is
     * available for processing them and the maximal needed message size. The maximal message
     * size is slightly lower than this as defined by [`MaxMessageLenOf`].
     **/
    heapSize: number;

    /**
     * The maximum number of stale pages (i.e. of overweight messages) allowed before culling
     * can happen. Once there are more stale pages than this, then historical pages may be
     * dropped, even if they contain unprocessed overweight messages.
     **/
    maxStale: number;

    /**
     * The amount of weight (if any) which should be provided to the message queue for
     * servicing enqueued items.
     *
     * This may be legitimately `None` in the case that you will call
     * `ServiceQueues::service_queues` manually.
     **/
    serviceWeight: SpWeightsWeightV2Weight | undefined;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  utility: {
    /**
     * The limit on the number of batched calls.
     **/
    batchedCallsLimit: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  multisig: {
    /**
     * The base amount of currency needed to reserve for creating a multisig execution or to
     * store a dispatch call for later.
     *
     * This is held for an additional storage item whose value size is
     * `4 + sizeof((BlockNumber, Balance, AccountId))` bytes and whose key size is
     * `32 + sizeof(AccountId)` bytes.
     **/
    depositBase: bigint;

    /**
     * The amount of currency needed per unit threshold when creating a multisig execution.
     *
     * This is held for adding 32 bytes more into a pre-existing storage value.
     **/
    depositFactor: bigint;

    /**
     * The maximum amount of signatories allowed in the multisig.
     **/
    maxSignatories: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  proxy: {
    /**
     * The base amount of currency needed to reserve for creating a proxy.
     *
     * This is held for an additional storage item whose value size is
     * `sizeof(Balance)` bytes and whose key size is `sizeof(AccountId)` bytes.
     **/
    proxyDepositBase: bigint;

    /**
     * The amount of currency needed per proxy added.
     *
     * This is held for adding 32 bytes plus an instance of `ProxyType` more into a
     * pre-existing storage value. Thus, when configuring `ProxyDepositFactor` one should take
     * into account `32 + proxy_type.encode().len()` bytes of data.
     **/
    proxyDepositFactor: bigint;

    /**
     * The maximum amount of proxies allowed for a single account.
     **/
    maxProxies: number;

    /**
     * The maximum amount of time-delayed announcements that are allowed to be pending.
     **/
    maxPending: number;

    /**
     * The base amount of currency needed to reserve for creating an announcement.
     *
     * This is held when a new storage item holding a `Balance` is created (typically 16
     * bytes).
     **/
    announcementDepositBase: bigint;

    /**
     * The amount of currency needed per announcement made.
     *
     * This is held for adding an `AccountId`, `Hash` and `BlockNumber` (typically 68 bytes)
     * into a pre-existing storage value.
     **/
    announcementDepositFactor: bigint;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  toWestendXcmRouter: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  assets: {
    /**
     * Max number of items to destroy per `destroy_accounts` and `destroy_approvals` call.
     *
     * Must be configured to result in a weight that makes each call fit in a block.
     **/
    removeItemsLimit: number;

    /**
     * The basic amount of funds that must be reserved for an asset.
     **/
    assetDeposit: bigint;

    /**
     * The amount of funds that must be reserved for a non-provider asset account to be
     * maintained.
     **/
    assetAccountDeposit: bigint;

    /**
     * The basic amount of funds that must be reserved when adding metadata to your asset.
     **/
    metadataDepositBase: bigint;

    /**
     * The additional funds that must be reserved for the number of bytes you store in your
     * metadata.
     **/
    metadataDepositPerByte: bigint;

    /**
     * The amount of funds that must be reserved when creating a new approval.
     **/
    approvalDeposit: bigint;

    /**
     * The maximum length of a name or symbol stored on-chain.
     **/
    stringLimit: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  uniques: {
    /**
     * The basic amount of funds that must be reserved for collection.
     **/
    collectionDeposit: bigint;

    /**
     * The basic amount of funds that must be reserved for an item.
     **/
    itemDeposit: bigint;

    /**
     * The basic amount of funds that must be reserved when adding metadata to your item.
     **/
    metadataDepositBase: bigint;

    /**
     * The basic amount of funds that must be reserved when adding an attribute to an item.
     **/
    attributeDepositBase: bigint;

    /**
     * The additional funds that must be reserved for the number of bytes store in metadata,
     * either "normal" metadata or attribute metadata.
     **/
    depositPerByte: bigint;

    /**
     * The maximum length of data stored on-chain.
     **/
    stringLimit: number;

    /**
     * The maximum length of an attribute key.
     **/
    keyLimit: number;

    /**
     * The maximum length of an attribute value.
     **/
    valueLimit: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  nfts: {
    /**
     * The basic amount of funds that must be reserved for collection.
     **/
    collectionDeposit: bigint;

    /**
     * The basic amount of funds that must be reserved for an item.
     **/
    itemDeposit: bigint;

    /**
     * The basic amount of funds that must be reserved when adding metadata to your item.
     **/
    metadataDepositBase: bigint;

    /**
     * The basic amount of funds that must be reserved when adding an attribute to an item.
     **/
    attributeDepositBase: bigint;

    /**
     * The additional funds that must be reserved for the number of bytes store in metadata,
     * either "normal" metadata or attribute metadata.
     **/
    depositPerByte: bigint;

    /**
     * The maximum length of data stored on-chain.
     **/
    stringLimit: number;

    /**
     * The maximum length of an attribute key.
     **/
    keyLimit: number;

    /**
     * The maximum length of an attribute value.
     **/
    valueLimit: number;

    /**
     * The maximum approvals an item could have.
     **/
    approvalsLimit: number;

    /**
     * The maximum attributes approvals an item could have.
     **/
    itemAttributesApprovalsLimit: number;

    /**
     * The max number of tips a user could send.
     **/
    maxTips: number;

    /**
     * The max duration in blocks for deadlines.
     **/
    maxDeadlineDuration: number;

    /**
     * The max number of attributes a user could set per call.
     **/
    maxAttributesPerCall: number;

    /**
     * Disables some of pallet's features.
     **/
    features: PalletNftsBitFlagsPalletFeature;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  foreignAssets: {
    /**
     * Max number of items to destroy per `destroy_accounts` and `destroy_approvals` call.
     *
     * Must be configured to result in a weight that makes each call fit in a block.
     **/
    removeItemsLimit: number;

    /**
     * The basic amount of funds that must be reserved for an asset.
     **/
    assetDeposit: bigint;

    /**
     * The amount of funds that must be reserved for a non-provider asset account to be
     * maintained.
     **/
    assetAccountDeposit: bigint;

    /**
     * The basic amount of funds that must be reserved when adding metadata to your asset.
     **/
    metadataDepositBase: bigint;

    /**
     * The additional funds that must be reserved for the number of bytes you store in your
     * metadata.
     **/
    metadataDepositPerByte: bigint;

    /**
     * The amount of funds that must be reserved when creating a new approval.
     **/
    approvalDeposit: bigint;

    /**
     * The maximum length of a name or symbol stored on-chain.
     **/
    stringLimit: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  nftFractionalization: {
    /**
     * The deposit paid by the user locking an NFT. The deposit is returned to the original NFT
     * owner when the asset is unified and the NFT is unlocked.
     **/
    deposit: bigint;

    /**
     * The pallet's id, used for deriving its sovereign account ID.
     **/
    palletId: FrameSupportPalletId;

    /**
     * The newly created asset's symbol.
     **/
    newAssetSymbol: Bytes;

    /**
     * The newly created asset's name.
     **/
    newAssetName: Bytes;

    /**
     * The maximum length of a name or symbol stored on-chain.
     **/
    stringLimit: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  poolAssets: {
    /**
     * Max number of items to destroy per `destroy_accounts` and `destroy_approvals` call.
     *
     * Must be configured to result in a weight that makes each call fit in a block.
     **/
    removeItemsLimit: number;

    /**
     * The basic amount of funds that must be reserved for an asset.
     **/
    assetDeposit: bigint;

    /**
     * The amount of funds that must be reserved for a non-provider asset account to be
     * maintained.
     **/
    assetAccountDeposit: bigint;

    /**
     * The basic amount of funds that must be reserved when adding metadata to your asset.
     **/
    metadataDepositBase: bigint;

    /**
     * The additional funds that must be reserved for the number of bytes you store in your
     * metadata.
     **/
    metadataDepositPerByte: bigint;

    /**
     * The amount of funds that must be reserved when creating a new approval.
     **/
    approvalDeposit: bigint;

    /**
     * The maximum length of a name or symbol stored on-chain.
     **/
    stringLimit: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  assetConversion: {
    /**
     * A % the liquidity providers will take of every swap. Represents 10ths of a percent.
     **/
    lpFee: number;

    /**
     * A one-time fee to setup the pool.
     **/
    poolSetupFee: bigint;

    /**
     * Asset class from [`Config::Assets`] used to pay the [`Config::PoolSetupFee`].
     **/
    poolSetupFeeAsset: StagingXcmV3MultilocationMultiLocation;

    /**
     * A fee to withdraw the liquidity.
     **/
    liquidityWithdrawalFee: Permill;

    /**
     * The minimum LP token amount that could be minted. Ameliorates rounding errors.
     **/
    mintMinLiquidity: bigint;

    /**
     * The max number of hops in a swap.
     **/
    maxSwapPathLength: number;

    /**
     * The pallet's id, used for deriving its sovereign account ID.
     **/
    palletId: FrameSupportPalletId;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
}