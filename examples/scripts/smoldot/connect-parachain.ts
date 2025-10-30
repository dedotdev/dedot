import { PolkadotPeopleApi } from '@dedot/chaintypes/polkadot-people';
import { polkadot, polkadot_people } from '@substrate/connect-known-chains';
import { DedotClient, SmoldotProvider } from 'dedot';
import { start } from 'dedot/smoldot';

// Start smoldot instance & initialize chains
const smoldot = start();
const relayChain = await smoldot.addChain({ chainSpec: polkadot });
const peopleChain = await smoldot.addChain({ chainSpec: polkadot_people, potentialRelayChains: [relayChain] });

// Initialize providers & clients
const provider = new SmoldotProvider(peopleChain);
const client = await DedotClient.new<PolkadotPeopleApi>(provider);

// Query on-chain storage
const GAV = '16SDAKg9N6kKAbhgDyxBXdHEwpwHUHs2CNEiLNGeZV55qHna';
const identity = await client.query.identity.identityOf(GAV);
console.log('Identity:', identity?.info);

// Disconnect
await client.disconnect();
await smoldot.terminate();
