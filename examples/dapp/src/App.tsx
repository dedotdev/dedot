import { useState } from 'react';
import { useAsync } from 'react-use';
import { polkadot } from '@substrate/connect-known-chains';
import { DedotClient, SmoldotProvider } from 'dedot';
import { startWithWorker } from 'dedot/smoldot/with-worker';
import Worker from 'dedot/smoldot/worker?worker';
import './App.css';

const smoldotClient = startWithWorker(new Worker());
const chain = smoldotClient.addChain({ chainSpec: polkadot });

// const ENDPOINT = 'wss://rpc.polkadot.io';

export default function App() {
  const [api, setApi] = useState<DedotClient>();
  useAsync(async () => {
    console.time('init api took');
    const provider = new SmoldotProvider(chain);
    setApi(await DedotClient.new(provider));
    console.timeEnd('init api took');
  });

  return (
    <>
      <h1>Dedot</h1>
      <p className='read-the-docs'>{api ? 'Dedot Connected' : 'Dedot Connecting...'}</p>
    </>
  );
}
