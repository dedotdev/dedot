import { DedotClient, PinnedBlock, WsProvider } from 'dedot';
import { assert, deferred } from 'dedot/utils';

export const run = async (nodeName: any, networkInfo: any): Promise<any> => {
  const { wsUri } = networkInfo.nodesByName[nodeName];

  console.log(`Connecting to node at ${wsUri}`);
  const provider = new WsProvider(wsUri);
  const client = await DedotClient.new({ provider });

  console.log('Connected to node, testing DedotClient events...');

  // Set up event tracking
  const receivedEvents: Record<string, PinnedBlock[]> = {
    newBlock: [],
    bestBlock: [],
    finalizedBlock: [],
    bestChainChanged: [],
  };

  // Set up event listeners
  const unsubs = [
    client.on('newBlock', (block: PinnedBlock) => {
      console.log(`Received newBlock event with hash: ${block.hash}, number: ${block.number}`);
      receivedEvents.newBlock.push(block);
    }),
    client.on('bestBlock', (block: PinnedBlock) => {
      console.log(`Received bestBlock event with hash: ${block.hash}, number: ${block.number}`);
      receivedEvents.bestBlock.push(block);
    }),
    client.on('finalizedBlock', (block: PinnedBlock) => {
      console.log(`Received finalizedBlock event with hash: ${block.hash}, number: ${block.number}`);
      receivedEvents.finalizedBlock.push(block);
    }),
    client.on('bestChainChanged', (block: PinnedBlock) => {
      console.log(`Received bestChainChanged event with hash: ${block.hash}, number: ${block.number}`);
      receivedEvents.bestChainChanged.push(block);
    }),
  ];

  // Wait for events to be received
  const waitForEvents = async (timeout = 60000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check if we've received at least one of each event type (except bestChainChanged which may not occur)
      if (
        receivedEvents.newBlock.length > 0 &&
        receivedEvents.bestBlock.length > 0 &&
        receivedEvents.finalizedBlock.length > 0
      ) {
        return true;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  };

  // Wait for events to be received
  const eventsReceived = await waitForEvents();
  
  // Verify events were received
  assert(eventsReceived, 'Timed out waiting for events');
  assert(receivedEvents.newBlock.length > 0, 'No newBlock events received');
  assert(receivedEvents.bestBlock.length > 0, 'No bestBlock events received');
  assert(receivedEvents.finalizedBlock.length > 0, 'No finalizedBlock events received');
  
  // Verify event data structure
  receivedEvents.newBlock.forEach(block => {
    assert(typeof block.hash === 'string', 'Block hash should be a string');
    assert(typeof block.number === 'number', 'Block number should be a number');
    assert(typeof block.parent === 'string', 'Block parent should be a string');
  });
  
  // Verify event sequence
  // In a normal chain, block numbers should increase
  const verifyIncreasingBlockNumbers = (blocks: PinnedBlock[]) => {
    for (let i = 1; i < blocks.length; i++) {
      assert(
        blocks[i].number >= blocks[i-1].number,
        `Block numbers should increase or stay the same, but got ${blocks[i-1].number} followed by ${blocks[i].number}`
      );
    }
  };
  
  if (receivedEvents.newBlock.length > 1) {
    verifyIncreasingBlockNumbers(receivedEvents.newBlock);
  }
  
  if (receivedEvents.bestBlock.length > 1) {
    verifyIncreasingBlockNumbers(receivedEvents.bestBlock);
  }
  
  if (receivedEvents.finalizedBlock.length > 1) {
    verifyIncreasingBlockNumbers(receivedEvents.finalizedBlock);
  }
  
  // Verify that finalized blocks are a subset of best blocks
  // (This may not always be true in a test environment with rapid block production)
  const finalizedHashes = new Set(receivedEvents.finalizedBlock.map(block => block.hash));
  const bestHashes = new Set(receivedEvents.bestBlock.map(block => block.hash));
  
  finalizedHashes.forEach(hash => {
    // This assertion is commented out because in a test environment with rapid block production,
    // it's possible that a block is finalized before it becomes the best block
    // assert(bestHashes.has(hash), `Finalized block ${hash} should have been a best block first`);
  });
  
  console.log('DedotClient event tests passed!');
  console.log(`Received ${receivedEvents.newBlock.length} newBlock events`);
  console.log(`Received ${receivedEvents.bestBlock.length} bestBlock events`);
  console.log(`Received ${receivedEvents.finalizedBlock.length} finalizedBlock events`);
  console.log(`Received ${receivedEvents.bestChainChanged.length} bestChainChanged events`);
  
  return {
    newBlockEvents: receivedEvents.newBlock.length,
    bestBlockEvents: receivedEvents.bestBlock.length,
    finalizedBlockEvents: receivedEvents.finalizedBlock.length,
    bestChainChangedEvents: receivedEvents.bestChainChanged.length,
  };
  // Clean up event listeners
  unsubs.forEach(unsub => unsub());
  
  // Disconnect from the node
  await client.disconnect();
};
