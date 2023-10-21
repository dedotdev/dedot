// Generated by @delightfuldot/codegen
import { GenericChainConsts } from '@delightfuldot/types';
import {
  Bytes,
  FrameSupportPalletId,
  FrameSystemLimitsBlockLength,
  FrameSystemLimitsBlockWeights,
  KusamaRuntimeRuntimeHoldReason,
  PalletReferendaTrackInfo,
  Perbill,
  Permill,
  Perquintill,
  SpVersionRuntimeVersion,
  SpWeightsRuntimeDbWeight,
  SpWeightsWeightV2Weight,
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
  };
  babe: {
    /**
     * The amount of time, in slots, that each epoch should last.
     * NOTE: Currently it is not possible to change the epoch duration after
     * the chain has started. Attempting to do so will brick block production.
     **/
    epochDuration: bigint;

    /**
     * The expected average block time at which BABE should be creating
     * blocks. Since BABE is probabilistic it is not trivial to figure out
     * what the expected average block time should be based on the slot
     * duration and the security parameter `c` (where `1 - c` represents
     * the probability of a slot being empty).
     **/
    expectedBlockTime: bigint;

    /**
     * Max number of authorities allowed
     **/
    maxAuthorities: number;
  };
  timestamp: {
    /**
     * The minimum period between blocks. Beware that this is different to the *expected*
     * period that the block production apparatus provides. Your chosen consensus system will
     * generally work with this to determine a sensible block time. e.g. For Aura, it will be
     * double this period on default settings.
     **/
    minimumPeriod: bigint;
  };
  indices: {
    /**
     * The deposit needed for reserving an index.
     **/
    deposit: bigint;
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
  };
  authorship: {};
  staking: {
    /**
     * Maximum number of nominations per nominator.
     **/
    maxNominations: number;

    /**
     * Number of eras to keep in history.
     *
     * Following information is kept for eras in `[current_era -
     * HistoryDepth, current_era]`: `ErasStakers`, `ErasStakersClipped`,
     * `ErasValidatorPrefs`, `ErasValidatorReward`, `ErasRewardPoints`,
     * `ErasTotalStake`, `ErasStartSessionIndex`,
     * `StakingLedger.claimed_rewards`.
     *
     * Must be more than the number of eras delayed by session.
     * I.e. active era must always be in history. I.e. `active_era >
     * current_era - history_depth` must be guaranteed.
     *
     * If migrating an existing pallet from storage value to config value,
     * this should be set to same value or greater as in storage.
     *
     * Note: `HistoryDepth` is used as the upper bound for the `BoundedVec`
     * item `StakingLedger.claimed_rewards`. Setting this value lower than
     * the existing value can lead to inconsistencies in the
     * `StakingLedger` and will need to be handled properly in a migration.
     * The test `reducing_history_depth_abrupt` shows this effect.
     **/
    historyDepth: number;

    /**
     * Number of sessions per era.
     **/
    sessionsPerEra: number;

    /**
     * Number of eras that staked funds must remain bonded for.
     **/
    bondingDuration: number;

    /**
     * Number of eras that slashes are deferred by, after computation.
     *
     * This should be less than the bonding duration. Set to 0 if slashes
     * should be applied immediately, without opportunity for intervention.
     **/
    slashDeferDuration: number;

    /**
     * The maximum number of nominators rewarded for each validator.
     *
     * For each validator only the `$MaxNominatorRewardedPerValidator` biggest stakers can
     * claim their reward. This used to limit the i/o cost for the nominator payout.
     **/
    maxNominatorRewardedPerValidator: number;

    /**
     * The maximum number of `unlocking` chunks a [`StakingLedger`] can
     * have. Effectively determines how many unique eras a staker may be
     * unbonding in.
     *
     * Note: `MaxUnlockingChunks` is used as the upper bound for the
     * `BoundedVec` item `StakingLedger.unlocking`. Setting this value
     * lower than the existing value can lead to inconsistencies in the
     * `StakingLedger` and will need to be handled properly in a runtime
     * migration. The test `reducing_max_unlocking_chunks_abrupt` shows
     * this effect.
     **/
    maxUnlockingChunks: number;
  };
  offences: {};
  historical: {};
  session: {};
  grandpa: {
    /**
     * Max Authorities in use
     **/
    maxAuthorities: number;

    /**
     * The maximum number of entries to keep in the set id to session index mapping.
     *
     * Since the `SetIdSession` map is only used for validating equivocations this
     * value should relate to the bonding duration of whatever staking system is
     * being used (if any). If equivocation handling is not enabled then this value
     * can be zero.
     **/
    maxSetIdSessionEntries: bigint;
  };
  imOnline: {
    /**
     * A configuration for base priority of unsigned transactions.
     *
     * This is exposed so that it can be tuned for particular runtime, when
     * multiple pallets send unsigned transactions.
     **/
    unsignedPriority: bigint;
  };
  authorityDiscovery: {};
  treasury: {
    /**
     * Fraction of a proposal's value that should be bonded in order to place the proposal.
     * An accepted proposal gets these back. A rejected proposal does not.
     **/
    proposalBond: Permill;

    /**
     * Minimum amount of funds that should be placed in a deposit for making a proposal.
     **/
    proposalBondMinimum: bigint;

    /**
     * Maximum amount of funds that should be placed in a deposit for making a proposal.
     **/
    proposalBondMaximum: bigint | undefined;

    /**
     * Period between successive spends.
     **/
    spendPeriod: number;

    /**
     * Percentage of spare funds (if any) that are burnt per spend period.
     **/
    burn: Permill;

    /**
     * The treasury's pallet id, used for deriving its sovereign account ID.
     **/
    palletId: FrameSupportPalletId;

    /**
     * The maximum number of approvals that can wait in the spending queue.
     *
     * NOTE: This parameter is also used within the Bounties Pallet extension if enabled.
     **/
    maxApprovals: number;
  };
  convictionVoting: {
    /**
     * The maximum number of concurrent votes an account may have.
     *
     * Also used to compute weight, an overly large value can lead to extrinsics with large
     * weight estimation: see `delegate` for instance.
     **/
    maxVotes: number;

    /**
     * The minimum period of vote locking.
     *
     * It should be no shorter than enactment period to ensure that in the case of an approval,
     * those successful voters are locked into the consequences that their votes entail.
     **/
    voteLockingPeriod: number;
  };
  referenda: {
    /**
     * The minimum amount to be used as a deposit for a public referendum proposal.
     **/
    submissionDeposit: bigint;

    /**
     * Maximum size of the referendum queue for a single track.
     **/
    maxQueued: number;

    /**
     * The number of blocks after submission that a referendum must begin being decided by.
     * Once this passes, then anyone may cancel the referendum.
     **/
    undecidingTimeout: number;

    /**
     * Quantization level for the referendum wakeup scheduler. A higher number will result in
     * fewer storage reads/writes needed for smaller voters, but also result in delays to the
     * automatic referendum status changes. Explicit servicing instructions are unaffected.
     **/
    alarmInterval: number;

    /**
     * Information concerning the different referendum tracks.
     **/
    tracks: Array<[number, PalletReferendaTrackInfo]>;
  };
  fellowshipCollective: {};
  fellowshipReferenda: {
    /**
     * The minimum amount to be used as a deposit for a public referendum proposal.
     **/
    submissionDeposit: bigint;

    /**
     * Maximum size of the referendum queue for a single track.
     **/
    maxQueued: number;

    /**
     * The number of blocks after submission that a referendum must begin being decided by.
     * Once this passes, then anyone may cancel the referendum.
     **/
    undecidingTimeout: number;

    /**
     * Quantization level for the referendum wakeup scheduler. A higher number will result in
     * fewer storage reads/writes needed for smaller voters, but also result in delays to the
     * automatic referendum status changes. Explicit servicing instructions are unaffected.
     **/
    alarmInterval: number;

    /**
     * Information concerning the different referendum tracks.
     **/
    tracks: Array<[number, PalletReferendaTrackInfo]>;
  };
  whitelist: {};
  claims: { prefix: Bytes };
  utility: {
    /**
     * The limit on the number of batched calls.
     **/
    batchedCallsLimit: number;
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
  };
  society: {
    /**
     * The societies's pallet id
     **/
    palletId: FrameSupportPalletId;

    /**
     * The minimum amount of a deposit required for a bid to be made.
     **/
    candidateDeposit: bigint;

    /**
     * The amount of the unpaid reward that gets deducted in the case that either a skeptic
     * doesn't vote or someone votes in the wrong way.
     **/
    wrongSideDeduction: bigint;

    /**
     * The number of times a member may vote the wrong way (or not at all, when they are a
     * skeptic) before they become suspended.
     **/
    maxStrikes: number;

    /**
     * The amount of incentive paid within each period. Doesn't include VoterTip.
     **/
    periodSpend: bigint;

    /**
     * The number of blocks between candidate/membership rotation periods.
     **/
    rotationPeriod: number;

    /**
     * The maximum duration of the payout lock.
     **/
    maxLockDuration: number;

    /**
     * The number of blocks between membership challenges.
     **/
    challengePeriod: number;

    /**
     * The maximum number of candidates that we accept per round.
     **/
    maxCandidateIntake: number;
  };
  recovery: {
    /**
     * The base amount of currency needed to reserve for creating a recovery configuration.
     *
     * This is held for an additional storage item whose value size is
     * `2 + sizeof(BlockNumber, Balance)` bytes.
     **/
    configDepositBase: bigint;

    /**
     * The amount of currency needed per additional user when creating a recovery
     * configuration.
     *
     * This is held for adding `sizeof(AccountId)` bytes more into a pre-existing storage
     * value.
     **/
    friendDepositFactor: bigint;

    /**
     * The maximum amount of friends allowed in a recovery configuration.
     *
     * NOTE: The threshold programmed in this Pallet uses u16, so it does
     * not really make sense to have a limit here greater than u16::MAX.
     * But also, that is a lot more than you should probably set this value
     * to anyway...
     **/
    maxFriends: number;

    /**
     * The base amount of currency needed to reserve for starting a recovery.
     *
     * This is primarily held for deterring malicious recovery attempts, and should
     * have a value large enough that a bad actor would choose not to place this
     * deposit. It also acts to fund additional storage item whose value size is
     * `sizeof(BlockNumber, Balance + T * AccountId)` bytes. Where T is a configurable
     * threshold.
     **/
    recoveryDeposit: bigint;
  };
  vesting: {
    /**
     * The minimum amount transferred to call `vested_transfer`.
     **/
    minVestedTransfer: bigint;
    maxVestingSchedules: number;
  };
  scheduler: {
    /**
     * The maximum weight that may be scheduled per block for any dispatchables.
     **/
    maximumWeight: SpWeightsWeightV2Weight;

    /**
     * The maximum number of scheduled calls in the queue for a single block.
     *
     * NOTE:
     * + Dependent pallets' benchmarks might require a higher limit for the setting. Set a
     * higher limit under `runtime-benchmarks` feature.
     **/
    maxScheduledPerBlock: number;
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
  };
  preimage: {};
  bounties: {
    /**
     * The amount held on deposit for placing a bounty proposal.
     **/
    bountyDepositBase: bigint;

    /**
     * The delay period for which a bounty beneficiary need to wait before claim the payout.
     **/
    bountyDepositPayoutDelay: number;

    /**
     * Bounty duration in blocks.
     **/
    bountyUpdatePeriod: number;

    /**
     * The curator deposit is calculated as a percentage of the curator fee.
     *
     * This deposit has optional upper and lower bounds with `CuratorDepositMax` and
     * `CuratorDepositMin`.
     **/
    curatorDepositMultiplier: Permill;

    /**
     * Maximum amount of funds that should be placed in a deposit for making a proposal.
     **/
    curatorDepositMax: bigint | undefined;

    /**
     * Minimum amount of funds that should be placed in a deposit for making a proposal.
     **/
    curatorDepositMin: bigint | undefined;

    /**
     * Minimum value for a bounty.
     **/
    bountyValueMinimum: bigint;

    /**
     * The amount held on deposit per byte within the tip report reason or bounty description.
     **/
    dataDepositPerByte: bigint;

    /**
     * Maximum acceptable reason length.
     *
     * Benchmarks depend on this value, be sure to update weights file when changing this value
     **/
    maximumReasonLength: number;
  };
  childBounties: {
    /**
     * Maximum number of child bounties that can be added to a parent bounty.
     **/
    maxActiveChildBountyCount: number;

    /**
     * Minimum value for a child-bounty.
     **/
    childBountyValueMinimum: bigint;
  };
  electionProviderMultiPhase: {
    /**
     * Duration of the unsigned phase.
     **/
    unsignedPhase: number;

    /**
     * Duration of the signed phase.
     **/
    signedPhase: number;

    /**
     * The minimum amount of improvement to the solution score that defines a solution as
     * "better" in the Signed phase.
     **/
    betterSignedThreshold: Perbill;

    /**
     * The minimum amount of improvement to the solution score that defines a solution as
     * "better" in the Unsigned phase.
     **/
    betterUnsignedThreshold: Perbill;

    /**
     * The repeat threshold of the offchain worker.
     *
     * For example, if it is 5, that means that at least 5 blocks will elapse between attempts
     * to submit the worker's solution.
     **/
    offchainRepeat: number;

    /**
     * The priority of the unsigned transaction submitted in the unsigned-phase
     **/
    minerTxPriority: bigint;

    /**
     * Maximum number of signed submissions that can be queued.
     *
     * It is best to avoid adjusting this during an election, as it impacts downstream data
     * structures. In particular, `SignedSubmissionIndices<T>` is bounded on this value. If you
     * update this value during an election, you _must_ ensure that
     * `SignedSubmissionIndices.len()` is less than or equal to the new value. Otherwise,
     * attempts to submit new solutions may cause a runtime panic.
     **/
    signedMaxSubmissions: number;

    /**
     * Maximum weight of a signed solution.
     *
     * If [`Config::MinerConfig`] is being implemented to submit signed solutions (outside of
     * this pallet), then [`MinerConfig::solution_weight`] is used to compare against
     * this value.
     **/
    signedMaxWeight: SpWeightsWeightV2Weight;

    /**
     * The maximum amount of unchecked solutions to refund the call fee for.
     **/
    signedMaxRefunds: number;

    /**
     * Base reward for a signed solution
     **/
    signedRewardBase: bigint;

    /**
     * Base deposit for a signed solution.
     **/
    signedDepositBase: bigint;

    /**
     * Per-byte deposit for a signed solution.
     **/
    signedDepositByte: bigint;

    /**
     * Per-weight deposit for a signed solution.
     **/
    signedDepositWeight: bigint;

    /**
     * The maximum number of electing voters to put in the snapshot. At the moment, snapshots
     * are only over a single block, but once multi-block elections are introduced they will
     * take place over multiple blocks.
     **/
    maxElectingVoters: number;

    /**
     * The maximum number of electable targets to put in the snapshot.
     **/
    maxElectableTargets: number;

    /**
     * The maximum number of winners that can be elected by this `ElectionProvider`
     * implementation.
     *
     * Note: This must always be greater or equal to `T::DataProvider::desired_targets()`.
     **/
    maxWinners: number;
    minerMaxLength: number;
    minerMaxWeight: SpWeightsWeightV2Weight;
    minerMaxVotesPerVoter: number;
    minerMaxWinners: number;
  };
  nis: {
    /**
     * The treasury's pallet id, used for deriving its sovereign account ID.
     **/
    palletId: FrameSupportPalletId;

    /**
     * The identifier of the hold reason.
     **/
    holdReason: KusamaRuntimeRuntimeHoldReason;

    /**
     * Number of duration queues in total. This sets the maximum duration supported, which is
     * this value multiplied by `Period`.
     **/
    queueCount: number;

    /**
     * Maximum number of items that may be in each duration queue.
     *
     * Must be larger than zero.
     **/
    maxQueueLen: number;

    /**
     * Portion of the queue which is free from ordering and just a FIFO.
     *
     * Must be no greater than `MaxQueueLen`.
     **/
    fifoQueueLen: number;

    /**
     * The base period for the duration queues. This is the common multiple across all
     * supported freezing durations that can be bid upon.
     **/
    basePeriod: number;

    /**
     * The minimum amount of funds that may be placed in a bid. Note that this
     * does not actually limit the amount which may be represented in a receipt since bids may
     * be split up by the system.
     *
     * It should be at least big enough to ensure that there is no possible storage spam attack
     * or queue-filling attack.
     **/
    minBid: bigint;

    /**
     * The minimum amount of funds which may intentionally be left remaining under a single
     * receipt.
     **/
    minReceipt: Perquintill;

    /**
     * The number of blocks between consecutive attempts to dequeue bids and create receipts.
     *
     * A larger value results in fewer storage hits each block, but a slower period to get to
     * the target.
     **/
    intakePeriod: number;

    /**
     * The maximum amount of bids that can consolidated into receipts in a single intake. A
     * larger value here means less of the block available for transactions should there be a
     * glut of bids.
     **/
    maxIntakeWeight: SpWeightsWeightV2Weight;

    /**
     * The maximum proportion which may be thawed and the period over which it is reset.
     **/
    thawThrottle: [Perquintill, number];
  };
  nisCounterpartBalances: {
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
  };
  voterList: {
    /**
     * The list of thresholds separating the various bags.
     *
     * Ids are separated into unsorted bags according to their score. This specifies the
     * thresholds separating the bags. An id's bag is the largest bag for which the id's score
     * is less than or equal to its upper threshold.
     *
     * When ids are iterated, higher bags are iterated completely before lower bags. This means
     * that iteration is _semi-sorted_: ids of higher score tend to come before ids of lower
     * score, but peer ids within a particular bag are sorted in insertion order.
     *
     * # Expressing the constant
     *
     * This constant must be sorted in strictly increasing order. Duplicate items are not
     * permitted.
     *
     * There is an implied upper limit of `Score::MAX`; that value does not need to be
     * specified within the bag. For any two threshold lists, if one ends with
     * `Score::MAX`, the other one does not, and they are otherwise equal, the two
     * lists will behave identically.
     *
     * # Calculation
     *
     * It is recommended to generate the set of thresholds in a geometric series, such that
     * there exists some constant ratio such that `threshold[k + 1] == (threshold[k] *
     * constant_ratio).max(threshold[k] + 1)` for all `k`.
     *
     * The helpers in the `/utils/frame/generate-bags` module can simplify this calculation.
     *
     * # Examples
     *
     * - If `BagThresholds::get().is_empty()`, then all ids are put into the same bag, and
     * iteration is strictly in insertion order.
     * - If `BagThresholds::get().len() == 64`, and the thresholds are determined according to
     * the procedure given above, then the constant ratio is equal to 2.
     * - If `BagThresholds::get().len() == 200`, and the thresholds are determined according to
     * the procedure given above, then the constant ratio is approximately equal to 1.248.
     * - If the threshold list begins `[1, 2, 3, ...]`, then an id with score 0 or 1 will fall
     * into bag 0, an id with score 2 will fall into bag 1, etc.
     *
     * # Migration
     *
     * In the event that this list ever changes, a copy of the old bags list must be retained.
     * With that `List::migrate` can be called, which will perform the appropriate migration.
     **/
    bagThresholds: Array<bigint>;
  };
  nominationPools: {
    /**
     * The nomination pool's pallet id.
     **/
    palletId: FrameSupportPalletId;

    /**
     * The maximum pool points-to-balance ratio that an `open` pool can have.
     *
     * This is important in the event slashing takes place and the pool's points-to-balance
     * ratio becomes disproportional.
     *
     * Moreover, this relates to the `RewardCounter` type as well, as the arithmetic operations
     * are a function of number of points, and by setting this value to e.g. 10, you ensure
     * that the total number of points in the system are at most 10 times the total_issuance of
     * the chain, in the absolute worse case.
     *
     * For a value of 10, the threshold would be a pool points-to-balance ratio of 10:1.
     * Such a scenario would also be the equivalent of the pool being 90% slashed.
     **/
    maxPointsToBalance: number;
  };
  fastUnstake: {
    /**
     * Deposit to take for unstaking, to make sure we're able to slash the it in order to cover
     * the costs of resources on unsuccessful unstake.
     **/
    deposit: bigint;
  };
  parachainsOrigin: {};
  configuration: {};
  parasShared: {};
  paraInclusion: {};
  paraInherent: {};
  paraScheduler: {};
  paras: { unsignedPriority: bigint };
  initializer: {};
  dmp: {};
  hrmp: {};
  paraSessionInfo: {};
  parasDisputes: {};
  parasSlashing: {};
  registrar: {
    /**
     * The deposit to be paid to run a parathread.
     * This should include the cost for storing the genesis head and validation code.
     **/
    paraDeposit: bigint;

    /**
     * The deposit to be paid per byte stored on chain.
     **/
    dataDepositPerByte: bigint;
  };
  slots: {
    /**
     * The number of blocks over which a single period lasts.
     **/
    leasePeriod: number;

    /**
     * The number of blocks to offset each lease period by.
     **/
    leaseOffset: number;
  };
  auctions: {
    /**
     * The number of blocks over which an auction may be retroactively ended.
     **/
    endingPeriod: number;

    /**
     * The length of each sample to take during the ending period.
     *
     * `EndingPeriod` / `SampleLength` = Total # of Samples
     **/
    sampleLength: number;
    slotRangeCount: number;
    leasePeriodsPerSlot: number;
  };
  crowdloan: {
    /**
     * `PalletId` for the crowdloan pallet. An appropriate value could be `PalletId(*b"py/cfund")`
     **/
    palletId: FrameSupportPalletId;

    /**
     * The minimum amount that may be contributed into a crowdloan. Should almost certainly be at
     * least `ExistentialDeposit`.
     **/
    minContribution: bigint;

    /**
     * Max number of storage keys to remove per extrinsic call.
     **/
    removeKeysLimit: number;
  };
  xcmPallet: {};
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
  };
}
