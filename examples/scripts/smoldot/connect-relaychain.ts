import type { PolkadotApi } from '@dedot/chaintypes';
import { polkadot } from '@substrate/connect-known-chains';
import { DedotClient, SmoldotProvider } from 'dedot';
import { start } from 'dedot/smoldot';
import { formatBalance } from 'dedot/utils';

// Start smoldot instance & initialize a chain
const smoldot = start();
const chain = await smoldot.addChain({ chainSpec: polkadot });

// Initialize providers & clients
const provider = new SmoldotProvider(chain);
const client = await DedotClient.new<PolkadotApi>(provider);

// Fetching genesis hash
const genesisHash = await client.chainSpec.genesisHash();
console.log('GenesisHash:', genesisHash);

// Query on-chain storage
const BINANCE_WALLET = '16ZL8yLyXv3V3L3z9ofR1ovFLziyXaN1DPq4yffMAZ9czzBD';
const balance = await client.query.system.account(BINANCE_WALLET);
console.log('Balance:', formatBalance(balance.data.free, { symbol: 'DOT', decimals: 10 }));

// Disconnect
await client.disconnect();
await smoldot.terminate();
