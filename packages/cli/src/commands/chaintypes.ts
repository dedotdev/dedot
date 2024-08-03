import { rpc } from '@polkadot/types-support/metadata/static-substrate';
import staticSubstrate from '@polkadot/types-support/metadata/v15/substrate-hex';
import { ConstantExecutor } from '@dedot/api';
import { $Metadata, Metadata, PortableRegistry, RuntimeVersion } from '@dedot/codecs';
import * as $ from '@dedot/shape'
import { generateTypes, generateTypesFromEndpoint } from '@dedot/codegen';
import { HexString, hexToU8a, stringCamelCase, u8aToHex } from '@dedot/utils';
import { getMetadataFromRuntime } from '@polkadot-api/wasm-executor';
import * as fs from 'fs';
import ora from 'ora';
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
  describe: 'Generate chain types & APIs for a Substrate-based blockchain',
  handler: async (yargs) => {
    const { wsUrl, runtimeFile, metadataFile, output = '', chain = '', dts = true, subpath = true } = yargs;

    const outDir = path.resolve(output);
    const extension = dts ? 'd.ts' : 'ts';

    const spinner = ora().start();

    let metadataHex: HexString | undefined;
    let rpcMethods: string[] | undefined;
    try {
      if (metadataFile) {
        spinner.text = `Parsing metadata file ${metadataFile}`;
        metadataHex = fs.readFileSync(metadataFile, 'utf-8').trim() as HexString;
        rpcMethods = [];
        spinner.succeed(`Parsed metadata file ${metadataFile}`);
      } else if (runtimeFile) {
        spinner.text = `Parsing runtime file ${runtimeFile}`;
        const u8aMetadata = hexToU8a(getMetadataFromRuntime("0x" + fs.readFileSync(runtimeFile).toString('hex') as HexString))

        // Because this metadataHex has compactInt prefixed for it length, we need to get rid of it.
        const length = $.compactU32.tryDecode(u8aMetadata);
        const offset = $.compactU32.tryEncode(length).length;

        metadataHex = u8aToHex(u8aMetadata.subarray(offset));
        rpcMethods = [];

        spinner.succeed(`Parsed metadata file ${runtimeFile}`);
      } else if (wsUrl === 'substrate') {
        spinner.text = 'Parsing static substrate generic chaintypes';
        metadataHex = staticSubstrate;
        rpcMethods = rpc.methods;
        spinner.succeed(`Parsed static substrate generic chaintypes`);
      }

      if (metadataHex && rpcMethods) {
        spinner.text = 'Generating generic chaintypes';
        const metadata = $Metadata.tryDecode(metadataHex);
        const runtimeVersion = getRuntimeVersion(metadata);
        const chainName = chain || stringCamelCase(runtimeVersion.specName || 'local');
        const runtimeApis: Record<string, number> = runtimeVersion.apis.reduce(
          (acc, [name, version]) => {
            acc[name] = version;
            return acc;
          },
          {} as Record<string, number>,
        );

        await generateTypes(chainName, metadata.latest, rpcMethods, runtimeApis, outDir, extension, subpath, rpcMethods.length === 0);
        spinner.succeed('Generic chaintypes generated!');

        console.log(`🚀 Output: ${outDir}`);
      } else {
        spinner.text = `Generating chaintypes via endpoint ${wsUrl}`;
        await generateTypesFromEndpoint(chain, wsUrl!, outDir, extension, subpath);
        spinner.succeed(`Generic chaintypes via endpoint ${wsUrl} generated!`);

        console.log(`🚀 Output: ${outDir}`);
      }

      spinner.stop();
    } catch (e) {
      spinner.stop();

      console.error(`✖ ${(e as Error).message}`);
      spinner.fail(`Failed to generate chaintypes!`);
    }
  },
  builder: (yargs) => {
    return yargs
      .option('wsUrl', {
        type: 'string',
        describe: 'Websocket Url to fetch metadata',
        alias: 'w',
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
      .check((argv) => {
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
