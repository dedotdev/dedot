import { useState } from 'react';
import { useAsync } from 'react-use';
import { Dedot, WsProvider } from 'dedot';
import './App.css';

const ENDPOINT = 'wss://rpc.polkadot.io';

function App() {
  const [api, setApi] = useState<Dedot>();
  useAsync(async () => {
    console.time('init api took');
    setApi(await Dedot.new({ provider: new WsProvider(ENDPOINT), cacheMetadata: true }));
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
