import { RpcVersion } from '@dedot/codecs/types';
import { DedotClient, WsProvider } from 'dedot';
import { $Header } from 'dedot/codecs';

// Network configurations
const NETWORKS = [
  { name: 'Polkadot', endpoint: 'wss://polkadot.api.onfinality.io/public-ws' },
  { name: 'Hyperbridge', endpoint: 'wss://nexus.ibp.network' },
  { name: 'Polkadot Asset Hub', endpoint: 'wss://statemint.api.onfinality.io/public-ws' },
];

// Logging utilities
const log = (message: string) => console.log(message);
const logSuccess = (message: string) => console.log(`✅ ${message}`);
const logError = (message: string) => console.log(`❌ ${message}`);
const separator = () => console.log('\n' + '='.repeat(80) + '\n');

/**
 * Test hasher detection for a specific network and client type
 */
async function testHasherDetection(networkName: string, endpoint: string, rpcVersion: RpcVersion) {
  const label = `${networkName} (${rpcVersion.toUpperCase()})`;
  log(`\n🔍 Testing: ${label}`);
  log(`📡 Endpoint: ${endpoint}`);

  // Create provider with increased timeout for Legacy client
  const provider = new WsProvider(endpoint);

  const client = await DedotClient.new({ provider, rpcVersion });

  // Get finalized block info
  const finalizedBlock = await client.block.finalized();
  log(`\n📦 Finalized Block:`);
  log(`   Hash:   ${finalizedBlock.hash}`);
  log(`   Number: ${finalizedBlock.number}`);

  // Fetch header for the finalized block
  const header = await client.block.header(finalizedBlock.hash);

  if (!header) {
    logError('Failed to fetch header');
    return;
  }

  logSuccess('Header fetched successfully');

  // Compute hash using registry (this uses the detected hasher)
  const encodedHeader = $Header.tryEncode(header);
  const computedHash = client.registry.hashAsHex(encodedHeader);

  log(`\n🔐 Hash Verification:`);
  log(`   Expected:  ${finalizedBlock.hash}`);
  log(`   Computed:  ${computedHash}`);

  if (computedHash === finalizedBlock.hash) {
    logSuccess('Hash verification PASSED - Hasher correctly detected!');
  } else {
    logError('Hash verification FAILED - Hasher detection issue!');
  }

  await client.disconnect();
}

for (const network of NETWORKS) {
  try {
    // Test with V2 client
    await testHasherDetection(network.name, network.endpoint, 'v2');
    separator();

    // Test with Legacy client
    await testHasherDetection(network.name, network.endpoint, 'legacy');
    separator();
  } catch (error) {
    logError(`Network ${network.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    separator();
  }
}
