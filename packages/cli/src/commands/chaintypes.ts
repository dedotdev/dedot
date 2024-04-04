import * as path from 'path';
import { CommandModule } from 'yargs';
import { generateTypes, generateTypesFromEndpoint } from '@dedot/codegen';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import { ConstantExecutor } from 'dedot';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { rpc } from '@polkadot/types-support/metadata/static-substrate';

type Args = {
  wsUrl?: string;
  output?: string;
  chain?: string;
  dts?: boolean;
};

export const chaintypes: CommandModule<Args, Args> = {
  command: 'chaintypes',
  describe: 'Generate chain types & APIs for a Substrate-based blockchain',
  handler: async (yargs) => {
    const { wsUrl, output = '', chain = '', dts = true } = yargs;

    const outDir = path.resolve(output);
    const extension = dts ? 'd.ts' : 'ts';

    if (wsUrl === 'substrate') {
      console.log(`- Generating generic chaintypes`);
      const metadataHex = staticSubstrate;
      const rpcMethods = rpc.methods;
      const metadata = $Metadata.tryDecode(metadataHex);
      const runtimeVersion = getRuntimeVersion(metadata);

      await generateTypes('substrate', metadata.latest, rpcMethods, runtimeVersion.apis, outDir, extension);
    } else {
      console.log(`- Generating chaintypes via endpoint ${wsUrl!}`);
      await generateTypesFromEndpoint(chain, wsUrl!, outDir, extension);
    }

    console.log(`- DONE! Output: ${outDir}`);
  },
  builder: (yargs) => {
    return (
      yargs
        .option('wsUrl', {
          type: 'string',
          describe: 'Websocket Url to fetch metadata',
          alias: 'w',
          default: 'ws://127.0.0.1:9944',
        })
        // TODO add file input
        .option('output', {
          type: 'string',
          describe: 'Output folder to put generated files',
          alias: 'o',
        })
        .option('chain', {
          type: 'string',
          describe: 'Chain name',
          alias: 'c',
        })
        .option('dts', {
          type: 'boolean',
          describe: 'Generate d.ts files',
          alias: 'd',
          default: true,
        })
    ); // TODO check to verify inputs
  },
};

const getRuntimeVersion = (metadata: Metadata): RuntimeVersion => {
  const registry = new PortableRegistry(metadata.latest);
  const executor = new ConstantExecutor({
    registry,
    metadataLatest: metadata.latest,
  } as any);

  return executor.execute('system', 'version') as RuntimeVersion;
};
