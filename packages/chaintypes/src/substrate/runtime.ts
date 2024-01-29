// Generated by @delightfuldot/codegen

import type { GenericRuntimeCalls, GenericRuntimeCall } from '@delightfuldot/types';
import type {
  RuntimeVersion,
  Block,
  Header,
  Option,
  OpaqueMetadata,
  ApplyExtrinsicResult,
  Bytes,
  CheckInherentsResult,
  InherentData,
  Extrinsic,
  TransactionValidity,
  TransactionSource,
  BlockHash,
  Null,
  SetId,
  OpaqueKeyOwnershipProof,
  AccountId32Like,
  AuthorityList,
  GrandpaEquivocationProof,
  Balance,
  NpPoolId,
  BabeConfiguration,
  BabeEpoch,
  Slot,
  BabeEquivocationProof,
  AccountId32,
  Nonce,
  RuntimeDispatchInfo,
  FeeDetails,
  Weight,
  Location,
  NftCollectionId,
  NftItemId,
  ResultPayload,
  Hash,
  MmrError,
  LeafIndex,
  BlockNumberLike,
  MmrEncodableOpaqueLeaf,
  MmrBatchProof,
  SessionStatus,
  Mixnode,
  MixnodesErr,
  MixnetSessionIndex,
  KeyTypeId,
} from '@delightfuldot/codecs';

export interface RuntimeCalls extends GenericRuntimeCalls {
  /**
   * @runtimeapi: Core - 0xdf6acb689907609b
   * @version: 4
   **/
  core: {
    /**
     * Returns the version of the runtime.
     *
     * @callname: Core_version
     **/
    version: GenericRuntimeCall<() => Promise<RuntimeVersion>>;

    /**
     * Execute the given block.
     *
     * @callname: Core_execute_block
     **/
    executeBlock: GenericRuntimeCall<(block: Block) => Promise<null>>;

    /**
     * Initialize a block with the given header.
     *
     * @callname: Core_initialize_block
     **/
    initializeBlock: GenericRuntimeCall<(header: Header) => Promise<null>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: Metadata - 0x37e397fc7c91f5e4
   * @version: 2
   **/
  metadata: {
    /**
     * Returns the metadata at a given version.
     *
     * @callname: Metadata_metadata_at_version
     **/
    metadataAtVersion: GenericRuntimeCall<(version: number) => Promise<Option<OpaqueMetadata>>>;

    /**
     * Returns the supported metadata versions.
     *
     * @callname: Metadata_metadata_versions
     **/
    metadataVersions: GenericRuntimeCall<() => Promise<Array<number>>>;

    /**
     * Returns the metadata of a runtime.
     *
     * @callname: Metadata_metadata
     **/
    metadata: GenericRuntimeCall<() => Promise<OpaqueMetadata>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: BlockBuilder - 0x40fe3ad401f8959a
   * @version: 6
   **/
  blockBuilder: {
    /**
     *
     * @callname: BlockBuilder_apply_extrinsic
     **/
    applyExtrinsic: GenericRuntimeCall<(extrinsic: Bytes) => Promise<ApplyExtrinsicResult>>;

    /**
     *
     * @callname: BlockBuilder_check_inherents
     **/
    checkInherents: GenericRuntimeCall<(block: Block, data: InherentData) => Promise<CheckInherentsResult>>;

    /**
     *
     * @callname: BlockBuilder_inherent_extrinsics
     **/
    inherentExtrinsics: GenericRuntimeCall<(inherent: InherentData) => Promise<Array<Extrinsic>>>;

    /**
     *
     * @callname: BlockBuilder_finalize_block
     **/
    finalizeBlock: GenericRuntimeCall<() => Promise<Header>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: TaggedTransactionQueue - 0xd2bc9897eed08f15
   * @version: 3
   **/
  taggedTransactionQueue: {
    /**
     * Validate the transaction.
     *
     * @callname: TaggedTransactionQueue_validate_transaction
     **/
    validateTransaction: GenericRuntimeCall<
      (source: TransactionSource, tx: Bytes, blockHash: BlockHash) => Promise<TransactionValidity>
    >;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: OffchainWorkerApi - 0xf78b278be53f454c
   * @version: 2
   **/
  offchainWorkerApi: {
    /**
     * Starts the off-chain task for given block header.
     *
     * @callname: OffchainWorkerApi_offchain_worker
     **/
    offchainWorker: GenericRuntimeCall<(header: Header) => Promise<Null>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: GrandpaApi - 0xed99c5acb25eedf5
   * @version: 3
   **/
  grandpaApi: {
    /**
     * Get current GRANDPA authority set id.
     *
     * @callname: GrandpaApi_current_set_id
     **/
    currentSetId: GenericRuntimeCall<() => Promise<SetId>>;

    /**
     * Get the current GRANDPA authorities and weights. This should not change except
     * for when changes are scheduled and the corresponding delay has passed.
     *
     * When called at block B, it will return the set of authorities that should be
     * used to finalize descendants of this block (B+1, B+2, ...). The block B itself
     * is finalized by the authorities from block B-1.
     *
     * @callname: GrandpaApi_generate_key_ownership_proof
     **/
    generateKeyOwnershipProof: GenericRuntimeCall<
      (setId: SetId, authorityId: AccountId32Like) => Promise<Option<OpaqueKeyOwnershipProof>>
    >;

    /**
     * Generates a proof of key ownership for the given authority in the
     * given set. An example usage of this module is coupled with the
     * session historical module to prove that a given authority key is
     * tied to a given staking identity during a specific session. Proofs
     * of key ownership are necessary for submitting equivocation reports.
     * NOTE: even though the API takes a `set_id` as parameter the current
     * implementations ignore this parameter and instead rely on this
     * method being called at the correct block height, i.e. any point at
     * which the given set id is live on-chain. Future implementations will
     * instead use indexed data through an offchain worker, not requiring
     * older states to be available.
     *
     * @callname: GrandpaApi_grandpa_authorities
     **/
    grandpaAuthorities: GenericRuntimeCall<() => Promise<AuthorityList>>;

    /**
     * Submits an unsigned extrinsic to report an equivocation. The caller
     * must provide the equivocation proof and a key ownership proof
     * (should be obtained using `generate_key_ownership_proof`). The
     * extrinsic will be unsigned and should only be accepted for local
     * authorship (not to be broadcast to the network). This method returns
     * `None` when creation of the extrinsic fails, e.g. if equivocation
     * reporting is disabled for the given runtime (i.e. this method is
     * hardcoded to return `None`). Only useful in an offchain context.
     *
     * @callname: GrandpaApi_submit_report_equivocation_unsigned_extrinsic
     **/
    submitReportEquivocationUnsignedExtrinsic: GenericRuntimeCall<
      (equivocationProof: GrandpaEquivocationProof, keyOwnerProof: OpaqueKeyOwnershipProof) => Promise<Option<Null>>
    >;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: NominationPoolsApi - 0x17a6bc0d0062aeb3
   * @version: 1
   **/
  nominationPoolsApi: {
    /**
     * Returns the pending rewards for the member that the AccountId was given for.
     *
     * @callname: NominationPoolsApi_pending_rewards
     **/
    pendingRewards: GenericRuntimeCall<(who: AccountId32Like) => Promise<Balance>>;

    /**
     * Returns the equivalent balance of `points` for a given pool.
     *
     * @callname: NominationPoolsApi_points_to_balance
     **/
    pointsToBalance: GenericRuntimeCall<(poolId: NpPoolId, points: Balance) => Promise<Balance>>;

    /**
     * Returns the equivalent points of `new_funds` for a given pool.
     *
     * @callname: NominationPoolsApi_balance_to_points
     **/
    balanceToPoints: GenericRuntimeCall<(poolId: NpPoolId, newFunds: Balance) => Promise<Balance>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: StakingApi - 0x18ef58a3b67ba770
   * @version: 1
   **/
  stakingApi: {
    /**
     * Returns the nominations quota for a nominator with a given balance.
     *
     * @callname: StakingApi_nominations_quota
     **/
    nominationsQuota: GenericRuntimeCall<(balance: Balance) => Promise<number>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: BabeApi - 0xcbca25e39f142387
   * @version: 2
   **/
  babeApi: {
    /**
     * Return the configuration for BABE.
     *
     * @callname: BabeApi_configuration
     **/
    configuration: GenericRuntimeCall<() => Promise<BabeConfiguration>>;

    /**
     * Returns information regarding the current epoch.
     *
     * @callname: BabeApi_current_epoch
     **/
    currentEpoch: GenericRuntimeCall<() => Promise<BabeEpoch>>;

    /**
     * Returns the slot that started the current epoch.
     *
     * @callname: BabeApi_current_epoch_start
     **/
    currentEpochStart: GenericRuntimeCall<() => Promise<Slot>>;

    /**
     * Returns information regarding the next epoch (which was already previously announced).
     *
     * @callname: BabeApi_next_epoch
     **/
    nextEpoch: GenericRuntimeCall<() => Promise<BabeEpoch>>;

    /**
     * Generates a proof of key ownership for the given authority in the
     * current epoch. An example usage of this module is coupled with the
     * session historical module to prove that a given authority key is
     * tied to a given staking identity during a specific session. Proofs
     * of key ownership are necessary for submitting equivocation reports.
     * NOTE: even though the API takes a `slot` as parameter the current
     * implementations ignores this parameter and instead relies on this
     * method being called at the correct block height, i.e. any point at
     * which the epoch for the given slot is live on-chain. Future
     * implementations will instead use indexed data through an offchain
     * worker, not requiring older states to be available.
     *
     * @callname: BabeApi_generate_key_ownership_proof
     **/
    generateKeyOwnershipProof: GenericRuntimeCall<
      (slot: Slot, authorityId: AccountId32Like) => Promise<Option<OpaqueKeyOwnershipProof>>
    >;

    /**
     * Submits an unsigned extrinsic to report an equivocation. The caller
     * must provide the equivocation proof and a key ownership proof
     * (should be obtained using `generate_key_ownership_proof`). The
     * extrinsic will be unsigned and should only be accepted for local
     * authorship (not to be broadcast to the network). This method returns
     * `None` when creation of the extrinsic fails, e.g. if equivocation
     * reporting is disabled for the given runtime (i.e. this method is
     * hardcoded to return `None`). Only useful in an offchain context.
     *
     * @callname: BabeApi_submit_report_equivocation_unsigned_extrinsic
     **/
    submitReportEquivocationUnsignedExtrinsic: GenericRuntimeCall<
      (equivocationProof: BabeEquivocationProof, keyOwnerProof: OpaqueKeyOwnershipProof) => Promise<Option<Null>>
    >;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: AuthorityDiscoveryApi - 0x687ad44ad37f03c2
   * @version: 1
   **/
  authorityDiscoveryApi: {
    /**
     * Retrieve authority identifiers of the current and next authority set.
     *
     * @callname: AuthorityDiscoveryApi_authorities
     **/
    authorities: GenericRuntimeCall<() => Promise<Array<AccountId32>>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: AccountNonceApi - 0xbc9d89904f5b923f
   * @version: 1
   **/
  accountNonceApi: {
    /**
     * The API to query account nonce (aka transaction index)
     *
     * @callname: AccountNonceApi_account_nonce
     **/
    accountNonce: GenericRuntimeCall<(accountId: AccountId32Like) => Promise<Nonce>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: AssetsApi - 0x8453b50b22293977
   * @version: 1
   **/
  assetsApi: {
    /**
     * Returns the list of `AssetId`s and corresponding balance that an `AccountId` has.
     *
     * @callname: AssetsApi_account_balances
     **/
    accountBalances: GenericRuntimeCall<(account: AccountId32Like) => Promise<Array<[number, Balance]>>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: TransactionPaymentApi - 0x37c8bb1350a9a2a8
   * @version: 4
   **/
  transactionPaymentApi: {
    /**
     * The transaction info
     *
     * @callname: TransactionPaymentApi_query_info
     **/
    queryInfo: GenericRuntimeCall<(uxt: Bytes, len: number) => Promise<RuntimeDispatchInfo>>;

    /**
     * The transaction fee details
     *
     * @callname: TransactionPaymentApi_query_fee_details
     **/
    queryFeeDetails: GenericRuntimeCall<(uxt: Bytes, len: number) => Promise<FeeDetails>>;

    /**
     * Query the output of the current LengthToFee given some input
     *
     * @callname: TransactionPaymentApi_query_length_to_fee
     **/
    queryLengthToFee: GenericRuntimeCall<(length: number) => Promise<Balance>>;

    /**
     * Query the output of the current WeightToFee given some input
     *
     * @callname: TransactionPaymentApi_query_weight_to_fee
     **/
    queryWeightToFee: GenericRuntimeCall<(weight: Weight) => Promise<Balance>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: AssetConversionApi - 0x8a8047a53a8277ec
   * @version: 1
   **/
  assetConversionApi: {
    /**
     * Get pool reserves
     *
     * @callname: AssetConversionApi_get_reserves
     **/
    getReserves: GenericRuntimeCall<(asset1: Location, asset2: Location) => Promise<Option<[Balance, Balance]>>>;

    /**
     * Quote price: exact tokens for tokens
     *
     * @callname: AssetConversionApi_quote_price_exact_tokens_for_tokens
     **/
    quotePriceExactTokensForTokens: GenericRuntimeCall<
      (asset1: Location, asset2: Location, amount: bigint, includeFee: boolean) => Promise<Option<Balance>>
    >;

    /**
     *
     * @callname: AssetConversionApi_quote_price_tokens_for_exact_tokens
     **/
    quotePriceTokensForExactTokens: GenericRuntimeCall<
      (asset1: Location, asset2: Location, amount: bigint, includeFee: boolean) => Promise<Option<Balance>>
    >;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: NftsApi - 0x899a250cbe84f250
   * @version: 1
   **/
  nftsApi: {
    /**
     * Collection owner
     *
     * @callname: NftsApi_owner
     **/
    owner: GenericRuntimeCall<(collection: NftCollectionId, item: NftItemId) => Promise<Option<AccountId32>>>;

    /**
     * A collection owner
     *
     * @callname: NftsApi_collection_owner
     **/
    collectionOwner: GenericRuntimeCall<(collection: NftCollectionId) => Promise<Option<AccountId32>>>;

    /**
     * An attribute
     *
     * @callname: NftsApi_attribute
     **/
    attribute: GenericRuntimeCall<
      (collection: NftCollectionId, item: NftItemId, key: Array<number>) => Promise<Option<Array<number>>>
    >;

    /**
     * A custom attribute
     *
     * @callname: NftsApi_custom_attribute
     **/
    customAttribute: GenericRuntimeCall<
      (
        account: AccountId32Like,
        collection: NftCollectionId,
        item: NftItemId,
        key: Array<number>,
      ) => Promise<Option<Array<number>>>
    >;

    /**
     * System attribute
     *
     * @callname: NftsApi_system_attribute
     **/
    systemAttribute: GenericRuntimeCall<
      (collection: NftCollectionId, item: NftItemId, key: Array<number>) => Promise<Option<Array<number>>>
    >;

    /**
     * A collection attribute
     *
     * @callname: NftsApi_collection_attribute
     **/
    collectionAttribute: GenericRuntimeCall<
      (collection: NftCollectionId, key: Array<number>) => Promise<Option<Array<number>>>
    >;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: MmrApi - 0x91d5df18b0d2cf58
   * @version: 2
   **/
  mmrApi: {
    /**
     * Return the on-chain MMR root hash.
     *
     * @callname: MmrApi_mmr_root
     **/
    mmrRoot: GenericRuntimeCall<() => Promise<ResultPayload<Hash, MmrError>>>;

    /**
     * Return the number of MMR blocks in the chain.
     *
     * @callname: MmrApi_mmr_leaf_count
     **/
    mmrLeafCount: GenericRuntimeCall<() => Promise<ResultPayload<LeafIndex, MmrError>>>;

    /**
     * Generate MMR proof for a series of block numbers. If `best_known_block_number = Some(n)`,
     * use historical MMR state at given block height `n`. Else, use current MMR state.
     *
     * @callname: MmrApi_generate_proof
     **/
    generateProof: GenericRuntimeCall<
      (
        blockNumbers: Array<BlockNumberLike>,
        bestKnownBlockNumber: Option<BlockNumberLike>,
      ) => Promise<ResultPayload<[Array<MmrEncodableOpaqueLeaf>, MmrBatchProof], MmrError>>
    >;

    /**
     * Verify MMR proof against on-chain MMR for a batch of leaves.
     *
     * Note this function will use on-chain MMR root hash and check if the proof matches the hash.
     * Note, the leaves should be sorted such that corresponding leaves and leaf indices have the
     * same position in both the `leaves` vector and the `leaf_indices` vector contained in the [Proof]
     *
     * @callname: MmrApi_verify_proof
     **/
    verifyProof: GenericRuntimeCall<
      (leaves: Array<MmrEncodableOpaqueLeaf>, proof: MmrBatchProof) => Promise<ResultPayload<Null, MmrError>>
    >;

    /**
     * Verify MMR proof against given root hash for a batch of leaves.
     *
     * Note this function does not require any on-chain storage - the
     * proof is verified against given MMR root hash.
     *
     * Note, the leaves should be sorted such that corresponding leaves and leaf indices have the
     * same position in both the `leaves` vector and the `leaf_indices` vector contained in the [Proof]
     *
     * @callname: MmrApi_verify_proof_stateless
     **/
    verifyProofStateless: GenericRuntimeCall<
      (
        root: Hash,
        leaves: Array<MmrEncodableOpaqueLeaf>,
        proof: MmrBatchProof,
      ) => Promise<ResultPayload<Null, MmrError>>
    >;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: MixnetApi - 0x6fd7c327202e4a8d
   * @version: 1
   **/
  mixnetApi: {
    /**
     *
     * @callname: MixnetApi_session_status
     **/
    sessionStatus: GenericRuntimeCall<() => Promise<SessionStatus>>;

    /**
     * Get the mixnode set for the previous session.
     *
     * @callname: MixnetApi_prev_mixnodes
     **/
    prevMixnodes: GenericRuntimeCall<() => Promise<ResultPayload<Array<Mixnode>, MixnodesErr>>>;

    /**
     * Get the mixnode set for the current session.
     *
     * @callname: MixnetApi_current_mixnodes
     **/
    currentMixnodes: GenericRuntimeCall<() => Promise<ResultPayload<Array<Mixnode>, MixnodesErr>>>;

    /**
     * Try to register a mixnode for the next session.
     *
     * @callname: MixnetApi_maybe_register
     **/
    maybeRegister: GenericRuntimeCall<(sessionIndex: MixnetSessionIndex, mixnode: Mixnode) => Promise<boolean>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
  /**
   * @runtimeapi: SessionKeys - 0xab3c0572291feb8b
   * @version: 1
   **/
  sessionKeys: {
    /**
     * Generate a set of session keys with optionally using the given seed.
     * The keys should be stored within the keystore exposed via runtime
     * externalities.
     *
     * The seed needs to be a valid `utf8` string.
     *
     * Returns the concatenated SCALE encoded public keys.
     *
     * @callname: SessionKeys_generate_session_keys
     **/
    generateSessionKeys: GenericRuntimeCall<(seed: Option<Array<number>>) => Promise<Array<number>>>;

    /**
     * Decode the given public session key
     *
     * Returns the list of public raw public keys + key typ
     *
     * @callname: SessionKeys_decode_session_keys
     **/
    decodeSessionKeys: GenericRuntimeCall<(encoded: Bytes) => Promise<Option<Array<[Array<number>, KeyTypeId]>>>>;

    /**
     * Generic runtime call
     **/
    [method: string]: GenericRuntimeCall;
  };
}
