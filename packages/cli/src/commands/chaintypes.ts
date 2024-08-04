import { rpc } from '@polkadot/types-support/metadata/static-substrate';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { ConstantExecutor } from '@dedot/api';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import { GeneratedResult, generateTypes, generateTypesFromEndpoint } from '@dedot/codegen';
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
  describe: 'Generate chain Types & APIs for Substrate-based chains',
  handler: async (yargs) => {
    const { wsUrl, output = '', chain = '', dts = true, subpath = true } = yargs;

    const outDir = path.resolve(output);
    const extension = dts ? 'd.ts' : 'ts';

    const spinner = ora().start();
    const shouldGenerateGenericTypes = chain === 'substrate';

    try {
      let generatedResult: GeneratedResult;

      if (shouldGenerateGenericTypes) {
        spinner.text = 'Generating Substrate generic chaintypes';

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

        generatedResult = await generateTypes(
          chain || 'substrate',
          metadata.latest,
          rpcMethods,
          runtimeApis,
          outDir,
          extension,
          subpath,
        );

        spinner.succeed('Generated Substrate generic chaintypes');
      } else {
        spinner.text = `Generating chaintypes via endpoint: ${wsUrl}`;
        generatedResult = await generateTypesFromEndpoint(chain, wsUrl!, outDir, extension, subpath);
        spinner.succeed(`Generated chaintypes via endpoint: ${wsUrl}`);
      }

      console.log(`  ➡ Output directory: file://${outDir}`);
      console.log(`  ➡ ChainApi interface: ${generatedResult.interfaceName}`);
      console.log('🌈 Done!');
    } catch (e) {
      if (shouldGenerateGenericTypes) {
        spinner.fail(`Failed to generate Substrate generic chaintypes`);
      } else {
        spinner.fail(`Failed to generate chaintypes via endpoint: ${wsUrl}`);
      }

      console.error(e);
    }

    spinner.stop();
  },
  builder: (yargs) => {
    return yargs
      .option('wsUrl', {
        type: 'string',
        describe: 'Websocket URL to fetch metadata',
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
        describe: 'Custom chain name',
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
        describe: 'Using subpath for shared packages (e.g: dedot/types)',
        alias: 's',
        default: true,
      }); // TODO check to verify inputs
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
