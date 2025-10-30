import { V2Client, LegacyClient } from 'dedot';

declare global {
  var contractsClient: LegacyClient;
  var reviveClient: V2Client;
}

export {};
