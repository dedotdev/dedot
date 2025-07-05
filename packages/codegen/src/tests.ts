import { LegacyClient } from '@dedot/api';
import { WsProvider } from '@dedot/providers';
import { WestendApi } from '../../../westend/index.js';

const run = async () => {
  const api = await LegacyClient.create<WestendApi>(new WsProvider('wss://rpc.ibp.network/westend'));

  const result = await api.view.voterList.scores('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');

  console.dir(result.data, { depth: null });
  console.dir(result.raw, { depth: null });

  await api.disconnect();
};

run()
  .catch(console.error)
  .finally(() => process.exit(0));
