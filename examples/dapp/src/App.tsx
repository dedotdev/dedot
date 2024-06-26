import { useState } from 'react';
import { useAsync } from 'react-use';
import { LegacyClient, WsProvider } from 'dedot';
import './App.css';

const ENDPOINT = 'wss://rpc.polkadot.io';

function App() {
  const [api, setApi] = useState<LegacyClient>();
  useAsync(async () => {
    console.time('init api took');
    setApi(await LegacyClient.new({ provider: new WsProvider(ENDPOINT), cacheMetadata: true }));
    console.timeEnd('init api took');
  });

  return (
    <>
      <h1>Dedot</h1>
      <p className='read-the-docs'>{api ? 'Dedot Connected' : 'Dedot Connecting...'}</p>
    </>
  );
}

export default App;
