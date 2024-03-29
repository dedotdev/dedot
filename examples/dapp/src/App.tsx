import './App.css';
import { useState } from 'react';
import { Dedot } from 'dedot';
import { useAsync } from 'react-use';
import type { PolkadotApi } from '@dedot/chaintypes';
import { ApiPromise, WsProvider } from '@polkadot/api';

const ENDPOINT = 'wss://rpc.polkadot.io';
// const ENDPOINT = 'wss://node-7144126277301010432.sk.onfinality.io/ws?apikey=c26b705b-b812-4f43-82ea-443d71485156';

function App() {
  const [api, setApi] = useState<Dedot<PolkadotApi>>();
  const [pkdApi, setPkdApi] = useState<ApiPromise>();

  useAsync(async () => {
    console.time('init api took');
    setApi(await Dedot.new({ endpoint: ENDPOINT, cacheMetadata: true }));
    console.timeEnd('init api took');
  });

  useAsync(async () => {
    console.time('init polkadotjs/api took');
    setPkdApi(await ApiPromise.create({ provider: new WsProvider(ENDPOINT) }));
    console.timeEnd('init polkadotjs/api took');
  });

  return (
    <>
      <h1>Dedot</h1>
      <p className='read-the-docs'>{api ? 'Dedot Connected' : 'Dedot Connecting...'}</p>
      <p className='read-the-docs'>{pkdApi ? 'Polkadot.js Api Connected' : 'Polkadot.js Api Connecting...'}</p>
    </>
  );
}

export default App;
