import { rpc } from '@polkadot/types-support/metadata/static-substrate';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { ConstantExecutor } from '@dedot/api';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import * as $ from '@dedot/shape';
import { HexString, hexToU8a, stringCamelCase, u8aToHex } from '@dedot/utils';
import { getMetadataFromRuntime } from '@polkadot-api/wasm-executor';
import * as fs from 'fs';
import ora from 'ora';
import { GeneratedResult, generateTypes, generateTypesFromEndpoint } from '@dedot/codegen';
import * as path from 'path';
import { CommandModule } from 'yargs';

type Args = {
  wsUrl?: string;
  output?: string;
  chain?: string;
  dts?: boolean;
  subpath?: boolean;
  runtimeFile?: string;
  metadataFile?: string;
};

export const chaintypes: CommandModule<Args, Args> = {
  command: 'chaintypes',
  describe: 'Generate Types & APIs for Substrate-based chains',
  handler: async (yargs) => {
    const { wsUrl, runtimeFile, metadataFile, output = '', chain = '', dts = true, subpath = true } = yargs;

    const outDir = path.resolve(output);
    const extension = dts ? 'd.ts' : 'ts';

    const spinner = ora().start();
    const shouldGenerateGenericTypes = wsUrl === 'substrate';

    let metadataHex: HexString | undefined;
    let rpcMethods: string[] = [];
    let shouldExposeAllMethod: boolean = false;
    let generatedResult: GeneratedResult;

    try {
      if (metadataFile) {
        spinner.text = `Parsing metadata file ${metadataFile}...`;
        metadataHex = fs.readFileSync(metadataFile, 'utf-8').trim() as HexString;
        shouldExposeAllMethod = true;
        spinner.succeed(`Parsed metadata file ${metadataFile}`);
      } else if (runtimeFile) {

        spinner.text = `Parsing runtime file ${runtimeFile} to get metadata...`;

        const u8aMetadata = hexToU8a(
            getMetadataFromRuntime(('0x' + fs.readFileSync(runtimeFile).toString('hex')) as HexString),
        );
        // Because this u8aMetadata has compactInt prefixed for it length, we need to get rid of it.
        const length = $.compactU32.tryDecode(u8aMetadata);
        const offset = $.compactU32.tryEncode(length).length;

        metadataHex = u8aToHex(u8aMetadata.subarray(offset));
        shouldExposeAllMethod = true;

        spinner.succeed(`Parsed runtime file ${runtimeFile}`);
      } else if (shouldGenerateGenericTypes) {
        spinner.text = 'Parsing static substrate generic chaintypes...';
        metadataHex = staticSubstrate;
        rpcMethods = rpc.methods;
        spinner.succeed(`Parsed static substrate generic chaintypes`);
      }

      if (metadataHex) {
        spinner.text = 'Decoding metadata...';
        const metadata = $Metadata.tryDecode(metadataHex);
        const runtimeVersion = getRuntimeVersion(metadata);
        const runtimeApis: Record<string, number> = runtimeVersion.apis.reduce(
          (acc, [name, version]) => {
            acc[name] = version;
            return acc;
          },
          {} as Record<string, number>,
        );
        spinner.succeed('Decoded metadata!')

        spinner.text = 'Generating Substrate generic chaintypes';
        generatedResult = await generateTypes(
          chain || stringCamelCase(runtimeVersion.specName) || 'substrate',
          metadata.latest,
          rpcMethods,
          runtimeApis,
          outDir,
          extension,
          subpath,
            shouldExposeAllMethod,
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
        .option('runtimeFile', {
          type: 'string',
          describe: 'Runtime file to fetch metadata (.wasm)',
          alias: 'r',
        })
        .option('metadataFile', {
          type: 'string',
          describe: 'Encoded metadata file to fetch metadata (.scale)',
          alias: 'm',
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
      }) .check((argv) => {
          const inputs = ['wsUrl', 'runtimeFile', 'metadataFile'];
          const providedInputs = inputs.filter((input) => argv[input]);

          if (providedInputs.length > 1) {
            throw new Error(`Please provide only one of the following options: ${inputs.join(', ')}`);
          }

          if (providedInputs.length === 0) {
            throw new Error(`Please provide one of the following options: ${inputs.join(', ')}`);
          }

          return true;
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
