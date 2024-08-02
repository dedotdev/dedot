import { rpc } from '@polkadot/types-support/metadata/static-substrate';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { ConstantExecutor } from '@dedot/api';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import { generateTypes, generateTypesFromEndpoint } from '@dedot/codegen';
import ora from 'ora';
import * as path from 'path';
import { CommandModule } from 'yargs';

type Args = {
  wsUrl?: string;
  output?: string;
  chain?: string;
  dts?: boolean;
  subpath?: boolean;
};

export const chaintypes: CommandModule<Args, Args> = {
  command: 'chaintypes',
  describe: 'Generate chain types & APIs for a Substrate-based blockchain',
  handler: async (yargs) => {
    const { wsUrl, output = '', chain = '', dts = true, subpath = true } = yargs;

    const outDir = path.resolve(output);
    const extension = dts ? 'd.ts' : 'ts';

    const spinner = ora().start();

    if (wsUrl === 'substrate') {
      spinner.text = 'Generating generic chaintypes';
      const metadataHex = staticSubstrate;
      const rpcMethods = rpc.methods;
      const metadata = $Metadata.tryDecode(metadataHex);
      const runtimeVersion = getRuntimeVersion(metadata);
      const runtimeApis: Record<string, number> = runtimeVersion.apis.reduce(
        (acc, [name, version]) => {
          acc[name] = version;
          return acc;
        },
        {} as Record<string, number>,
      );

      await generateTypes('substrate', metadata.latest, rpcMethods, runtimeApis, outDir, extension, subpath);
      spinner.succeed('Generic chaintypes generated!');

      console.log(`🚀 Output: ${outDir}`);
    } else {
      try {
        spinner.text = `Generating chaintypes via endpoint ${wsUrl}`;
        await generateTypesFromEndpoint(chain, wsUrl!, outDir, extension, subpath);
        spinner.succeed(`Generic chaintypes via endpoint ${wsUrl} generated!`);
      
        console.log(`🚀 Output: ${outDir}`);
      } catch {
        spinner.fail(`Failed to generate chaintypes via endpoint ${wsUrl}`) 
      }
    }

    spinner.stop();
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
        .option('subpath', {
          type: 'boolean',
          describe: 'Using subpath for shared packages',
          alias: 's',
          default: true,
        })
    ); // TODO check to verify inputs
  },
};

const getRuntimeVersion = (metadata: Metadata): RuntimeVersion => {
  const registry = new PortableRegistry(metadata.latest);
  const executor = new ConstantExecutor({
    registry,
    metadata,
  } as any);

  return executor.execute('system', 'version') as RuntimeVersion;
};
