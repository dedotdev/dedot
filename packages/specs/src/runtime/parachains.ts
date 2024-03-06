import * as $ from '@dedot/shape';
import { RuntimeApiMethodsSpec, RuntimeApiSpec } from '@dedot/types';
import {
  $ApprovalVotingParams,
  $AsyncBackingParams,
  $BackingState,
  $CandidateCommitments,
  $CandidateEvent,
  $CandidateHash,
  $CommittedCandidateReceipt,
  $CoreState,
  $DisputeProof,
  $DisputeState,
  $ExecutorParams,
  $GroupRotationInfo,
  $Hash,
  $InboundDownwardMessage,
  $InboundHrmpMessage,
  $NodeFeatures,
  $OccupiedCoreAssumption,
  $OpaqueKeyOwnershipProof,
  $ParaId,
  $ParaValidatorIndex,
  $PendingSlashes,
  $PersistedValidationData,
  $PvfCheckStatement,
  $ScrapedOnChainVotes,
  $SessionIndex,
  $SessionInfo,
  $ValidationCode,
  $ValidationCodeHash,
  $ValidatorId,
  $ValidatorSignature,
} from '@dedot/codecs';

const V5_V10_SHARED: RuntimeApiMethodsSpec = {
  validators: {
    docs: 'Get the current validators.',
    params: [],
    type: 'Array<ValidatorId>',
    codec: $.Array($ValidatorId),
  },
  validatorGroups: {
    docs: [
      'Returns the validator groups and rotation info localized based on the hypothetical child',
      ' of a block whose state  this is invoked on. Note that `now` in the `GroupRotationInfo`',
      'should be the successor of the number of the block.',
    ],
    params: [],
    type: '[Array<Array<ParaValidatorIndex>>, GroupRotationInfo]',
    codec: $.Tuple($.Array($.Array($ParaValidatorIndex)), $GroupRotationInfo),
  },
  availabilityCores: {
    docs: [
      'Yields information on all availability cores as relevant to the child block.',
      'Cores are either free or occupied. Free cores can have paras assigned to them.',
    ],
    params: [],
    type: 'Array<CoreState>',
    codec: $.Array($CoreState),
  },
  persistedValidationData: {
    docs: [
      'Yields the persisted validation data for the given `ParaId` along with an assumption that',
      'should be used if the para currently occupies a core.',
      '\n',
      'Returns `None` if either the para is not registered or the assumption is `Freed`',
      'and the para already occupies a core.',
    ],
    params: [
      {
        name: 'paraId',
        type: 'ParaId',
        codec: $ParaId,
      },
      {
        name: 'assumption',
        type: 'OccupiedCoreAssumption',
        codec: $OccupiedCoreAssumption,
      },
    ],
    type: 'Option<PersistedValidationData>',
    codec: $.Option($PersistedValidationData),
  },
  assumedValidationData: {
    docs: [
      'Returns the persisted validation data for the given `ParaId` along with the corresponding',
      'validation code hash. Instead of accepting assumption about the para, matches the validation',
      "data hash against an expected one and yields `None` if they're not equal.",
    ],
    params: [
      {
        name: 'paraId',
        type: 'ParaId',
        codec: $ParaId,
      },
      {
        name: 'expectedPersistedValidationDataHash',
        type: 'Hash',
        codec: $Hash,
      },
    ],
    type: 'Option<[PersistedValidationData, ValidationCodeHash]>',
    codec: $.Option($.Tuple($PersistedValidationData, $ValidationCodeHash)),
  },
  checkValidationOutputs: {
    docs: 'Checks if the given validation outputs pass the acceptance criteria.',
    params: [
      {
        name: 'paraId',
        type: 'ParaId',
        codec: $ParaId,
      },
      {
        name: 'outputs',
        type: 'CandidateCommitments',
        codec: $CandidateCommitments,
      },
    ],
    type: 'bool',
    codec: $.bool,
  },
  sessionIndexForChild: {
    docs: [
      'Returns the session index expected at a child of the block.',
      '\n',
      'This can be used to instantiate a `SigningContext`.',
    ],
    params: [],
    type: 'SessionIndex',
    codec: $SessionIndex,
  },
  validationCode: {
    docs: [
      'Fetch the validation code used by a para, making the given `OccupiedCoreAssumption`.',
      '\n',
      'Returns `None` if either the para is not registered or the assumption is `Freed`',
      'and the para already occupies a core.',
    ],
    params: [
      {
        name: 'paraId',
        type: 'ParaId',
        codec: $ParaId,
      },
      {
        name: 'assumption',
        type: 'OccupiedCoreAssumption',
        codec: $OccupiedCoreAssumption,
      },
    ],
    type: 'ValidationCode',
    codec: $ValidationCode,
  },
  candidatePendingAvailability: {
    docs: [
      'Get the receipt of a candidate pending availability. This returns `Some` for any paras',
      'assigned to occupied cores in `availability_cores` and `None` otherwise.',
    ],
    params: [
      {
        name: 'paraId',
        type: 'ParaId',
        codec: $ParaId,
      },
    ],
    type: 'Option<CommittedCandidateReceipt>',
    codec: $.Option($CommittedCandidateReceipt),
  },
  candidateEvents: {
    docs: 'Get a vector of events concerning candidates that occurred within a block.',
    params: [],
    type: 'Array<CandidateEvent>',
    codec: $.Array($CandidateEvent),
  },
  dmqContents: {
    docs: 'Get all the pending inbound messages in the downward message queue for a para.',
    params: [
      {
        name: 'recipient',
        type: 'ParaId',
        codec: $ParaId,
      },
    ],
    type: 'Array<InboundDownwardMessage>',
    codec: $.Array($InboundDownwardMessage),
  },
  inboundHrmpChannelsContents: {
    docs: [
      'Get the contents of all channels addressed to the given recipient. Channels that have no',
      'messages in them are also included.',
    ],
    params: [
      {
        name: 'recipient',
        type: 'ParaId',
        codec: $ParaId,
      },
    ],
    //! Notice here
    type: 'Array<InboundHrmpMessage>',
    codec: $.Array($InboundHrmpMessage),
  },
  validationCodeByHash: {
    docs: 'Get the validation code from its hash.',
    params: [
      {
        name: 'hash',
        type: 'ValidationCodeHash',
        codec: $ValidationCodeHash,
      },
    ],
    type: 'Option<ValidationCode>',
    codec: $.Option($ValidationCode),
  },
  onChainVotes: {
    docs: 'Scrape dispute relevant from on-chain, backing votes and resolved disputes.',
    params: [],
    type: 'Option<ScrapedOnChainVotes>',
    codec: $.Option($ScrapedOnChainVotes),
  },
  sessionInfo: {
    docs: 'Get the session info for the given session, if stored.',
    params: [
      {
        name: 'index',
        type: 'SessionIndex',
        codec: $SessionIndex,
      },
    ],
    type: 'Option<SessionInfo>',
    codec: $.Option($SessionInfo),
  },
  submitPvfCheckStatement: {
    docs: 'Submits a PVF pre-checking statement into the transaction pool.',
    params: [
      {
        name: 'stmt',
        type: 'PvfCheckStatement',
        codec: $PvfCheckStatement,
      },
      {
        name: 'signature',
        type: 'ValidatorSignature',
        codec: $ValidatorSignature,
      },
    ],
    type: '[]',
    codec: $.Tuple(),
  },
  pvfsRequirePrecheck: {
    docs: 'Returns code hashes of PVFs that require pre-checking by validators in the active set.',
    params: [],
    type: 'Array<ValidationCodeHash>',
    codec: $.Array($ValidationCodeHash),
  },
  validationCodeHash: {
    docs: 'Fetch the hash of the validation code used by a para, making the given `OccupiedCoreAssumption`.',
    params: [
      {
        name: 'paraId',
        type: 'ParaId',
        codec: $ParaId,
      },
      {
        name: 'assumption',
        type: 'OccupiedCoreAssumption',
        codec: $OccupiedCoreAssumption,
      },
    ],
    type: 'Option<ValidationCodeHash>',
    codec: $.Option($ValidationCodeHash),
  },
  disputes: {
    docs: 'Returns all onchain disputes.',
    params: [],
    type: 'Array<[SessionIndex, CandidateHash, DisputeState]>',
    codec: $.Array($.Tuple($SessionIndex, $CandidateHash, $DisputeState)),
  },
  sessionExecutorParams: {
    docs: 'Returns execution parameters for the session.',
    params: [
      {
        name: 'sessionIndex',
        type: 'SessionIndex',
        codec: $SessionIndex,
      },
    ],
    type: 'Option<ExecutorParams>',
    codec: $.Option($ExecutorParams),
  },
  unappliedSlashes: {
    docs: 'Returns a list of validators that lost a past session dispute and need to be slashed',
    params: [],
    type: 'Array<[SessionIndex, CandidateHash, PendingSlashes]>',
    codec: $.Array($.Tuple($SessionIndex, $CandidateHash, $PendingSlashes)),
  },
  keyOwnershipProof: {
    docs: 'Returns a merkle proof of a validator session key',
    params: [
      {
        name: 'validatorId',
        type: 'ValidatorId',
        codec: $ValidatorId,
      },
    ],
    type: 'Option<OpaqueKeyOwnershipProof>',
    codec: $.Option($OpaqueKeyOwnershipProof),
  },
  submitReportDisputeLost: {
    docs: 'Submit an unsigned extrinsic to slash validators who lost a dispute about a candidate of a past session',
    params: [
      {
        name: 'disputeProof',
        type: 'DisputeProof',
        codec: $DisputeProof,
      },
      {
        name: 'keyOwnershipProof',
        type: 'OpaqueKeyOwnershipProof',
        codec: $OpaqueKeyOwnershipProof,
      },
    ],
    type: 'Option<[]>',
    codec: $.Option($.Tuple()),
  },
};

const V6_V10_SHARED: RuntimeApiMethodsSpec = {
  minimumBackingVotes: {
    docs: [
      'Get the minimum number of backing votes for a parachain candidate.',
      'This is a staging method! Do not use on production runtimes!',
    ],
    params: [],
    type: 'u32',
    codec: $.u32,
  },
};

const V7_V10_SHARED: RuntimeApiMethodsSpec = {
  paraBackingState: {
    docs: 'Returns the state of parachain backing for a given para.',
    params: [
      {
        name: 'paraId',
        type: 'ParaId',
        codec: $ParaId,
      },
    ],
    type: 'Option<BackingState>',
    codec: $.Option($BackingState),
  },
  asyncBackingParams: {
    docs: "Returns candidate's acceptance limitations for asynchronous backing for a relay parent.",
    params: [],
    type: 'AsyncBackingParams',
    codec: $AsyncBackingParams,
  },
};

const V8_V10_SHARED: RuntimeApiMethodsSpec = {
  disabledValidators: {
    docs: 'Returns a list of all disabled validators at the given block.',
    params: [],
    type: 'ParaValidatorIndex',
    codec: $ParaValidatorIndex,
  },
};

const V9_V10_SHARED: RuntimeApiMethodsSpec = {
  nodeFeatures: {
    docs: ['Get node features.', 'This is a staging method! Do not use on production runtimes!'],
    params: [],
    type: 'NodeFeatures',
    codec: $NodeFeatures,
  },
};

/**
 * Ref https://github.com/paritytech/polkadot-sdk/blob/a84dd0dba58d51503b8942360aa4fb30a5a96af5/polkadot/primitives/src/runtime_api.rs#L129-L134
 */
export const ParachainHost: RuntimeApiSpec[] = [
  { methods: { ...V5_V10_SHARED }, version: 5 },
  { methods: { ...V6_V10_SHARED, ...V5_V10_SHARED }, version: 6 },
  { methods: { ...V7_V10_SHARED, ...V6_V10_SHARED, ...V5_V10_SHARED }, version: 7 },
  { methods: { ...V8_V10_SHARED, ...V7_V10_SHARED, ...V6_V10_SHARED, ...V5_V10_SHARED }, version: 8 },
  {
    methods: { ...V9_V10_SHARED, ...V8_V10_SHARED, ...V7_V10_SHARED, ...V6_V10_SHARED, ...V5_V10_SHARED },
    version: 9,
  },
  {
    methods: {
      approvalVotingParams: {
        docs: 'Approval voting configuration parameters',
        params: [],
        type: 'ApprovalVotingParams',
        codec: $ApprovalVotingParams,
      },
      ...V5_V10_SHARED,
      ...V6_V10_SHARED,
      ...V7_V10_SHARED,
      ...V8_V10_SHARED,
      ...V9_V10_SHARED,
    },
    version: 10,
  },
];
