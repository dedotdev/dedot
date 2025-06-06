import { LegacyClient } from 'dedot';

declare global {
  var contractsClient: LegacyClient;
  var reviveClient: LegacyClient;
}

export {};
