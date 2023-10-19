import { GenericChainConsts } from '@delightfuldot/types';
import {
  Bytes,
  FrameSupportPalletId,
  FrameSystemLimitsBlockLength,
  FrameSystemLimitsBlockWeights,
  PalletReferendaTrackInfo,
  Perbill,
  Percent,
  Permill,
  SpVersionRuntimeVersion,
  SpWeightsRuntimeDbWeight,
  SpWeightsWeightV2Weight,
} from './types';

export interface ChainConsts extends GenericChainConsts {
  system: {
    blockWeights: FrameSystemLimitsBlockWeights;
    blockLength: FrameSystemLimitsBlockLength;
    blockHashCount: number;
    dbWeight: SpWeightsRuntimeDbWeight;
    version: SpVersionRuntimeVersion;
    ss58Prefix: number;
  };
  scheduler: {
    maximumWeight: SpWeightsWeightV2Weight;
    maxScheduledPerBlock: number;
  };
  preimage: {};
  babe: {
    epochDuration: bigint;
    expectedBlockTime: bigint;
    maxAuthorities: number;
  };
  timestamp: { minimumPeriod: bigint };
  indices: { deposit: bigint };
  balances: {
    existentialDeposit: bigint;
    maxLocks: number;
    maxReserves: number;
    maxHolds: number;
    maxFreezes: number;
  };
  transactionPayment: { operationalFeeMultiplier: number };
  authorship: {};
  staking: {
    maxNominations: number;
    historyDepth: number;
    sessionsPerEra: number;
    bondingDuration: number;
    slashDeferDuration: number;
    maxNominatorRewardedPerValidator: number;
    maxUnlockingChunks: number;
  };
  offences: {};
  historical: {};
  session: {};
  grandpa: {
    maxAuthorities: number;
    maxSetIdSessionEntries: bigint;
  };
  imOnline: { unsignedPriority: bigint };
  authorityDiscovery: {};
  democracy: {
    enactmentPeriod: number;
    launchPeriod: number;
    votingPeriod: number;
    voteLockingPeriod: number;
    minimumDeposit: bigint;
    instantAllowed: boolean;
    fastTrackVotingPeriod: number;
    cooloffPeriod: number;
    maxVotes: number;
    maxProposals: number;
    maxDeposits: number;
    maxBlacklisted: number;
  };
  council: { maxProposalWeight: SpWeightsWeightV2Weight };
  technicalCommittee: { maxProposalWeight: SpWeightsWeightV2Weight };
  phragmenElection: {
    palletId: Bytes;
    candidacyBond: bigint;
    votingBondBase: bigint;
    votingBondFactor: bigint;
    desiredMembers: number;
    desiredRunnersUp: number;
    termDuration: number;
    maxCandidates: number;
    maxVoters: number;
    maxVotesPerVoter: number;
  };
  technicalMembership: {};
  treasury: {
    proposalBond: Permill;
    proposalBondMinimum: bigint;
    proposalBondMaximum: bigint | undefined;
    spendPeriod: number;
    burn: Permill;
    palletId: FrameSupportPalletId;
    maxApprovals: number;
  };
  convictionVoting: {
    maxVotes: number;
    voteLockingPeriod: number;
  };
  referenda: {
    submissionDeposit: bigint;
    maxQueued: number;
    undecidingTimeout: number;
    alarmInterval: number;
    tracks: Array<[number, PalletReferendaTrackInfo]>;
  };
  whitelist: {};
  claims: { prefix: Bytes };
  vesting: {
    minVestedTransfer: bigint;
    maxVestingSchedules: number;
  };
  utility: { batchedCallsLimit: number };
  identity: {
    basicDeposit: bigint;
    fieldDeposit: bigint;
    subAccountDeposit: bigint;
    maxSubAccounts: number;
    maxAdditionalFields: number;
    maxRegistrars: number;
  };
  proxy: {
    proxyDepositBase: bigint;
    proxyDepositFactor: bigint;
    maxProxies: number;
    maxPending: number;
    announcementDepositBase: bigint;
    announcementDepositFactor: bigint;
  };
  multisig: {
    depositBase: bigint;
    depositFactor: bigint;
    maxSignatories: number;
  };
  bounties: {
    bountyDepositBase: bigint;
    bountyDepositPayoutDelay: number;
    bountyUpdatePeriod: number;
    curatorDepositMultiplier: Permill;
    curatorDepositMax: bigint | undefined;
    curatorDepositMin: bigint | undefined;
    bountyValueMinimum: bigint;
    dataDepositPerByte: bigint;
    maximumReasonLength: number;
  };
  childBounties: {
    maxActiveChildBountyCount: number;
    childBountyValueMinimum: bigint;
  };
  tips: {
    maximumReasonLength: number;
    dataDepositPerByte: bigint;
    tipCountdown: number;
    tipFindersFee: Percent;
    tipReportDepositBase: bigint;
  };
  electionProviderMultiPhase: {
    unsignedPhase: number;
    signedPhase: number;
    betterSignedThreshold: Perbill;
    betterUnsignedThreshold: Perbill;
    offchainRepeat: number;
    minerTxPriority: bigint;
    signedMaxSubmissions: number;
    signedMaxWeight: SpWeightsWeightV2Weight;
    signedMaxRefunds: number;
    signedRewardBase: bigint;
    signedDepositBase: bigint;
    signedDepositByte: bigint;
    signedDepositWeight: bigint;
    maxElectingVoters: number;
    maxElectableTargets: number;
    maxWinners: number;
    minerMaxLength: number;
    minerMaxWeight: SpWeightsWeightV2Weight;
    minerMaxVotesPerVoter: number;
    minerMaxWinners: number;
  };
  voterList: { bagThresholds: Array<bigint> };
  nominationPools: {
    palletId: FrameSupportPalletId;
    maxPointsToBalance: number;
  };
  fastUnstake: { deposit: bigint };
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
    paraDeposit: bigint;
    dataDepositPerByte: bigint;
  };
  slots: {
    leasePeriod: number;
    leaseOffset: number;
  };
  auctions: {
    endingPeriod: number;
    sampleLength: number;
    slotRangeCount: number;
    leasePeriodsPerSlot: number;
  };
  crowdloan: {
    palletId: FrameSupportPalletId;
    minContribution: bigint;
    removeKeysLimit: number;
  };
  xcmPallet: {};
  messageQueue: {
    heapSize: number;
    maxStale: number;
    serviceWeight: SpWeightsWeightV2Weight | undefined;
  };
}
