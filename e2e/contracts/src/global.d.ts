import { DedotClient, LegacyClient } from 'dedot';

declare global {
  var contractsClient: LegacyClient;
  var reviveClient: DedotClient;
}

export {};
