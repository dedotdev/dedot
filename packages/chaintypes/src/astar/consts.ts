// Generated by @delightfuldot/codegen

import type { GenericChainConsts } from '@delightfuldot/types';

import type {
  FrameSystemLimitsBlockWeights,
  FrameSystemLimitsBlockLength,
  SpWeightsRuntimeDbWeight,
  SpVersionRuntimeVersion,
  FrameSupportPalletId,
  XcmV3MultilocationMultiLocation,
  SpWeightsWeightV2Weight,
  PalletContractsSchedule,
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
    version: SpVersionRuntimeVersion;

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
  identity: {
    /**
     * The amount held on deposit for a registered identity
     **/
    basicDeposit: bigint;

    /**
     * The amount held on deposit per additional field for a registered identity.
     **/
    fieldDeposit: bigint;

    /**
     * The amount held on deposit for a registered subaccount. This should account for the fact
     * that one storage item's value will increase by the size of an account ID, and there will
     * be another trie item whose value is the size of an account ID plus 32 bytes.
     **/
    subAccountDeposit: bigint;

    /**
     * The maximum number of sub-accounts allowed per identified account.
     **/
    maxSubAccounts: number;

    /**
     * Maximum number of additional fields that may be stored in an ID. Needed to bound the I/O
     * required to access an identity, but can be pretty high.
     **/
    maxAdditionalFields: number;

    /**
     * Maxmimum number of registrars allowed in the system. Needed to bound the complexity
     * of, e.g., updating judgements.
     **/
    maxRegistrars: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  timestamp: {
    /**
     * The minimum period between blocks. Beware that this is different to the *expected*
     * period that the block production apparatus provides. Your chosen consensus system will
     * generally work with this to determine a sensible block time. e.g. For Aura, it will be
     * double this period on default settings.
     **/
    minimumPeriod: bigint;

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
  parachainSystem: {
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
  transactionPayment: {
    /**
     * A fee mulitplier for `Operational` extrinsics to compute "virtual tip" to boost their
     * `priority`
     *
     * This value is multipled by the `final_fee` to obtain a "virtual tip" that is later
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
     * The maximum number of holds that can exist on an account at any time.
     **/
    maxHolds: number;

    /**
     * The maximum number of individual freeze locks that can exist on an account at any time.
     **/
    maxFreezes: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  vesting: {
    /**
     * The minimum amount transferred to call `vested_transfer`.
     **/
    minVestedTransfer: bigint;
    maxVestingSchedules: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  dappsStaking: {
    /**
     * Number of blocks per era.
     **/
    blockPerEra: number;

    /**
     * Deposit that will be reserved as part of new contract registration.
     **/
    registerDeposit: bigint;

    /**
     * Maximum number of unique stakers per contract.
     **/
    maxNumberOfStakersPerContract: number;

    /**
     * Minimum amount user must have staked on contract.
     * User can stake less if they already have the minimum staking amount staked on that particular contract.
     **/
    minimumStakingAmount: bigint;

    /**
     * Dapps staking pallet Id
     **/
    palletId: FrameSupportPalletId;

    /**
     * Minimum amount that should be left on staker account after staking.
     * Serves as a safeguard to prevent users from locking their entire free balance.
     **/
    minimumRemainingAmount: bigint;

    /**
     * Max number of unlocking chunks per account Id <-> contract Id pairing.
     * If value is zero, unlocking becomes impossible.
     **/
    maxUnlockingChunks: number;

    /**
     * Number of eras that need to pass until unstaked value can be withdrawn.
     * Current era is always counted as full era (regardless how much blocks are remaining).
     * When set to `0`, it's equal to having no unbonding period.
     **/
    unbondingPeriod: number;

    /**
     * Max number of unique `EraStake` values that can exist for a `(staker, contract)` pairing.
     * When stakers claims rewards, they will either keep the number of `EraStake` values the same or they will reduce them by one.
     * Stakers cannot add an additional `EraStake` value by calling `bond&stake` or `unbond&unstake` if they've reached the max number of values.
     *
     * This ensures that history doesn't grow indefinitely - if there are too many chunks, stakers should first claim their former rewards
     * before adding additional `EraStake` values.
     **/
    maxEraStakeValues: number;

    /**
     * Number of eras that need to pass until dApp rewards for the unregistered contracts can be burned.
     * Developer can still claim rewards after this period has passed, iff it hasn't been burned yet.
     *
     * For example, if retention is set to `2` and current era is `10`, it means that all unclaimed rewards bellow era `8` can be burned.
     **/
    unregisteredDappRewardRetention: number;

    /**
     * Can be used to force pallet into permanent maintenance mode.
     **/
    forcePalletDisabled: boolean;

    /**
     * The fee that will be charged for claiming rewards on behalf of a staker.
     * This amount will be transferred from the staker over to the caller.
     **/
    delegateClaimFee: bigint;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  blockReward: {
    /**
     * The amount of issuance for each block.
     **/
    maxBlockRewardAmount: bigint;

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
  dmpQueue: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  xcAssetConfig: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  xTokens: {
    /**
     * Self chain location.
     **/
    selfLocation: XcmV3MultilocationMultiLocation;

    /**
     * Base XCM weight.
     *
     * The actually weight for an XCM message is `T::BaseXcmWeight +
     * T::Weigher::weight(&msg)`.
     **/
    baseXcmWeight: SpWeightsWeightV2Weight;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  eVM: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  ethereum: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  dynamicEvmBaseFee: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  contracts: {
    /**
     * Cost schedule and limits.
     **/
    schedule: PalletContractsSchedule;

    /**
     * The amount of balance a caller has to pay for each byte of storage.
     *
     * # Note
     *
     * Changing this value for an existing chain might need a storage migration.
     **/
    depositPerByte: bigint;

    /**
     * Fallback value to limit the storage deposit if it's not being set by the caller.
     **/
    defaultDepositLimit: bigint;

    /**
     * The amount of balance a caller has to pay for each storage item.
     *
     * # Note
     *
     * Changing this value for an existing chain might need a storage migration.
     **/
    depositPerItem: bigint;

    /**
     * The maximum length of a contract code in bytes. This limit applies to the instrumented
     * version of the code. Therefore `instantiate_with_code` can fail even when supplying
     * a wasm binary below this maximum size.
     *
     * The value should be chosen carefully taking into the account the overall memory limit
     * your runtime has, as well as the [maximum allowed callstack
     * depth](#associatedtype.CallStack). Look into the `integrity_test()` for some insights.
     **/
    maxCodeLen: number;

    /**
     * The maximum allowable length in bytes for storage keys.
     **/
    maxStorageKeyLen: number;

    /**
     * Make contract callable functions marked as `#[unstable]` available.
     *
     * Contracts that use `#[unstable]` functions won't be able to be uploaded unless
     * this is set to `true`. This is only meant for testnets and dev nodes in order to
     * experiment with new features.
     *
     * # Warning
     *
     * Do **not** set to `true` on productions chains.
     **/
    unsafeUnstableInterface: boolean;

    /**
     * The maximum length of the debug buffer in bytes.
     **/
    maxDebugBufferLen: number;

    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
  sudo: {
    /**
     * Generic pallet constant
     **/
    [name: string]: any;
  };
}
