import { useState } from 'react';
import { useAsync } from 'react-use';
import { PolkadotApi } from '@dedot/chaintypes';
import { DedotClient, SmoldotProvider } from 'dedot';
import { startWithWorker } from 'dedot/smoldot/with-worker';
import Worker from 'dedot/smoldot/worker?worker';

const smoldot = startWithWorker(new Worker());

export default function App() {
  const [client, setClient] = useState<DedotClient<PolkadotApi>>();
  useAsync(async () => {
    console.time('init client took');

    const { chainSpec } = await import('@substrate/connect-known-chains/polkadot');

    const chain = smoldot.addChain({ chainSpec });

    const provider = new SmoldotProvider(chain);
    setClient(await DedotClient.new<PolkadotApi>(provider));

    console.timeEnd('init client took');
  });

  return (
    <>
      <h1>DedotClient</h1>
      <p>{client ? 'DedotClient Connected' : 'Connecting to Polkadot via Smoldot...'}</p>
    </>
  );
}
