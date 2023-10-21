// Generated by @delightfuldot/codegen
import { GenericChainStorage } from '@delightfuldot/types';
import {
  AccountId32Like,
  AstarRuntimeSessionKeys,
  AstarRuntimeSmartContract,
  Bytes,
  CumulusPalletDmpQueueConfigData,
  CumulusPalletDmpQueuePageIndexData,
  CumulusPalletParachainSystemCodeUpgradeAuthorization,
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot,
  CumulusPalletXcmpQueueInboundChannelDetails,
  CumulusPalletXcmpQueueOutboundChannelDetails,
  CumulusPalletXcmpQueueQueueConfigData,
  CumulusPrimitivesParachainInherentMessageQueueChain,
  EthereumBlock,
  EthereumReceiptReceiptV3,
  EthereumTransactionTransactionV2,
  FixedBytes,
  FixedU128,
  FpRpcTransactionStatus,
  FrameSupportDispatchPerDispatchClass,
  FrameSystemAccountInfo,
  FrameSystemEventRecord,
  FrameSystemLastRuntimeUpgradeInfo,
  FrameSystemPhase,
  H160,
  H256,
  PalletAssetsApproval,
  PalletAssetsAssetAccount,
  PalletAssetsAssetDetails,
  PalletAssetsAssetMetadata,
  PalletBalancesAccountData,
  PalletBalancesBalanceLock,
  PalletBalancesIdAmount,
  PalletBalancesReserveData,
  PalletBlockRewardRewardDistributionConfig,
  PalletCollatorSelectionCandidateInfo,
  PalletContractsStorageContractInfo,
  PalletContractsStorageDeletionQueueManager,
  PalletContractsWasmOwnerInfo,
  PalletContractsWasmPrefabWasmModule,
  PalletDappsStakingAccountLedger,
  PalletDappsStakingContractStakeInfo,
  PalletDappsStakingDAppInfo,
  PalletDappsStakingEraInfo,
  PalletDappsStakingForcing,
  PalletDappsStakingRewardInfo,
  PalletDappsStakingStakerInfo,
  PalletDappsStakingVersion,
  PalletEvmCodeMetadata,
  PalletIdentityData,
  PalletIdentityRegistrarInfo,
  PalletIdentityRegistration,
  PalletMultisigMultisig,
  PalletProxyAnnouncement,
  PalletProxyProxyDefinition,
  PalletTransactionPaymentReleases,
  PalletVestingReleases,
  PalletVestingVestingInfo,
  PalletXcmQueryStatus,
  PalletXcmRemoteLockedFungibleRecord,
  PalletXcmVersionMigrationStage,
  Permill,
  PolkadotCorePrimitivesOutboundHrmpMessage,
  PolkadotParachainPrimitivesId,
  PolkadotPrimitivesV4AbridgedHostConfiguration,
  PolkadotPrimitivesV4PersistedValidationData,
  PolkadotPrimitivesV4UpgradeRestriction,
  SpConsensusAuraSr25519AppSr25519Public,
  SpConsensusSlotsSlot,
  SpCoreCryptoKeyTypeId,
  SpRuntimeDigest,
  SpTrieStorageProof,
  SpWeightsWeightV2Weight,
  U256,
  XcmVersionedAssetId,
  XcmVersionedMultiLocation,
} from './types';

export interface ChainStorage extends GenericChainStorage {
  system: {
    /**
     * The full account information for a particular account ID.
     **/
    account(arg: AccountId32Like): Promise<FrameSystemAccountInfo>;

    /**
     * Total extrinsics count for the current block.
     **/
    extrinsicCount(): Promise<number>;

    /**
     * The current weight for the block.
     **/
    blockWeight(): Promise<FrameSupportDispatchPerDispatchClass>;

    /**
     * Total length (in bytes) for all extrinsics put together, for the current block.
     **/
    allExtrinsicsLen(): Promise<number>;

    /**
     * Map of block numbers to block hashes.
     **/
    blockHash(arg: number): Promise<H256>;

    /**
     * Extrinsics data for the current block (maps an extrinsic's index to its data).
     **/
    extrinsicData(arg: number): Promise<Bytes>;

    /**
     * The current block number being processed. Set by `execute_block`.
     **/
    number(): Promise<number>;

    /**
     * Hash of the previous block.
     **/
    parentHash(): Promise<H256>;

    /**
     * Digest of the current block, also part of the block header.
     **/
    digest(): Promise<SpRuntimeDigest>;

    /**
     * Events deposited for the current block.
     *
     * NOTE: The item is unbound and should therefore never be read on chain.
     * It could otherwise inflate the PoV size of a block.
     *
     * Events have a large in-memory size. Box the events to not go out-of-memory
     * just in case someone still reads them from within the runtime.
     **/
    events(): Promise<Array<FrameSystemEventRecord>>;

    /**
     * The number of events in the `Events<T>` list.
     **/
    eventCount(): Promise<number>;

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
    eventTopics(arg: H256): Promise<Array<[number, number]>>;

    /**
     * Stores the `spec_version` and `spec_name` of when the last runtime upgrade happened.
     **/
    lastRuntimeUpgrade(): Promise<FrameSystemLastRuntimeUpgradeInfo>;

    /**
     * True if we have upgraded so that `type RefCount` is `u32`. False (default) if not.
     **/
    upgradedToU32RefCount(): Promise<boolean>;

    /**
     * True if we have upgraded so that AccountInfo contains three types of `RefCount`. False
     * (default) if not.
     **/
    upgradedToTripleRefCount(): Promise<boolean>;

    /**
     * The execution phase of the block.
     **/
    executionPhase(): Promise<FrameSystemPhase>;
  };
  identity: {
    /**
     * Information that is pertinent to identify the entity behind an account.
     *
     * TWOX-NOTE: OK ― `AccountId` is a secure hash.
     **/
    identityOf(arg: AccountId32Like): Promise<PalletIdentityRegistration>;

    /**
     * The super-identity of an alternative "sub" identity together with its name, within that
     * context. If the account is not some other account's sub-identity, then just `None`.
     **/
    superOf(arg: AccountId32Like): Promise<[AccountId32Like, PalletIdentityData]>;

    /**
     * Alternative "sub" identities of this account.
     *
     * The first item is the deposit, the second is a vector of the accounts.
     *
     * TWOX-NOTE: OK ― `AccountId` is a secure hash.
     **/
    subsOf(arg: AccountId32Like): Promise<[bigint, Array<AccountId32Like>]>;

    /**
     * The set of registrars. Not expected to get very big as can only be added through a
     * special origin (likely a council motion).
     *
     * The index into this can be cast to `RegistrarIndex` to get a valid value.
     **/
    registrars(): Promise<Array<PalletIdentityRegistrarInfo | undefined>>;
  };
  timestamp: {
    /**
     * Current time for the current block.
     **/
    now(): Promise<bigint>;

    /**
     * Did the timestamp get updated in this block?
     **/
    didUpdate(): Promise<boolean>;
  };
  multisig: {
    /**
     * The set of open multisig operations.
     **/
    multisigs(arg: [AccountId32Like, FixedBytes<32>]): Promise<PalletMultisigMultisig>;
  };
  proxy: {
    /**
     * The set of account proxies. Maps the account which has delegated to the accounts
     * which are being delegated to, together with the amount held on deposit.
     **/
    proxies(arg: AccountId32Like): Promise<[Array<PalletProxyProxyDefinition>, bigint]>;

    /**
     * The announcements made by the proxy (key).
     **/
    announcements(arg: AccountId32Like): Promise<[Array<PalletProxyAnnouncement>, bigint]>;
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
    pendingValidationCode(): Promise<Bytes>;

    /**
     * Validation code that is set by the parachain and is to be communicated to collator and
     * consequently the relay-chain.
     *
     * This will be cleared in `on_initialize` of each new block if no other pallet already set
     * the value.
     **/
    newValidationCode(): Promise<Bytes>;

    /**
     * The [`PersistedValidationData`] set for this block.
     * This value is expected to be set only once per block and it's never stored
     * in the trie.
     **/
    validationData(): Promise<PolkadotPrimitivesV4PersistedValidationData>;

    /**
     * Were the validation data set to notify the relay chain?
     **/
    didSetValidationCode(): Promise<boolean>;

    /**
     * The relay chain block number associated with the last parachain block.
     **/
    lastRelayChainBlockNumber(): Promise<number>;

    /**
     * An option which indicates if the relay-chain restricts signalling a validation code upgrade.
     * In other words, if this is `Some` and [`NewValidationCode`] is `Some` then the produced
     * candidate will be invalid.
     *
     * This storage item is a mirror of the corresponding value for the current parachain from the
     * relay-chain. This value is ephemeral which means it doesn't hit the storage. This value is
     * set after the inherent.
     **/
    upgradeRestrictionSignal(): Promise<PolkadotPrimitivesV4UpgradeRestriction | undefined>;

    /**
     * The state proof for the last relay parent block.
     *
     * This field is meant to be updated each block with the validation data inherent. Therefore,
     * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
     *
     * This data is also absent from the genesis.
     **/
    relayStateProof(): Promise<SpTrieStorageProof>;

    /**
     * The snapshot of some state related to messaging relevant to the current parachain as per
     * the relay parent.
     *
     * This field is meant to be updated each block with the validation data inherent. Therefore,
     * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
     *
     * This data is also absent from the genesis.
     **/
    relevantMessagingState(): Promise<CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot>;

    /**
     * The parachain host configuration that was obtained from the relay parent.
     *
     * This field is meant to be updated each block with the validation data inherent. Therefore,
     * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
     *
     * This data is also absent from the genesis.
     **/
    hostConfiguration(): Promise<PolkadotPrimitivesV4AbridgedHostConfiguration>;

    /**
     * The last downward message queue chain head we have observed.
     *
     * This value is loaded before and saved after processing inbound downward messages carried
     * by the system inherent.
     **/
    lastDmqMqcHead(): Promise<CumulusPrimitivesParachainInherentMessageQueueChain>;

    /**
     * The message queue chain heads we have observed per each channel incoming channel.
     *
     * This value is loaded before and saved after processing inbound downward messages carried
     * by the system inherent.
     **/
    lastHrmpMqcHeads(): Promise<
      Array<[PolkadotParachainPrimitivesId, CumulusPrimitivesParachainInherentMessageQueueChain]>
    >;

    /**
     * Number of downward messages processed in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    processedDownwardMessages(): Promise<number>;

    /**
     * HRMP watermark that was set in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    hrmpWatermark(): Promise<number>;

    /**
     * HRMP messages that were sent in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    hrmpOutboundMessages(): Promise<Array<PolkadotCorePrimitivesOutboundHrmpMessage>>;

    /**
     * Upward messages that were sent in a block.
     *
     * This will be cleared in `on_initialize` of each new block.
     **/
    upwardMessages(): Promise<Array<Bytes>>;

    /**
     * Upward messages that are still pending and not yet send to the relay chain.
     **/
    pendingUpwardMessages(): Promise<Array<Bytes>>;

    /**
     * The number of HRMP messages we observed in `on_initialize` and thus used that number for
     * announcing the weight of `on_initialize` and `on_finalize`.
     **/
    announcedHrmpMessagesPerCandidate(): Promise<number>;

    /**
     * The weight we reserve at the beginning of the block for processing XCMP messages. This
     * overrides the amount set in the Config trait.
     **/
    reservedXcmpWeightOverride(): Promise<SpWeightsWeightV2Weight>;

    /**
     * The weight we reserve at the beginning of the block for processing DMP messages. This
     * overrides the amount set in the Config trait.
     **/
    reservedDmpWeightOverride(): Promise<SpWeightsWeightV2Weight>;

    /**
     * The next authorized upgrade, if there is one.
     **/
    authorizedUpgrade(): Promise<CumulusPalletParachainSystemCodeUpgradeAuthorization>;

    /**
     * A custom head data that should be returned as result of `validate_block`.
     *
     * See [`Pallet::set_custom_validation_head_data`] for more information.
     **/
    customValidationHeadData(): Promise<Bytes>;
  };
  parachainInfo: { parachainId(): Promise<PolkadotParachainPrimitivesId> };
  transactionPayment: {
    nextFeeMultiplier(): Promise<FixedU128>;
    storageVersion(): Promise<PalletTransactionPaymentReleases>;
  };
  balances: {
    /**
     * The total units issued in the system.
     **/
    totalIssuance(): Promise<bigint>;

    /**
     * The total units of outstanding deactivated balance in the system.
     **/
    inactiveIssuance(): Promise<bigint>;

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
    account(arg: AccountId32Like): Promise<PalletBalancesAccountData>;

    /**
     * Any liquidity locks on some account balances.
     * NOTE: Should only be accessed when setting, changing and freeing a lock.
     **/
    locks(arg: AccountId32Like): Promise<Array<PalletBalancesBalanceLock>>;

    /**
     * Named reserves on some account balances.
     **/
    reserves(arg: AccountId32Like): Promise<Array<PalletBalancesReserveData>>;

    /**
     * Holds on account balances.
     **/
    holds(arg: AccountId32Like): Promise<Array<PalletBalancesIdAmount>>;

    /**
     * Freeze locks on account balances.
     **/
    freezes(arg: AccountId32Like): Promise<Array<PalletBalancesIdAmount>>;
  };
  vesting: {
    /**
     * Information regarding the vesting of a given account.
     **/
    vesting(arg: AccountId32Like): Promise<Array<PalletVestingVestingInfo>>;

    /**
     * Storage version of the pallet.
     *
     * New networks start with latest version, as determined by the genesis build.
     **/
    storageVersion(): Promise<PalletVestingReleases>;
  };
  dappsStaking: {
    /**
     * Denotes whether pallet is disabled (in maintenance mode) or not
     **/
    palletDisabled(): Promise<boolean>;

    /**
     * General information about the staker (non-smart-contract specific).
     **/
    ledger(arg: AccountId32Like): Promise<PalletDappsStakingAccountLedger>;

    /**
     * The current era index.
     **/
    currentEra(): Promise<number>;

    /**
     * Accumulator for block rewards during an era. It is reset at every new era
     **/
    blockRewardAccumulator(): Promise<PalletDappsStakingRewardInfo>;

    /**
     * Mode of era forcing.
     **/
    forceEra(): Promise<PalletDappsStakingForcing>;

    /**
     * Stores the block number of when the next era starts
     **/
    nextEraStartingBlock(): Promise<number>;

    /**
     * Simple map where developer account points to their smart contract
     **/
    registeredDevelopers(arg: AccountId32Like): Promise<AstarRuntimeSmartContract>;

    /**
     * Simple map where smart contract points to basic info about it (e.g. developer address, state)
     **/
    registeredDapps(arg: AstarRuntimeSmartContract): Promise<PalletDappsStakingDAppInfo>;

    /**
     * General information about an era like TVL, total staked value, rewards.
     **/
    generalEraInfo(arg: number): Promise<PalletDappsStakingEraInfo>;

    /**
     * Staking information about contract in a particular era.
     **/
    contractEraStake(arg: [AstarRuntimeSmartContract, number]): Promise<PalletDappsStakingContractStakeInfo>;

    /**
     * Info about stakers stakes on particular contracts.
     **/
    generalStakerInfo(arg: [AccountId32Like, AstarRuntimeSmartContract]): Promise<PalletDappsStakingStakerInfo>;

    /**
     * Stores the current pallet storage version.
     **/
    storageVersion(): Promise<PalletDappsStakingVersion>;
  };
  blockReward: { rewardDistributionConfigStorage(): Promise<PalletBlockRewardRewardDistributionConfig> };
  assets: {
    /**
     * Details of an asset.
     **/
    asset(arg: bigint): Promise<PalletAssetsAssetDetails>;

    /**
     * The holdings of a specific account for a specific asset.
     **/
    account(arg: [bigint, AccountId32Like]): Promise<PalletAssetsAssetAccount>;

    /**
     * Approved balance transfers. First balance is the amount approved for transfer. Second
     * is the amount of `T::Currency` reserved for storing this.
     * First key is the asset ID, second key is the owner and third key is the delegate.
     **/
    approvals(arg: [bigint, AccountId32Like, AccountId32Like]): Promise<PalletAssetsApproval>;

    /**
     * Metadata of an asset.
     **/
    metadata(arg: bigint): Promise<PalletAssetsAssetMetadata>;
  };
  authorship: {
    /**
     * Author of current block.
     **/
    author(): Promise<AccountId32Like>;
  };
  collatorSelection: {
    /**
     * The invulnerable, fixed collators.
     **/
    invulnerables(): Promise<Array<AccountId32Like>>;

    /**
     * The (community, limited) collation candidates.
     **/
    candidates(): Promise<Array<PalletCollatorSelectionCandidateInfo>>;

    /**
     * Last block authored by collator.
     **/
    lastAuthoredBlock(arg: AccountId32Like): Promise<number>;

    /**
     * Desired number of candidates.
     *
     * This should ideally always be less than [`Config::MaxCandidates`] for weights to be correct.
     **/
    desiredCandidates(): Promise<number>;

    /**
     * Fixed amount to deposit to become a collator.
     *
     * When a collator calls `leave_intent` they immediately receive the deposit back.
     **/
    candidacyBond(): Promise<bigint>;

    /**
     * Destination account for slashed amount.
     **/
    slashDestination(): Promise<AccountId32Like>;
  };
  session: {
    /**
     * The current set of validators.
     **/
    validators(): Promise<Array<AccountId32Like>>;

    /**
     * Current index of the session.
     **/
    currentIndex(): Promise<number>;

    /**
     * True if the underlying economic identities or weighting behind the validators
     * has changed in the queued validator set.
     **/
    queuedChanged(): Promise<boolean>;

    /**
     * The queued keys for the next session. When the next session begins, these keys
     * will be used to determine the validator's session keys.
     **/
    queuedKeys(): Promise<Array<[AccountId32Like, AstarRuntimeSessionKeys]>>;

    /**
     * Indices of disabled validators.
     *
     * The vec is always kept sorted so that we can find whether a given validator is
     * disabled using binary search. It gets cleared when `on_session_ending` returns
     * a new set of identities.
     **/
    disabledValidators(): Promise<Array<number>>;

    /**
     * The next session keys for a validator.
     **/
    nextKeys(arg: AccountId32Like): Promise<AstarRuntimeSessionKeys>;

    /**
     * The owner of a key. The key is the `KeyTypeId` + the encoded key.
     **/
    keyOwner(arg: [SpCoreCryptoKeyTypeId, Bytes]): Promise<AccountId32Like>;
  };
  aura: {
    /**
     * The current authority set.
     **/
    authorities(): Promise<Array<SpConsensusAuraSr25519AppSr25519Public>>;

    /**
     * The current slot of this block.
     *
     * This will be set in `on_initialize`.
     **/
    currentSlot(): Promise<SpConsensusSlotsSlot>;
  };
  auraExt: {
    /**
     * Serves as cache for the authorities.
     *
     * The authorities in AuRa are overwritten in `on_initialize` when we switch to a new session,
     * but we require the old authorities to verify the seal when validating a PoV. This will always
     * be updated to the latest AuRa authorities in `on_finalize`.
     **/
    authorities(): Promise<Array<SpConsensusAuraSr25519AppSr25519Public>>;
  };
  xcmpQueue: {
    /**
     * Status of the inbound XCMP channels.
     **/
    inboundXcmpStatus(): Promise<Array<CumulusPalletXcmpQueueInboundChannelDetails>>;

    /**
     * Inbound aggregate XCMP messages. It can only be one per ParaId/block.
     **/
    inboundXcmpMessages(arg: [PolkadotParachainPrimitivesId, number]): Promise<Bytes>;

    /**
     * The non-empty XCMP channels in order of becoming non-empty, and the index of the first
     * and last outbound message. If the two indices are equal, then it indicates an empty
     * queue and there must be a non-`Ok` `OutboundStatus`. We assume queues grow no greater
     * than 65535 items. Queue indices for normal messages begin at one; zero is reserved in
     * case of the need to send a high-priority signal message this block.
     * The bool is true if there is a signal message waiting to be sent.
     **/
    outboundXcmpStatus(): Promise<Array<CumulusPalletXcmpQueueOutboundChannelDetails>>;

    /**
     * The messages outbound in a given XCMP channel.
     **/
    outboundXcmpMessages(arg: [PolkadotParachainPrimitivesId, number]): Promise<Bytes>;

    /**
     * Any signal messages waiting to be sent.
     **/
    signalMessages(arg: PolkadotParachainPrimitivesId): Promise<Bytes>;

    /**
     * The configuration which controls the dynamics of the outbound queue.
     **/
    queueConfig(): Promise<CumulusPalletXcmpQueueQueueConfigData>;

    /**
     * The messages that exceeded max individual message weight budget.
     *
     * These message stay in this storage map until they are manually dispatched via
     * `service_overweight`.
     **/
    overweight(arg: bigint): Promise<[PolkadotParachainPrimitivesId, number, Bytes]>;

    /**
     * Counter for the related counted storage map
     **/
    counterForOverweight(): Promise<number>;

    /**
     * The number of overweight messages ever recorded in `Overweight`. Also doubles as the next
     * available free overweight index.
     **/
    overweightCount(): Promise<bigint>;

    /**
     * Whether or not the XCMP queue is suspended from executing incoming XCMs or not.
     **/
    queueSuspended(): Promise<boolean>;
  };
  polkadotXcm: {
    /**
     * The latest available query index.
     **/
    queryCounter(): Promise<bigint>;

    /**
     * The ongoing queries.
     **/
    queries(arg: bigint): Promise<PalletXcmQueryStatus>;

    /**
     * The existing asset traps.
     *
     * Key is the blake2 256 hash of (origin, versioned `MultiAssets`) pair. Value is the number of
     * times this pair has been trapped (usually just 1 if it exists at all).
     **/
    assetTraps(arg: H256): Promise<number>;

    /**
     * Default version to encode XCM when latest version of destination is unknown. If `None`,
     * then the destinations whose XCM version is unknown are considered unreachable.
     **/
    safeXcmVersion(): Promise<number>;

    /**
     * The Latest versions that we know various locations support.
     **/
    supportedVersion(arg: [number, XcmVersionedMultiLocation]): Promise<number>;

    /**
     * All locations that we have requested version notifications from.
     **/
    versionNotifiers(arg: [number, XcmVersionedMultiLocation]): Promise<bigint>;

    /**
     * The target locations that are subscribed to our version changes, as well as the most recent
     * of our versions we informed them of.
     **/
    versionNotifyTargets(arg: [number, XcmVersionedMultiLocation]): Promise<[bigint, SpWeightsWeightV2Weight, number]>;

    /**
     * Destinations whose latest XCM version we would like to know. Duplicates not allowed, and
     * the `u32` counter is the number of times that a send to the destination has been attempted,
     * which is used as a prioritization.
     **/
    versionDiscoveryQueue(): Promise<Array<[XcmVersionedMultiLocation, number]>>;

    /**
     * The current migration's stage, if any.
     **/
    currentMigration(): Promise<PalletXcmVersionMigrationStage>;

    /**
     * Fungible assets which we know are locked on a remote chain.
     **/
    remoteLockedFungibles(
      arg: [number, AccountId32Like, XcmVersionedAssetId],
    ): Promise<PalletXcmRemoteLockedFungibleRecord>;

    /**
     * Fungible assets which we know are locked on this chain.
     **/
    lockedFungibles(arg: AccountId32Like): Promise<Array<[bigint, XcmVersionedMultiLocation]>>;

    /**
     * Global suspension state of the XCM executor.
     **/
    xcmExecutionSuspended(): Promise<boolean>;
  };
  dmpQueue: {
    /**
     * The configuration.
     **/
    configuration(): Promise<CumulusPalletDmpQueueConfigData>;

    /**
     * The page index.
     **/
    pageIndex(): Promise<CumulusPalletDmpQueuePageIndexData>;

    /**
     * The queue pages.
     **/
    pages(arg: number): Promise<Array<[number, Bytes]>>;

    /**
     * The overweight messages.
     **/
    overweight(arg: bigint): Promise<[number, Bytes]>;

    /**
     * Counter for the related counted storage map
     **/
    counterForOverweight(): Promise<number>;
  };
  xcAssetConfig: {
    /**
     * Mapping from an asset id to asset type.
     * Can be used when receiving transaction specifying an asset directly,
     * like transferring an asset from this chain to another.
     **/
    assetIdToLocation(arg: bigint): Promise<XcmVersionedMultiLocation>;

    /**
     * Mapping from an asset type to an asset id.
     * Can be used when receiving a multilocation XCM message to retrieve
     * the corresponding asset in which tokens should me minted.
     **/
    assetLocationToId(arg: XcmVersionedMultiLocation): Promise<bigint>;

    /**
     * Stores the units per second for local execution for a AssetLocation.
     * This is used to know how to charge for XCM execution in a particular asset.
     *
     * Not all asset types are supported for payment. If value exists here, it means it is supported.
     **/
    assetLocationUnitsPerSecond(arg: XcmVersionedMultiLocation): Promise<bigint>;
  };
  eVM: {
    accountCodes(arg: H160): Promise<Bytes>;
    accountCodesMetadata(arg: H160): Promise<PalletEvmCodeMetadata>;
    accountStorages(arg: [H160, H256]): Promise<H256>;
  };
  ethereum: {
    /**
     * Current building block's transactions and receipts.
     **/
    pending(): Promise<Array<[EthereumTransactionTransactionV2, FpRpcTransactionStatus, EthereumReceiptReceiptV3]>>;

    /**
     * The current Ethereum block.
     **/
    currentBlock(): Promise<EthereumBlock>;

    /**
     * The current Ethereum receipts.
     **/
    currentReceipts(): Promise<Array<EthereumReceiptReceiptV3>>;

    /**
     * The current transaction statuses.
     **/
    currentTransactionStatuses(): Promise<Array<FpRpcTransactionStatus>>;
    blockHash(arg: U256): Promise<H256>;
  };
  baseFee: {
    baseFeePerGas(): Promise<U256>;
    elasticity(): Promise<Permill>;
  };
  contracts: {
    /**
     * A mapping from an original code hash to the original code, untouched by instrumentation.
     **/
    pristineCode(arg: H256): Promise<Bytes>;

    /**
     * A mapping between an original code hash and instrumented wasm code, ready for execution.
     **/
    codeStorage(arg: H256): Promise<PalletContractsWasmPrefabWasmModule>;

    /**
     * A mapping between an original code hash and its owner information.
     **/
    ownerInfoOf(arg: H256): Promise<PalletContractsWasmOwnerInfo>;

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
    nonce(): Promise<bigint>;

    /**
     * The code associated with a given account.
     *
     * TWOX-NOTE: SAFE since `AccountId` is a secure hash.
     **/
    contractInfoOf(arg: AccountId32Like): Promise<PalletContractsStorageContractInfo>;

    /**
     * Evicted contracts that await child trie deletion.
     *
     * Child trie deletion is a heavy operation depending on the amount of storage items
     * stored in said trie. Therefore this operation is performed lazily in `on_idle`.
     **/
    deletionQueue(arg: number): Promise<Bytes>;

    /**
     * A pair of monotonic counters used to track the latest contract marked for deletion
     * and the latest deleted contract in queue.
     **/
    deletionQueueCounter(): Promise<PalletContractsStorageDeletionQueueManager>;
    migrationInProgress(): Promise<Bytes>;
  };
  sudo: {
    /**
     * The `AccountId` of the sudo key.
     **/
    key(): Promise<AccountId32Like>;
  };
}
