import { DedotClient } from 'dedot';

declare global {
  var contractsClient: DedotClient;
  var reviveClient: DedotClient;
}

export {};
