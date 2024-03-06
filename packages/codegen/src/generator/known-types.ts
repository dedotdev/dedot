/**
 * Known type names registered in @dedot/types
 * Since TS interfaces are trim-off when compiling,
 * So we need to register them explicitly here for RPC codegen process
 */
export const knownTypes: string[] = [
  'ExtrinsicOrHash',
  'EpochAuthorship',
  'BlockStats',
  'Prevotes',
  'Precommits',
  'RoundState',
  'ReportedRoundStates',
  'JustificationNotification',
  'EncodedFinalityProofs',
  'LeavesProof',
  'StorageKind',
  'RpcMethods',
  'ReadProof',
  'StorageChangeSet',
  'TraceBlockResponse',
  'MigrationStatusResult',
  'ChainType',
  'ChainProperties',
  'Health',
  'SyncState',
  'PeerInfo',
  'NodeRole',
  'NetworkState',
];
