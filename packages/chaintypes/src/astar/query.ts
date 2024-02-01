// Generated by @delightfuldot/codegen

import type { GenericChainStorage, GenericStorageQuery } from '@delightfuldot/types';
import type {
  AccountId32Like,
  H256,
  Bytes,
  Digest,
  AccountId32,
  Data,
  FixedBytes,
  FixedU128,
  H160,
  U256,
} from '@delightfuldot/codecs';
import type {
  FrameSystemAccountInfo,
  FrameSupportDispatchPerDispatchClass,
  FrameSystemEventRecord,
  FrameSystemLastRuntimeUpgradeInfo,
  FrameSystemPhase,
  PalletIdentityRegistration,
  PalletIdentityRegistrarInfo,
  PalletMultisigMultisig,
  PalletProxyProxyDefinition,
  PalletProxyAnnouncement,
  PolkadotPrimitivesV4PersistedValidationData,
  PolkadotPrimitivesV4UpgradeRestriction,
  SpTrieStorageProof,
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot,
  PolkadotPrimitivesV4AbridgedHostConfiguration,
  CumulusPrimitivesParachainInherentMessageQueueChain,
  PolkadotParachainPrimitivesId,
  PolkadotCorePrimitivesOutboundHrmpMessage,
  SpWeightsWeightV2Weight,
  CumulusPalletParachainSystemCodeUpgradeAuthorization,
  PalletTransactionPaymentReleases,
  PalletBalancesAccountData,
  PalletBalancesBalanceLock,
  PalletBalancesReserveData,
  PalletBalancesIdAmount,
  PalletVestingVestingInfo,
  PalletVestingReleases,
  PalletDappsStakingAccountLedger,
  PalletDappsStakingRewardInfo,
  PalletDappsStakingForcing,
  AstarRuntimeSmartContract,
  PalletDappsStakingDAppInfo,
  PalletDappsStakingEraInfo,
  PalletDappsStakingContractStakeInfo,
  PalletDappsStakingStakerInfo,
  PalletDappsStakingVersion,
  PalletBlockRewardsHybridRewardDistributionConfig,
  PalletAssetsAssetDetails,
  PalletAssetsAssetAccount,
  PalletAssetsApproval,
  PalletAssetsAssetMetadata,
  PalletCollatorSelectionCandidateInfo,
  AstarRuntimeSessionKeys,
  SpCoreCryptoKeyTypeId,
  SpConsensusAuraSr25519AppSr25519Public,
  SpConsensusSlotsSlot,
  CumulusPalletXcmpQueueInboundChannelDetails,
  CumulusPalletXcmpQueueOutboundChannelDetails,
  CumulusPalletXcmpQueueQueueConfigData,
  PalletXcmQueryStatus,
  XcmVersionedMultiLocation,
  PalletXcmVersionMigrationStage,
  PalletXcmRemoteLockedFungibleRecord,
  XcmVersionedAssetId,
  CumulusPalletDmpQueueConfigData,
  CumulusPalletDmpQueuePageIndexData,
  PalletEvmCodeMetadata,
  EthereumTransactionTransactionV2,
  FpRpcTransactionStatus,
  EthereumReceiptReceiptV3,
  EthereumBlock,
  PalletContractsWasmPrefabWasmModule,
  PalletContractsWasmOwnerInfo,
  PalletContractsStorageContractInfo,
  PalletContractsStorageDeletionQueueManager,
} from './types';

export interface ChainStorage extends GenericChainStorage {
  system: {
    /**
     * The full account information for a particular account ID.
     **/
    account: GenericStorageQuery<(arg: AccountId32Like) => FrameSystemAccountInfo>;

    /**
     * Total extrinsics count for the current block.
     **/
    extrinsicCount: GenericStorageQuery<() => number | undefined>;

    /**
     * The current weight for the block.
     **/
    blockWeight: GenericStorageQuery<() => FrameSupportDispatchPerDispatchClass>;

    /**
     * Total length (in bytes) for all extrinsics put together, for the current block.
     **/
    allExtrinsicsLen: GenericStorageQuery<() => number | undefined>;

    /**
     * Map of block numbers to block hashes.
     **/
    blockHash: GenericStorageQuery<(arg: number) => H256>;

    /**
     * Extrinsics data for the current block (maps an extrinsic's index to its data).
     **/
    extrinsicData: GenericStorageQuery<(arg: number) => Bytes>;

    /**
     * The current block number being processed. Set by `execute_block`.
     **/
    number: GenericStorageQuery<() => number>;

    /**
     * Hash of the previous block.
     **/
    parentHash: GenericStorageQuery<() => H256>;

    /**
     * Digest of the current block, also part of the block header.
     **/
    digest: GenericStorageQuery<() => Digest>;

    /**
     * Events deposited for the current block.
     *
     * NOTE: The item is unbound and should therefore never be read on chain.
     * It could otherwise inflate the PoV size of a block.
     *
     * Events have a large in-memory size. Box the events to not go out-of-memory
     * just in case someone still reads them from within the runtime.
     **/
    events: GenericStorageQuery<() => Array<FrameSystemEventRecord>>;

    /**
     * The number of events in the `Events<T>` list.
     **/
    eventCount: GenericStorageQuery<() => number>;

    /**
     * Mapping between a topic (represented by T::Hash) and a vector of indexes
     * of events in the `<Events<T>>` list.
     *
     * All topic vectors have deterministic storage locations depending on the topic. This
     * allows light-clients to leverage the changes trie storage tracking mechanism and
     * in case of changes fetch the list of events of interest.
     *
     * The value has the type `(T::BlockNumber, EventIndex)` because if we used only just
     * the `EventIndex` then in case if the topic has the same contents on the next block
     * no notification will be triggered thus the event might be lost.
     **/
    eventTopics: GenericStorageQuery<(arg: H256) => Array<[number, number]>>;

    /**
     * Stores the `spec_version` and `spec_name` of when the last runtime upgrade happened.
     **/
    lastRuntimeUpgrade: GenericStorageQuery<() => FrameSystemLastRuntimeUpgradeInfo | undefined>;

    /**
     * True if we have upgraded so that `type RefCount` is `u32`. False (default) if not.
     **/
    upgradedToU32RefCount: GenericStorageQuery<() => boolean>;

    /**
     * True if we have upgraded so that AccountInfo contains three types of `RefCount`. False
     * (default) if not.
     **/
    upgradedToTripleRefCount: GenericStorageQuery<() => boolean>;

    /**
     * The execution phase of the block.
     **/
    executionPhase: GenericStorageQuery<() => FrameSystemPhase | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  identity: {
    /**
     * Information that is pertinent to identify the entity behind an account.
     *
     * TWOX-NOTE: OK ― `AccountId` is a secure hash.
     **/
    identityOf: GenericStorageQuery<(arg: AccountId32Like) => PalletIdentityRegistration | undefined>;

    /**
     * The super-identity of an alternative "sub" identity together with its name, within that
     * context. If the account is not some other account's sub-identity, then just `None`.
     **/
    superOf: GenericStorageQuery<(arg: AccountId32Like) => [AccountId32, Data] | undefined>;

    /**
     * Alternative "sub" identities of this account.
     *
     * The first item is the deposit, the second is a vector of the accounts.
     *
     * TWOX-NOTE: OK ― `AccountId` is a secure hash.
     **/
    subsOf: GenericStorageQuery<(arg: AccountId32Like) => [bigint, Array<AccountId32>]>;

    /**
     * The set of registrars. Not expected to get very big as can only be added through a
     * special origin (likely a council motion).
     *
     * The index into this can be cast to `RegistrarIndex` to get a valid value.
     **/
    registrars: GenericStorageQuery<() => Array<PalletIdentityRegistrarInfo | undefined>>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  timestamp: {
    /**
     * Current time for the current block.
     **/
    now: GenericStorageQuery<() => bigint>;

    /**
     * Did the timestamp get updated in this block?
     **/
    didUpdate: GenericStorageQuery<() => boolean>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  multisig: {
    /**
     * The set of open multisig operations.
     **/
    multisigs: GenericStorageQuery<(arg: [AccountId32Like, FixedBytes<32>]) => PalletMultisigMultisig | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  proxy: {
    /**
     * The set of account proxies. Maps the account which has delegated to the accounts
     * which are being delegated to, together with the amount held on deposit.
     **/
    proxies: GenericStorageQuery<(arg: AccountId32Like) => [Array<PalletProxyProxyDefinition>, bigint]>;

    /**
     * The announcements made by the proxy (key).
     **/
    announcements: GenericStorageQuery<(arg: AccountId32Like) => [Array<PalletProxyAnnouncement>, bigint]>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  parachainSystem: {
    /**
     * In case of a scheduled upgrade, this storage field contains the validation code to be applied.
     *
     * As soon as the relay chain gives us the go-ahead signal, we will overwrite the [`:code`][well_known_keys::CODE]
     * which will result the next block process with the new validation code. This concludes the upgrade process.
     *
     * [well_known_keys::CODE]: sp_core::storage::well_known_keys::CODE
     **/
    pendingValidationCode: GenericStorageQuery<() => Bytes>;

    /**
     * Validation code that is set by the parachain and is to be communicated to collator and
     * consequently the relay-chain.
     *
     * This will be cleared in `on_initialize` of each new block if no other pallet already set
     * the value.
     **/
    newValidationCode: GenericStorageQuery<() => Bytes | undefined>;

    /**
     * The [`PersistedValidationData`] set for this block.
     * This value is expected to be set only once per block and it's never stored
     * in the trie.
     **/
    validationData: GenericStorageQuery<() => PolkadotPrimitivesV4PersistedValidationData | undefined>;

    /**
     * Were the validation data set to notify the relay chain?
     **/
    didSetValidationCode: GenericStorageQuery<() => boolean>;

    /**
     * The relay chain block number associated with the last parachain block.
     **/
    lastRelayChainBlockNumber: GenericStorageQuery<() => number>;

    /**
     * An option which indicates if the relay-chain restricts signalling a validation code upgrade.
     * In other words, if this is `Some` and [`NewValidationCode`] is `Some` then the produced
     * candidate will be invalid.
     *
     * This storage item is a mirror of the corresponding value for the current parachain from the
     * relay-chain. This value is ephemeral which means it doesn't hit the storage. This value is
     * set after the inherent.
     **/
    upgradeRestrictionSignal: GenericStorageQuery<() => PolkadotPrimitivesV4UpgradeRestriction | undefined>;

    /**
     * The state proof for the last relay parent block.
     *
     * This field is meant to be updated each block with the validation data inherent. Therefore,
     * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
     *
     * This data is also absent from the genesis.
     **/
    relayStateProof: GenericStorageQuery<() => SpTrieStorageProof | undefined>;

    /**
     * The snapshot of some state related to messaging relevant to the current parachain as per
     * the relay parent.
     *
     * This field is meant to be updated each block with the validation data inherent. Therefore,
     * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
     *
     * This data is also absent from the genesis.
     **/
    relevantMessagingState: GenericStorageQuery<
      () => CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot | undefined
    >;

    /**
     * The parachain host configuration that was obtained from the relay parent.
     *
     * This field is meant to be updated each block with the validation data inherent. Therefore,
     * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
     *
     * This data is also absent from the genesis.
     **/
    hostConfiguration: GenericStorageQuery<() => PolkadotPrimitivesV4AbridgedHostConfiguration | undefined>;

    /**
     * The last downward message queue chain head we have observed.
     *
     * This value is loaded before and saved after processing inbound downward messages carried
     * by the system inherent.
     **/
    lastDmqMqcHead: GenericStorageQuery<() => CumulusPrimitivesParachainInherentMessageQueueChain>;

    /**
     * The message queue chain heads we have observed per each channel incoming channel.
     *
     * This value is loaded before and saved after processing inbound downward messages carried
     * by the system inherent.
     **/
    lastHrmpMqcHeads: GenericStorageQuery<
      () => Array<[PolkadotParachainPrimitivesId, CumulusPrimitivesParachainInherentMessageQueueChain]>
    >;

    /**
     * Number of downward messages processed in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    processedDownwardMessages: GenericStorageQuery<() => number>;

    /**
     * HRMP watermark that was set in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    hrmpWatermark: GenericStorageQuery<() => number>;

    /**
     * HRMP messages that were sent in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    hrmpOutboundMessages: GenericStorageQuery<() => Array<PolkadotCorePrimitivesOutboundHrmpMessage>>;

    /**
     * Upward messages that were sent in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    upwardMessages: GenericStorageQuery<() => Array<Bytes>>;

    /**
     * Upward messages that are still pending and not yet send to the relay chain.
     **/
    pendingUpwardMessages: GenericStorageQuery<() => Array<Bytes>>;

    /**
     * The number of HRMP messages we observed in `on_initialize` and thus used that number for
     * announcing the weight of `on_initialize` and `on_finalize`.
     **/
    announcedHrmpMessagesPerCandidate: GenericStorageQuery<() => number>;

    /**
     * The weight we reserve at the beginning of the block for processing XCMP messages. This
     * overrides the amount set in the Config trait.
     **/
    reservedXcmpWeightOverride: GenericStorageQuery<() => SpWeightsWeightV2Weight | undefined>;

    /**
     * The weight we reserve at the beginning of the block for processing DMP messages. This
     * overrides the amount set in the Config trait.
     **/
    reservedDmpWeightOverride: GenericStorageQuery<() => SpWeightsWeightV2Weight | undefined>;

    /**
     * The next authorized upgrade, if there is one.
     **/
    authorizedUpgrade: GenericStorageQuery<() => CumulusPalletParachainSystemCodeUpgradeAuthorization | undefined>;

    /**
     * A custom head data that should be returned as result of `validate_block`.
     *
     * See [`Pallet::set_custom_validation_head_data`] for more information.
     **/
    customValidationHeadData: GenericStorageQuery<() => Bytes | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  parachainInfo: {
    parachainId: GenericStorageQuery<() => PolkadotParachainPrimitivesId>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  transactionPayment: {
    nextFeeMultiplier: GenericStorageQuery<() => FixedU128>;
    storageVersion: GenericStorageQuery<() => PalletTransactionPaymentReleases>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  balances: {
    /**
     * The total units issued in the system.
     **/
    totalIssuance: GenericStorageQuery<() => bigint>;

    /**
     * The total units of outstanding deactivated balance in the system.
     **/
    inactiveIssuance: GenericStorageQuery<() => bigint>;

    /**
     * The Balances pallet example of storing the balance of an account.
     *
     * # Example
     *
     * ```nocompile
     * impl pallet_balances::Config for Runtime {
     * type AccountStore = StorageMapShim<Self::Account<Runtime>, frame_system::Provider<Runtime>, AccountId, Self::AccountData<Balance>>
     * }
     * ```
     *
     * You can also store the balance of an account in the `System` pallet.
     *
     * # Example
     *
     * ```nocompile
     * impl pallet_balances::Config for Runtime {
     * type AccountStore = System
     * }
     * ```
     *
     * But this comes with tradeoffs, storing account balances in the system pallet stores
     * `frame_system` data alongside the account data contrary to storing account balances in the
     * `Balances` pallet, which uses a `StorageMap` to store balances data only.
     * NOTE: This is only used in the case that this pallet is used to store balances.
     **/
    account: GenericStorageQuery<(arg: AccountId32Like) => PalletBalancesAccountData>;

    /**
     * Any liquidity locks on some account balances.
     * NOTE: Should only be accessed when setting, changing and freeing a lock.
     **/
    locks: GenericStorageQuery<(arg: AccountId32Like) => Array<PalletBalancesBalanceLock>>;

    /**
     * Named reserves on some account balances.
     **/
    reserves: GenericStorageQuery<(arg: AccountId32Like) => Array<PalletBalancesReserveData>>;

    /**
     * Holds on account balances.
     **/
    holds: GenericStorageQuery<(arg: AccountId32Like) => Array<PalletBalancesIdAmount>>;

    /**
     * Freeze locks on account balances.
     **/
    freezes: GenericStorageQuery<(arg: AccountId32Like) => Array<PalletBalancesIdAmount>>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  vesting: {
    /**
     * Information regarding the vesting of a given account.
     **/
    vesting: GenericStorageQuery<(arg: AccountId32Like) => Array<PalletVestingVestingInfo> | undefined>;

    /**
     * Storage version of the pallet.
     *
     * New networks start with latest version, as determined by the genesis build.
     **/
    storageVersion: GenericStorageQuery<() => PalletVestingReleases>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  dappsStaking: {
    /**
     * Denotes whether pallet is disabled (in maintenance mode) or not
     **/
    palletDisabled: GenericStorageQuery<() => boolean>;

    /**
     * Denotes whether pallet decommissioning has started or not.
     **/
    decommissionStarted: GenericStorageQuery<() => boolean>;

    /**
     * General information about the staker (non-smart-contract specific).
     **/
    ledger: GenericStorageQuery<(arg: AccountId32Like) => PalletDappsStakingAccountLedger>;

    /**
     * The current era index.
     **/
    currentEra: GenericStorageQuery<() => number>;

    /**
     * Accumulator for block rewards during an era. It is reset at every new era
     **/
    blockRewardAccumulator: GenericStorageQuery<() => PalletDappsStakingRewardInfo>;

    /**
     * Mode of era forcing.
     **/
    forceEra: GenericStorageQuery<() => PalletDappsStakingForcing>;

    /**
     * Stores the block number of when the next era starts
     **/
    nextEraStartingBlock: GenericStorageQuery<() => number>;

    /**
     * Simple map where developer account points to their smart contract
     **/
    registeredDevelopers: GenericStorageQuery<(arg: AccountId32Like) => AstarRuntimeSmartContract | undefined>;

    /**
     * Simple map where smart contract points to basic info about it (e.g. developer address, state)
     **/
    registeredDapps: GenericStorageQuery<(arg: AstarRuntimeSmartContract) => PalletDappsStakingDAppInfo | undefined>;

    /**
     * General information about an era like TVL, total staked value, rewards.
     **/
    generalEraInfo: GenericStorageQuery<(arg: number) => PalletDappsStakingEraInfo | undefined>;

    /**
     * Staking information about contract in a particular era.
     **/
    contractEraStake: GenericStorageQuery<
      (arg: [AstarRuntimeSmartContract, number]) => PalletDappsStakingContractStakeInfo | undefined
    >;

    /**
     * Info about stakers stakes on particular contracts.
     **/
    generalStakerInfo: GenericStorageQuery<
      (arg: [AccountId32Like, AstarRuntimeSmartContract]) => PalletDappsStakingStakerInfo
    >;

    /**
     * Stores the current pallet storage version.
     **/
    storageVersion: GenericStorageQuery<() => PalletDappsStakingVersion>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  blockReward: {
    rewardDistributionConfigStorage: GenericStorageQuery<() => PalletBlockRewardsHybridRewardDistributionConfig>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  assets: {
    /**
     * Details of an asset.
     **/
    asset: GenericStorageQuery<(arg: bigint) => PalletAssetsAssetDetails | undefined>;

    /**
     * The holdings of a specific account for a specific asset.
     **/
    account: GenericStorageQuery<(arg: [bigint, AccountId32Like]) => PalletAssetsAssetAccount | undefined>;

    /**
     * Approved balance transfers. First balance is the amount approved for transfer. Second
     * is the amount of `T::Currency` reserved for storing this.
     * First key is the asset ID, second key is the owner and third key is the delegate.
     **/
    approvals: GenericStorageQuery<
      (arg: [bigint, AccountId32Like, AccountId32Like]) => PalletAssetsApproval | undefined
    >;

    /**
     * Metadata of an asset.
     **/
    metadata: GenericStorageQuery<(arg: bigint) => PalletAssetsAssetMetadata>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  authorship: {
    /**
     * Author of current block.
     **/
    author: GenericStorageQuery<() => AccountId32 | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  collatorSelection: {
    /**
     * The invulnerable, fixed collators.
     **/
    invulnerables: GenericStorageQuery<() => Array<AccountId32>>;

    /**
     * The (community, limited) collation candidates.
     **/
    candidates: GenericStorageQuery<() => Array<PalletCollatorSelectionCandidateInfo>>;

    /**
     * Last block authored by collator.
     **/
    lastAuthoredBlock: GenericStorageQuery<(arg: AccountId32Like) => number>;

    /**
     * Desired number of candidates.
     *
     * This should ideally always be less than [`Config::MaxCandidates`] for weights to be correct.
     **/
    desiredCandidates: GenericStorageQuery<() => number>;

    /**
     * Fixed amount to deposit to become a collator.
     *
     * When a collator calls `leave_intent` they immediately receive the deposit back.
     **/
    candidacyBond: GenericStorageQuery<() => bigint>;

    /**
     * Destination account for slashed amount.
     **/
    slashDestination: GenericStorageQuery<() => AccountId32 | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  session: {
    /**
     * The current set of validators.
     **/
    validators: GenericStorageQuery<() => Array<AccountId32>>;

    /**
     * Current index of the session.
     **/
    currentIndex: GenericStorageQuery<() => number>;

    /**
     * True if the underlying economic identities or weighting behind the validators
     * has changed in the queued validator set.
     **/
    queuedChanged: GenericStorageQuery<() => boolean>;

    /**
     * The queued keys for the next session. When the next session begins, these keys
     * will be used to determine the validator's session keys.
     **/
    queuedKeys: GenericStorageQuery<() => Array<[AccountId32, AstarRuntimeSessionKeys]>>;

    /**
     * Indices of disabled validators.
     *
     * The vec is always kept sorted so that we can find whether a given validator is
     * disabled using binary search. It gets cleared when `on_session_ending` returns
     * a new set of identities.
     **/
    disabledValidators: GenericStorageQuery<() => Array<number>>;

    /**
     * The next session keys for a validator.
     **/
    nextKeys: GenericStorageQuery<(arg: AccountId32Like) => AstarRuntimeSessionKeys | undefined>;

    /**
     * The owner of a key. The key is the `KeyTypeId` + the encoded key.
     **/
    keyOwner: GenericStorageQuery<(arg: [SpCoreCryptoKeyTypeId, Bytes]) => AccountId32 | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  aura: {
    /**
     * The current authority set.
     **/
    authorities: GenericStorageQuery<() => Array<SpConsensusAuraSr25519AppSr25519Public>>;

    /**
     * The current slot of this block.
     *
     * This will be set in `on_initialize`.
     **/
    currentSlot: GenericStorageQuery<() => SpConsensusSlotsSlot>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  auraExt: {
    /**
     * Serves as cache for the authorities.
     *
     * The authorities in AuRa are overwritten in `on_initialize` when we switch to a new session,
     * but we require the old authorities to verify the seal when validating a PoV. This will always
     * be updated to the latest AuRa authorities in `on_finalize`.
     **/
    authorities: GenericStorageQuery<() => Array<SpConsensusAuraSr25519AppSr25519Public>>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  xcmpQueue: {
    /**
     * Status of the inbound XCMP channels.
     **/
    inboundXcmpStatus: GenericStorageQuery<() => Array<CumulusPalletXcmpQueueInboundChannelDetails>>;

    /**
     * Inbound aggregate XCMP messages. It can only be one per ParaId/block.
     **/
    inboundXcmpMessages: GenericStorageQuery<(arg: [PolkadotParachainPrimitivesId, number]) => Bytes>;

    /**
     * The non-empty XCMP channels in order of becoming non-empty, and the index of the first
     * and last outbound message. If the two indices are equal, then it indicates an empty
     * queue and there must be a non-`Ok` `OutboundStatus`. We assume queues grow no greater
     * than 65535 items. Queue indices for normal messages begin at one; zero is reserved in
     * case of the need to send a high-priority signal message this block.
     * The bool is true if there is a signal message waiting to be sent.
     **/
    outboundXcmpStatus: GenericStorageQuery<() => Array<CumulusPalletXcmpQueueOutboundChannelDetails>>;

    /**
     * The messages outbound in a given XCMP channel.
     **/
    outboundXcmpMessages: GenericStorageQuery<(arg: [PolkadotParachainPrimitivesId, number]) => Bytes>;

    /**
     * Any signal messages waiting to be sent.
     **/
    signalMessages: GenericStorageQuery<(arg: PolkadotParachainPrimitivesId) => Bytes>;

    /**
     * The configuration which controls the dynamics of the outbound queue.
     **/
    queueConfig: GenericStorageQuery<() => CumulusPalletXcmpQueueQueueConfigData>;

    /**
     * The messages that exceeded max individual message weight budget.
     *
     * These message stay in this storage map until they are manually dispatched via
     * `service_overweight`.
     **/
    overweight: GenericStorageQuery<(arg: bigint) => [PolkadotParachainPrimitivesId, number, Bytes] | undefined>;

    /**
     * Counter for the related counted storage map
     **/
    counterForOverweight: GenericStorageQuery<() => number>;

    /**
     * The number of overweight messages ever recorded in `Overweight`. Also doubles as the next
     * available free overweight index.
     **/
    overweightCount: GenericStorageQuery<() => bigint>;

    /**
     * Whether or not the XCMP queue is suspended from executing incoming XCMs or not.
     **/
    queueSuspended: GenericStorageQuery<() => boolean>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  polkadotXcm: {
    /**
     * The latest available query index.
     **/
    queryCounter: GenericStorageQuery<() => bigint>;

    /**
     * The ongoing queries.
     **/
    queries: GenericStorageQuery<(arg: bigint) => PalletXcmQueryStatus | undefined>;

    /**
     * The existing asset traps.
     *
     * Key is the blake2 256 hash of (origin, versioned `MultiAssets`) pair. Value is the number of
     * times this pair has been trapped (usually just 1 if it exists at all).
     **/
    assetTraps: GenericStorageQuery<(arg: H256) => number>;

    /**
     * Default version to encode XCM when latest version of destination is unknown. If `None`,
     * then the destinations whose XCM version is unknown are considered unreachable.
     **/
    safeXcmVersion: GenericStorageQuery<() => number | undefined>;

    /**
     * The Latest versions that we know various locations support.
     **/
    supportedVersion: GenericStorageQuery<(arg: [number, XcmVersionedMultiLocation]) => number | undefined>;

    /**
     * All locations that we have requested version notifications from.
     **/
    versionNotifiers: GenericStorageQuery<(arg: [number, XcmVersionedMultiLocation]) => bigint | undefined>;

    /**
     * The target locations that are subscribed to our version changes, as well as the most recent
     * of our versions we informed them of.
     **/
    versionNotifyTargets: GenericStorageQuery<
      (arg: [number, XcmVersionedMultiLocation]) => [bigint, SpWeightsWeightV2Weight, number] | undefined
    >;

    /**
     * Destinations whose latest XCM version we would like to know. Duplicates not allowed, and
     * the `u32` counter is the number of times that a send to the destination has been attempted,
     * which is used as a prioritization.
     **/
    versionDiscoveryQueue: GenericStorageQuery<() => Array<[XcmVersionedMultiLocation, number]>>;

    /**
     * The current migration's stage, if any.
     **/
    currentMigration: GenericStorageQuery<() => PalletXcmVersionMigrationStage | undefined>;

    /**
     * Fungible assets which we know are locked on a remote chain.
     **/
    remoteLockedFungibles: GenericStorageQuery<
      (arg: [number, AccountId32Like, XcmVersionedAssetId]) => PalletXcmRemoteLockedFungibleRecord | undefined
    >;

    /**
     * Fungible assets which we know are locked on this chain.
     **/
    lockedFungibles: GenericStorageQuery<
      (arg: AccountId32Like) => Array<[bigint, XcmVersionedMultiLocation]> | undefined
    >;

    /**
     * Global suspension state of the XCM executor.
     **/
    xcmExecutionSuspended: GenericStorageQuery<() => boolean>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  dmpQueue: {
    /**
     * The configuration.
     **/
    configuration: GenericStorageQuery<() => CumulusPalletDmpQueueConfigData>;

    /**
     * The page index.
     **/
    pageIndex: GenericStorageQuery<() => CumulusPalletDmpQueuePageIndexData>;

    /**
     * The queue pages.
     **/
    pages: GenericStorageQuery<(arg: number) => Array<[number, Bytes]>>;

    /**
     * The overweight messages.
     **/
    overweight: GenericStorageQuery<(arg: bigint) => [number, Bytes] | undefined>;

    /**
     * Counter for the related counted storage map
     **/
    counterForOverweight: GenericStorageQuery<() => number>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  xcAssetConfig: {
    /**
     * Mapping from an asset id to asset type.
     * Can be used when receiving transaction specifying an asset directly,
     * like transferring an asset from this chain to another.
     **/
    assetIdToLocation: GenericStorageQuery<(arg: bigint) => XcmVersionedMultiLocation | undefined>;

    /**
     * Mapping from an asset type to an asset id.
     * Can be used when receiving a multilocation XCM message to retrieve
     * the corresponding asset in which tokens should me minted.
     **/
    assetLocationToId: GenericStorageQuery<(arg: XcmVersionedMultiLocation) => bigint | undefined>;

    /**
     * Stores the units per second for local execution for a AssetLocation.
     * This is used to know how to charge for XCM execution in a particular asset.
     *
     * Not all asset types are supported for payment. If value exists here, it means it is supported.
     **/
    assetLocationUnitsPerSecond: GenericStorageQuery<(arg: XcmVersionedMultiLocation) => bigint | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  eVM: {
    accountCodes: GenericStorageQuery<(arg: H160) => Bytes>;
    accountCodesMetadata: GenericStorageQuery<(arg: H160) => PalletEvmCodeMetadata | undefined>;
    accountStorages: GenericStorageQuery<(arg: [H160, H256]) => H256>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  ethereum: {
    /**
     * Current building block's transactions and receipts.
     **/
    pending: GenericStorageQuery<
      () => Array<[EthereumTransactionTransactionV2, FpRpcTransactionStatus, EthereumReceiptReceiptV3]>
    >;

    /**
     * The current Ethereum block.
     **/
    currentBlock: GenericStorageQuery<() => EthereumBlock | undefined>;

    /**
     * The current Ethereum receipts.
     **/
    currentReceipts: GenericStorageQuery<() => Array<EthereumReceiptReceiptV3> | undefined>;

    /**
     * The current transaction statuses.
     **/
    currentTransactionStatuses: GenericStorageQuery<() => Array<FpRpcTransactionStatus> | undefined>;
    blockHash: GenericStorageQuery<(arg: U256) => H256>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  dynamicEvmBaseFee: {
    baseFeePerGas: GenericStorageQuery<() => U256>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  contracts: {
    /**
     * A mapping from an original code hash to the original code, untouched by instrumentation.
     **/
    pristineCode: GenericStorageQuery<(arg: H256) => Bytes | undefined>;

    /**
     * A mapping between an original code hash and instrumented wasm code, ready for execution.
     **/
    codeStorage: GenericStorageQuery<(arg: H256) => PalletContractsWasmPrefabWasmModule | undefined>;

    /**
     * A mapping between an original code hash and its owner information.
     **/
    ownerInfoOf: GenericStorageQuery<(arg: H256) => PalletContractsWasmOwnerInfo | undefined>;

    /**
     * This is a **monotonic** counter incremented on contract instantiation.
     *
     * This is used in order to generate unique trie ids for contracts.
     * The trie id of a new contract is calculated from hash(account_id, nonce).
     * The nonce is required because otherwise the following sequence would lead to
     * a possible collision of storage:
     *
     * 1. Create a new contract.
     * 2. Terminate the contract.
     * 3. Immediately recreate the contract with the same account_id.
     *
     * This is bad because the contents of a trie are deleted lazily and there might be
     * storage of the old instantiation still in it when the new contract is created. Please
     * note that we can't replace the counter by the block number because the sequence above
     * can happen in the same block. We also can't keep the account counter in memory only
     * because storage is the only way to communicate across different extrinsics in the
     * same block.
     *
     * # Note
     *
     * Do not use it to determine the number of contracts. It won't be decremented if
     * a contract is destroyed.
     **/
    nonce: GenericStorageQuery<() => bigint>;

    /**
     * The code associated with a given account.
     *
     * TWOX-NOTE: SAFE since `AccountId` is a secure hash.
     **/
    contractInfoOf: GenericStorageQuery<(arg: AccountId32Like) => PalletContractsStorageContractInfo | undefined>;

    /**
     * Evicted contracts that await child trie deletion.
     *
     * Child trie deletion is a heavy operation depending on the amount of storage items
     * stored in said trie. Therefore this operation is performed lazily in `on_idle`.
     **/
    deletionQueue: GenericStorageQuery<(arg: number) => Bytes | undefined>;

    /**
     * A pair of monotonic counters used to track the latest contract marked for deletion
     * and the latest deleted contract in queue.
     **/
    deletionQueueCounter: GenericStorageQuery<() => PalletContractsStorageDeletionQueueManager>;
    migrationInProgress: GenericStorageQuery<() => Bytes | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
  sudo: {
    /**
     * The `AccountId` of the sudo key.
     **/
    key: GenericStorageQuery<() => AccountId32 | undefined>;

    /**
     * Generic pallet storage query
     **/
    [storage: string]: GenericStorageQuery;
  };
}
