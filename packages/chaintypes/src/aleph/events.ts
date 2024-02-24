// Generated by @delightfuldot/codegen

import type { GenericChainEvents, GenericPalletEvent } from '@delightfuldot/types';
import type {
  DispatchInfo,
  DispatchError,
  AccountId32,
  H256,
  FixedBytes,
  Result,
  Perbill,
  Bytes,
} from '@delightfuldot/codecs';
import type {
  FrameSupportTokensMiscBalanceStatus,
  PalletStakingValidatorPrefs,
  PalletStakingForcing,
  PrimitivesAppPublic,
  PrimitivesVersionChange,
  PrimitivesCommitteeSeats,
  PalletMultisigTimepoint,
  PalletContractsOrigin,
  PalletNominationPoolsPoolState,
  PalletNominationPoolsCommissionChangeRate,
  PrimitivesBanConfig,
  PrimitivesBanInfo,
} from './types';

export interface ChainEvents extends GenericChainEvents {
  system: {
    /**
     * An extrinsic completed successfully.
     **/
    ExtrinsicSuccess: GenericPalletEvent<'System', 'ExtrinsicSuccess', { dispatchInfo: DispatchInfo }>;

    /**
     * An extrinsic failed.
     **/
    ExtrinsicFailed: GenericPalletEvent<
      'System',
      'ExtrinsicFailed',
      { dispatchError: DispatchError; dispatchInfo: DispatchInfo }
    >;

    /**
     * `:code` was updated.
     **/
    CodeUpdated: GenericPalletEvent<'System', 'CodeUpdated', null>;

    /**
     * A new account was created.
     **/
    NewAccount: GenericPalletEvent<'System', 'NewAccount', { account: AccountId32 }>;

    /**
     * An account was reaped.
     **/
    KilledAccount: GenericPalletEvent<'System', 'KilledAccount', { account: AccountId32 }>;

    /**
     * On on-chain remark happened.
     **/
    Remarked: GenericPalletEvent<'System', 'Remarked', { sender: AccountId32; hash: H256 }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  scheduler: {
    /**
     * Scheduled some task.
     **/
    Scheduled: GenericPalletEvent<'Scheduler', 'Scheduled', { when: number; index: number }>;

    /**
     * Canceled some task.
     **/
    Canceled: GenericPalletEvent<'Scheduler', 'Canceled', { when: number; index: number }>;

    /**
     * Dispatched some task.
     **/
    Dispatched: GenericPalletEvent<
      'Scheduler',
      'Dispatched',
      { task: [number, number]; id?: FixedBytes<32> | undefined; result: Result<[], DispatchError> }
    >;

    /**
     * The call for the provided hash was not found so the task has been aborted.
     **/
    CallUnavailable: GenericPalletEvent<
      'Scheduler',
      'CallUnavailable',
      { task: [number, number]; id?: FixedBytes<32> | undefined }
    >;

    /**
     * The given task was unable to be renewed since the agenda is full at that block.
     **/
    PeriodicFailed: GenericPalletEvent<
      'Scheduler',
      'PeriodicFailed',
      { task: [number, number]; id?: FixedBytes<32> | undefined }
    >;

    /**
     * The given task can never be executed since it is overweight.
     **/
    PermanentlyOverweight: GenericPalletEvent<
      'Scheduler',
      'PermanentlyOverweight',
      { task: [number, number]; id?: FixedBytes<32> | undefined }
    >;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  balances: {
    /**
     * An account was created with some free balance.
     **/
    Endowed: GenericPalletEvent<'Balances', 'Endowed', { account: AccountId32; freeBalance: bigint }>;

    /**
     * An account was removed whose balance was non-zero but below ExistentialDeposit,
     * resulting in an outright loss.
     **/
    DustLost: GenericPalletEvent<'Balances', 'DustLost', { account: AccountId32; amount: bigint }>;

    /**
     * Transfer succeeded.
     **/
    Transfer: GenericPalletEvent<'Balances', 'Transfer', { from: AccountId32; to: AccountId32; amount: bigint }>;

    /**
     * A balance was set by root.
     **/
    BalanceSet: GenericPalletEvent<'Balances', 'BalanceSet', { who: AccountId32; free: bigint }>;

    /**
     * Some balance was reserved (moved from free to reserved).
     **/
    Reserved: GenericPalletEvent<'Balances', 'Reserved', { who: AccountId32; amount: bigint }>;

    /**
     * Some balance was unreserved (moved from reserved to free).
     **/
    Unreserved: GenericPalletEvent<'Balances', 'Unreserved', { who: AccountId32; amount: bigint }>;

    /**
     * Some balance was moved from the reserve of the first account to the second account.
     * Final argument indicates the destination balance type.
     **/
    ReserveRepatriated: GenericPalletEvent<
      'Balances',
      'ReserveRepatriated',
      { from: AccountId32; to: AccountId32; amount: bigint; destinationStatus: FrameSupportTokensMiscBalanceStatus }
    >;

    /**
     * Some amount was deposited (e.g. for transaction fees).
     **/
    Deposit: GenericPalletEvent<'Balances', 'Deposit', { who: AccountId32; amount: bigint }>;

    /**
     * Some amount was withdrawn from the account (e.g. for transaction fees).
     **/
    Withdraw: GenericPalletEvent<'Balances', 'Withdraw', { who: AccountId32; amount: bigint }>;

    /**
     * Some amount was removed from the account (e.g. for misbehavior).
     **/
    Slashed: GenericPalletEvent<'Balances', 'Slashed', { who: AccountId32; amount: bigint }>;

    /**
     * Some amount was minted into an account.
     **/
    Minted: GenericPalletEvent<'Balances', 'Minted', { who: AccountId32; amount: bigint }>;

    /**
     * Some amount was burned from an account.
     **/
    Burned: GenericPalletEvent<'Balances', 'Burned', { who: AccountId32; amount: bigint }>;

    /**
     * Some amount was suspended from an account (it can be restored later).
     **/
    Suspended: GenericPalletEvent<'Balances', 'Suspended', { who: AccountId32; amount: bigint }>;

    /**
     * Some amount was restored into an account.
     **/
    Restored: GenericPalletEvent<'Balances', 'Restored', { who: AccountId32; amount: bigint }>;

    /**
     * An account was upgraded.
     **/
    Upgraded: GenericPalletEvent<'Balances', 'Upgraded', { who: AccountId32 }>;

    /**
     * Total issuance was increased by `amount`, creating a credit to be balanced.
     **/
    Issued: GenericPalletEvent<'Balances', 'Issued', { amount: bigint }>;

    /**
     * Total issuance was decreased by `amount`, creating a debt to be balanced.
     **/
    Rescinded: GenericPalletEvent<'Balances', 'Rescinded', { amount: bigint }>;

    /**
     * Some balance was locked.
     **/
    Locked: GenericPalletEvent<'Balances', 'Locked', { who: AccountId32; amount: bigint }>;

    /**
     * Some balance was unlocked.
     **/
    Unlocked: GenericPalletEvent<'Balances', 'Unlocked', { who: AccountId32; amount: bigint }>;

    /**
     * Some balance was frozen.
     **/
    Frozen: GenericPalletEvent<'Balances', 'Frozen', { who: AccountId32; amount: bigint }>;

    /**
     * Some balance was thawed.
     **/
    Thawed: GenericPalletEvent<'Balances', 'Thawed', { who: AccountId32; amount: bigint }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  transactionPayment: {
    /**
     * A transaction fee `actual_fee`, of which `tip` was added to the minimum inclusion fee,
     * has been paid by `who`.
     **/
    TransactionFeePaid: GenericPalletEvent<
      'TransactionPayment',
      'TransactionFeePaid',
      { who: AccountId32; actualFee: bigint; tip: bigint }
    >;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  staking: {
    /**
     * The era payout has been set; the first balance is the validator-payout; the second is
     * the remainder from the maximum amount of reward.
     **/
    EraPaid: GenericPalletEvent<'Staking', 'EraPaid', { eraIndex: number; validatorPayout: bigint; remainder: bigint }>;

    /**
     * The nominator has been rewarded by this amount.
     **/
    Rewarded: GenericPalletEvent<'Staking', 'Rewarded', { stash: AccountId32; amount: bigint }>;

    /**
     * A staker (validator or nominator) has been slashed by the given amount.
     **/
    Slashed: GenericPalletEvent<'Staking', 'Slashed', { staker: AccountId32; amount: bigint }>;

    /**
     * A slash for the given validator, for the given percentage of their stake, at the given
     * era as been reported.
     **/
    SlashReported: GenericPalletEvent<
      'Staking',
      'SlashReported',
      { validator: AccountId32; fraction: Perbill; slashEra: number }
    >;

    /**
     * An old slashing report from a prior era was discarded because it could
     * not be processed.
     **/
    OldSlashingReportDiscarded: GenericPalletEvent<'Staking', 'OldSlashingReportDiscarded', { sessionIndex: number }>;

    /**
     * A new set of stakers was elected.
     **/
    StakersElected: GenericPalletEvent<'Staking', 'StakersElected', null>;

    /**
     * An account has bonded this amount. \[stash, amount\]
     *
     * NOTE: This event is only emitted when funds are bonded via a dispatchable. Notably,
     * it will not be emitted for staking rewards when they are added to stake.
     **/
    Bonded: GenericPalletEvent<'Staking', 'Bonded', { stash: AccountId32; amount: bigint }>;

    /**
     * An account has unbonded this amount.
     **/
    Unbonded: GenericPalletEvent<'Staking', 'Unbonded', { stash: AccountId32; amount: bigint }>;

    /**
     * An account has called `withdraw_unbonded` and removed unbonding chunks worth `Balance`
     * from the unlocking queue.
     **/
    Withdrawn: GenericPalletEvent<'Staking', 'Withdrawn', { stash: AccountId32; amount: bigint }>;

    /**
     * A nominator has been kicked from a validator.
     **/
    Kicked: GenericPalletEvent<'Staking', 'Kicked', { nominator: AccountId32; stash: AccountId32 }>;

    /**
     * The election failed. No new era is planned.
     **/
    StakingElectionFailed: GenericPalletEvent<'Staking', 'StakingElectionFailed', null>;

    /**
     * An account has stopped participating as either a validator or nominator.
     **/
    Chilled: GenericPalletEvent<'Staking', 'Chilled', { stash: AccountId32 }>;

    /**
     * The stakers' rewards are getting paid.
     **/
    PayoutStarted: GenericPalletEvent<'Staking', 'PayoutStarted', { eraIndex: number; validatorStash: AccountId32 }>;

    /**
     * A validator has set their preferences.
     **/
    ValidatorPrefsSet: GenericPalletEvent<
      'Staking',
      'ValidatorPrefsSet',
      { stash: AccountId32; prefs: PalletStakingValidatorPrefs }
    >;

    /**
     * A new force era mode was set.
     **/
    ForceEra: GenericPalletEvent<'Staking', 'ForceEra', { mode: PalletStakingForcing }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  session: {
    /**
     * New session has happened. Note that the argument is the session index, not the
     * block number as the type might suggest.
     **/
    NewSession: GenericPalletEvent<'Session', 'NewSession', { sessionIndex: number }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  aleph: {
    ChangeEmergencyFinalizer: GenericPalletEvent<'Aleph', 'ChangeEmergencyFinalizer', PrimitivesAppPublic>;
    ScheduleFinalityVersionChange: GenericPalletEvent<
      'Aleph',
      'ScheduleFinalityVersionChange',
      PrimitivesVersionChange
    >;
    FinalityVersionChange: GenericPalletEvent<'Aleph', 'FinalityVersionChange', PrimitivesVersionChange>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  elections: {
    /**
     * Committee for the next era has changed
     **/
    ChangeValidators: GenericPalletEvent<
      'Elections',
      'ChangeValidators',
      [Array<AccountId32>, Array<AccountId32>, PrimitivesCommitteeSeats]
    >;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  treasury: {
    /**
     * New proposal.
     **/
    Proposed: GenericPalletEvent<'Treasury', 'Proposed', { proposalIndex: number }>;

    /**
     * We have ended a spend period and will now allocate funds.
     **/
    Spending: GenericPalletEvent<'Treasury', 'Spending', { budgetRemaining: bigint }>;

    /**
     * Some funds have been allocated.
     **/
    Awarded: GenericPalletEvent<'Treasury', 'Awarded', { proposalIndex: number; award: bigint; account: AccountId32 }>;

    /**
     * A proposal was rejected; funds were slashed.
     **/
    Rejected: GenericPalletEvent<'Treasury', 'Rejected', { proposalIndex: number; slashed: bigint }>;

    /**
     * Some of our funds have been burnt.
     **/
    Burnt: GenericPalletEvent<'Treasury', 'Burnt', { burntFunds: bigint }>;

    /**
     * Spending has finished; this is the amount that rolls over until next spend.
     **/
    Rollover: GenericPalletEvent<'Treasury', 'Rollover', { rolloverBalance: bigint }>;

    /**
     * Some funds have been deposited.
     **/
    Deposit: GenericPalletEvent<'Treasury', 'Deposit', { value: bigint }>;

    /**
     * A new spend proposal has been approved.
     **/
    SpendApproved: GenericPalletEvent<
      'Treasury',
      'SpendApproved',
      { proposalIndex: number; amount: bigint; beneficiary: AccountId32 }
    >;

    /**
     * The inactive funds of the pallet have been updated.
     **/
    UpdatedInactive: GenericPalletEvent<'Treasury', 'UpdatedInactive', { reactivated: bigint; deactivated: bigint }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  vesting: {
    /**
     * The amount vested has been updated. This could indicate a change in funds available.
     * The balance given is the amount which is left unvested (and thus locked).
     **/
    VestingUpdated: GenericPalletEvent<'Vesting', 'VestingUpdated', { account: AccountId32; unvested: bigint }>;

    /**
     * An \[account\] has become fully vested.
     **/
    VestingCompleted: GenericPalletEvent<'Vesting', 'VestingCompleted', { account: AccountId32 }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  utility: {
    /**
     * Batch of dispatches did not complete fully. Index of first failing dispatch given, as
     * well as the error.
     **/
    BatchInterrupted: GenericPalletEvent<'Utility', 'BatchInterrupted', { index: number; error: DispatchError }>;

    /**
     * Batch of dispatches completed fully with no error.
     **/
    BatchCompleted: GenericPalletEvent<'Utility', 'BatchCompleted', null>;

    /**
     * Batch of dispatches completed but has errors.
     **/
    BatchCompletedWithErrors: GenericPalletEvent<'Utility', 'BatchCompletedWithErrors', null>;

    /**
     * A single item within a Batch of dispatches has completed with no error.
     **/
    ItemCompleted: GenericPalletEvent<'Utility', 'ItemCompleted', null>;

    /**
     * A single item within a Batch of dispatches has completed with error.
     **/
    ItemFailed: GenericPalletEvent<'Utility', 'ItemFailed', { error: DispatchError }>;

    /**
     * A call was dispatched.
     **/
    DispatchedAs: GenericPalletEvent<'Utility', 'DispatchedAs', { result: Result<[], DispatchError> }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  multisig: {
    /**
     * A new multisig operation has begun.
     **/
    NewMultisig: GenericPalletEvent<
      'Multisig',
      'NewMultisig',
      { approving: AccountId32; multisig: AccountId32; callHash: FixedBytes<32> }
    >;

    /**
     * A multisig operation has been approved by someone.
     **/
    MultisigApproval: GenericPalletEvent<
      'Multisig',
      'MultisigApproval',
      { approving: AccountId32; timepoint: PalletMultisigTimepoint; multisig: AccountId32; callHash: FixedBytes<32> }
    >;

    /**
     * A multisig operation has been executed.
     **/
    MultisigExecuted: GenericPalletEvent<
      'Multisig',
      'MultisigExecuted',
      {
        approving: AccountId32;
        timepoint: PalletMultisigTimepoint;
        multisig: AccountId32;
        callHash: FixedBytes<32>;
        result: Result<[], DispatchError>;
      }
    >;

    /**
     * A multisig operation has been cancelled.
     **/
    MultisigCancelled: GenericPalletEvent<
      'Multisig',
      'MultisigCancelled',
      { cancelling: AccountId32; timepoint: PalletMultisigTimepoint; multisig: AccountId32; callHash: FixedBytes<32> }
    >;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  sudo: {
    /**
     * A sudo just took place. \[result\]
     **/
    Sudid: GenericPalletEvent<'Sudo', 'Sudid', { sudoResult: Result<[], DispatchError> }>;

    /**
     * The \[sudoer\] just switched identity; the old key is supplied if one existed.
     **/
    KeyChanged: GenericPalletEvent<'Sudo', 'KeyChanged', { oldSudoer?: AccountId32 | undefined }>;

    /**
     * A sudo just took place. \[result\]
     **/
    SudoAsDone: GenericPalletEvent<'Sudo', 'SudoAsDone', { sudoResult: Result<[], DispatchError> }>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  contracts: {
    /**
     * Contract deployed by address at the specified address.
     **/
    Instantiated: GenericPalletEvent<'Contracts', 'Instantiated', { deployer: AccountId32; contract: AccountId32 }>;

    /**
     * Contract has been removed.
     *
     * # Note
     *
     * The only way for a contract to be removed and emitting this event is by calling
     * `seal_terminate`.
     **/
    Terminated: GenericPalletEvent<
      'Contracts',
      'Terminated',
      {
        /**
         * The contract that was terminated.
         **/
        contract: AccountId32;

        /**
         * The account that received the contracts remaining balance
         **/
        beneficiary: AccountId32;
      }
    >;

    /**
     * Code with the specified hash has been stored.
     **/
    CodeStored: GenericPalletEvent<'Contracts', 'CodeStored', { codeHash: H256 }>;

    /**
     * A custom event emitted by the contract.
     **/
    ContractEmitted: GenericPalletEvent<
      'Contracts',
      'ContractEmitted',
      {
        /**
         * The contract that emitted the event.
         **/
        contract: AccountId32;

        /**
         * Data supplied by the contract. Metadata generated during contract compilation
         * is needed to decode it.
         **/
        data: Bytes;
      }
    >;

    /**
     * A code with the specified hash was removed.
     **/
    CodeRemoved: GenericPalletEvent<'Contracts', 'CodeRemoved', { codeHash: H256 }>;

    /**
     * A contract's code was updated.
     **/
    ContractCodeUpdated: GenericPalletEvent<
      'Contracts',
      'ContractCodeUpdated',
      {
        /**
         * The contract that has been updated.
         **/
        contract: AccountId32;

        /**
         * New code hash that was set for the contract.
         **/
        newCodeHash: H256;

        /**
         * Previous code hash of the contract.
         **/
        oldCodeHash: H256;
      }
    >;

    /**
     * A contract was called either by a plain account or another contract.
     *
     * # Note
     *
     * Please keep in mind that like all events this is only emitted for successful
     * calls. This is because on failure all storage changes including events are
     * rolled back.
     **/
    Called: GenericPalletEvent<
      'Contracts',
      'Called',
      {
        /**
         * The caller of the `contract`.
         **/
        caller: PalletContractsOrigin;

        /**
         * The contract that was called.
         **/
        contract: AccountId32;
      }
    >;

    /**
     * A contract delegate called a code hash.
     *
     * # Note
     *
     * Please keep in mind that like all events this is only emitted for successful
     * calls. This is because on failure all storage changes including events are
     * rolled back.
     **/
    DelegateCalled: GenericPalletEvent<
      'Contracts',
      'DelegateCalled',
      {
        /**
         * The contract that performed the delegate call and hence in whose context
         * the `code_hash` is executed.
         **/
        contract: AccountId32;

        /**
         * The code hash that was delegate called.
         **/
        codeHash: H256;
      }
    >;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  nominationPools: {
    /**
     * A pool has been created.
     **/
    Created: GenericPalletEvent<'NominationPools', 'Created', { depositor: AccountId32; poolId: number }>;

    /**
     * A member has became bonded in a pool.
     **/
    Bonded: GenericPalletEvent<
      'NominationPools',
      'Bonded',
      { member: AccountId32; poolId: number; bonded: bigint; joined: boolean }
    >;

    /**
     * A payout has been made to a member.
     **/
    PaidOut: GenericPalletEvent<'NominationPools', 'PaidOut', { member: AccountId32; poolId: number; payout: bigint }>;

    /**
     * A member has unbonded from their pool.
     *
     * - `balance` is the corresponding balance of the number of points that has been
     * requested to be unbonded (the argument of the `unbond` transaction) from the bonded
     * pool.
     * - `points` is the number of points that are issued as a result of `balance` being
     * dissolved into the corresponding unbonding pool.
     * - `era` is the era in which the balance will be unbonded.
     * In the absence of slashing, these values will match. In the presence of slashing, the
     * number of points that are issued in the unbonding pool will be less than the amount
     * requested to be unbonded.
     **/
    Unbonded: GenericPalletEvent<
      'NominationPools',
      'Unbonded',
      { member: AccountId32; poolId: number; balance: bigint; points: bigint; era: number }
    >;

    /**
     * A member has withdrawn from their pool.
     *
     * The given number of `points` have been dissolved in return of `balance`.
     *
     * Similar to `Unbonded` event, in the absence of slashing, the ratio of point to balance
     * will be 1.
     **/
    Withdrawn: GenericPalletEvent<
      'NominationPools',
      'Withdrawn',
      { member: AccountId32; poolId: number; balance: bigint; points: bigint }
    >;

    /**
     * A pool has been destroyed.
     **/
    Destroyed: GenericPalletEvent<'NominationPools', 'Destroyed', { poolId: number }>;

    /**
     * The state of a pool has changed
     **/
    StateChanged: GenericPalletEvent<
      'NominationPools',
      'StateChanged',
      { poolId: number; newState: PalletNominationPoolsPoolState }
    >;

    /**
     * A member has been removed from a pool.
     *
     * The removal can be voluntary (withdrawn all unbonded funds) or involuntary (kicked).
     **/
    MemberRemoved: GenericPalletEvent<'NominationPools', 'MemberRemoved', { poolId: number; member: AccountId32 }>;

    /**
     * The roles of a pool have been updated to the given new roles. Note that the depositor
     * can never change.
     **/
    RolesUpdated: GenericPalletEvent<
      'NominationPools',
      'RolesUpdated',
      { root?: AccountId32 | undefined; bouncer?: AccountId32 | undefined; nominator?: AccountId32 | undefined }
    >;

    /**
     * The active balance of pool `pool_id` has been slashed to `balance`.
     **/
    PoolSlashed: GenericPalletEvent<'NominationPools', 'PoolSlashed', { poolId: number; balance: bigint }>;

    /**
     * The unbond pool at `era` of pool `pool_id` has been slashed to `balance`.
     **/
    UnbondingPoolSlashed: GenericPalletEvent<
      'NominationPools',
      'UnbondingPoolSlashed',
      { poolId: number; era: number; balance: bigint }
    >;

    /**
     * A pool's commission setting has been changed.
     **/
    PoolCommissionUpdated: GenericPalletEvent<
      'NominationPools',
      'PoolCommissionUpdated',
      { poolId: number; current?: [Perbill, AccountId32] | undefined }
    >;

    /**
     * A pool's maximum commission setting has been changed.
     **/
    PoolMaxCommissionUpdated: GenericPalletEvent<
      'NominationPools',
      'PoolMaxCommissionUpdated',
      { poolId: number; maxCommission: Perbill }
    >;

    /**
     * A pool's commission `change_rate` has been changed.
     **/
    PoolCommissionChangeRateUpdated: GenericPalletEvent<
      'NominationPools',
      'PoolCommissionChangeRateUpdated',
      { poolId: number; changeRate: PalletNominationPoolsCommissionChangeRate }
    >;

    /**
     * Pool commission has been claimed.
     **/
    PoolCommissionClaimed: GenericPalletEvent<
      'NominationPools',
      'PoolCommissionClaimed',
      { poolId: number; commission: bigint }
    >;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  identity: {
    /**
     * A name was set or reset (which will remove all judgements).
     **/
    IdentitySet: GenericPalletEvent<'Identity', 'IdentitySet', { who: AccountId32 }>;

    /**
     * A name was cleared, and the given balance returned.
     **/
    IdentityCleared: GenericPalletEvent<'Identity', 'IdentityCleared', { who: AccountId32; deposit: bigint }>;

    /**
     * A name was removed and the given balance slashed.
     **/
    IdentityKilled: GenericPalletEvent<'Identity', 'IdentityKilled', { who: AccountId32; deposit: bigint }>;

    /**
     * A judgement was asked from a registrar.
     **/
    JudgementRequested: GenericPalletEvent<
      'Identity',
      'JudgementRequested',
      { who: AccountId32; registrarIndex: number }
    >;

    /**
     * A judgement request was retracted.
     **/
    JudgementUnrequested: GenericPalletEvent<
      'Identity',
      'JudgementUnrequested',
      { who: AccountId32; registrarIndex: number }
    >;

    /**
     * A judgement was given by a registrar.
     **/
    JudgementGiven: GenericPalletEvent<'Identity', 'JudgementGiven', { target: AccountId32; registrarIndex: number }>;

    /**
     * A registrar was added.
     **/
    RegistrarAdded: GenericPalletEvent<'Identity', 'RegistrarAdded', { registrarIndex: number }>;

    /**
     * A sub-identity was added to an identity and the deposit paid.
     **/
    SubIdentityAdded: GenericPalletEvent<
      'Identity',
      'SubIdentityAdded',
      { sub: AccountId32; main: AccountId32; deposit: bigint }
    >;

    /**
     * A sub-identity was removed from an identity and the deposit freed.
     **/
    SubIdentityRemoved: GenericPalletEvent<
      'Identity',
      'SubIdentityRemoved',
      { sub: AccountId32; main: AccountId32; deposit: bigint }
    >;

    /**
     * A sub-identity was cleared, and the given deposit repatriated from the
     * main identity account to the sub-identity account.
     **/
    SubIdentityRevoked: GenericPalletEvent<
      'Identity',
      'SubIdentityRevoked',
      { sub: AccountId32; main: AccountId32; deposit: bigint }
    >;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
  committeeManagement: {
    /**
     * Ban thresholds for the next era has changed
     **/
    SetBanConfig: GenericPalletEvent<'CommitteeManagement', 'SetBanConfig', PrimitivesBanConfig>;

    /**
     * Validators have been banned from the committee
     **/
    BanValidators: GenericPalletEvent<'CommitteeManagement', 'BanValidators', Array<[AccountId32, PrimitivesBanInfo]>>;

    /**
     * Generic pallet event
     **/
    [prop: string]: GenericPalletEvent;
  };
}