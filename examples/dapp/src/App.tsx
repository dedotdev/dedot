import { useState } from 'react';
import { useAsync } from 'react-use';
import { PolkadotApi } from '@dedot/chaintypes';
import { DedotClient, WsProvider } from 'dedot';

const ENDPOINT = 'wss://rpc.polkadot.io';

function App() {
  const [client, setClient] = useState<DedotClient<PolkadotApi>>();
  useAsync(async () => {
    console.time('init client took');
    setClient(await DedotClient.new<PolkadotApi>({ provider: new WsProvider(ENDPOINT), cacheMetadata: true }));
    console.timeEnd('init client took');
  });

  return (
    <>
      <h1>DedotClient</h1>
      <p>{client ? 'Connected' : `Connecting to Polkadot via RPC: ${ENDPOINT}...`}</p>
    </>
  );
}

export default App;
