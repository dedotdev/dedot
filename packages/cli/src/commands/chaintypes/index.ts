import { GeneratedResult, generateTypes, generateTypesFromEndpoint } from '@dedot/codegen';
import { stringCamelCase, stringPascalCase } from '@dedot/utils';
import ora from 'ora';
import * as path from 'path';
import { CommandModule } from 'yargs';
import { ParsedResult } from './types.js';
import { parseMetadataFromRaw, parseMetadataFromWasm, parseStaticSubstrate } from './utils.js';

type Args = {
  wsUrl?: string;
  output?: string;
  chain?: string;
  dts?: boolean;
  subpath?: boolean;
  wasm?: string;
  metadata?: string;
};

export const chaintypes: CommandModule<Args, Args> = {
  command: 'chaintypes',
  describe: 'Generate Types & APIs for Substrate-based chains',
  handler: async (yargs) => {
    const { wsUrl, wasm, metadata, output = '', chain = '', dts = true, subpath = true } = yargs;

    const outDir = path.resolve(output);
    const extension = dts ? 'd.ts' : 'ts';

    const spinner = ora().start();
    const shouldGenerateGenericTypes = wsUrl === 'substrate';
    let generatedResult: GeneratedResult;
    let parsedResult: ParsedResult | undefined;

    try {
      if (metadata) {
        spinner.text = `Parsing metadata file ${metadata}...`;
        parsedResult = await parseMetadataFromRaw(metadata);
        spinner.succeed(`Parsed metadata file ${metadata}`);
      } else if (wasm) {
        spinner.text = `Parsing runtime wasm file ${wasm}`;
        parsedResult = await parseMetadataFromWasm(wasm);
        spinner.succeed(`Parsed runtime wasm file ${wasm}`);
      } else if (shouldGenerateGenericTypes) {
        spinner.text = 'Parsing static substrate generic chaintypes...';
        parsedResult = await parseStaticSubstrate();
        spinner.succeed(`Parsed static substrate generic chaintypes`);
      }

      if (parsedResult) {
        const { metadata, runtimeVersion, runtimeApis, rpcMethods } = parsedResult;
        const chainName =
          chain || stringCamelCase(runtimeVersion.specName) || (shouldGenerateGenericTypes ? 'substrate' : 'local');

        spinner.text = `Generating ${stringPascalCase(chainName)} generic chaintypes`;
        generatedResult = await generateTypes(
          chainName,
          metadata.latest,
          rpcMethods,
          runtimeApis,
          outDir,
          extension,
          subpath,
        );

        spinner.succeed(`Generated ${stringPascalCase(chainName)} generic chaintypes`);
      } else {
        spinner.text = `Generating chaintypes via endpoint: ${wsUrl}`;
        generatedResult = await generateTypesFromEndpoint(chain, wsUrl!, outDir, extension, subpath);
        spinner.succeed(`Generated chaintypes via endpoint: ${wsUrl}`);
      }

      const { interfaceName, outputFolder } = generatedResult;

      console.log(`  ➡ Output directory: file://${outputFolder}`);
      console.log(`  ➡ ChainApi interface: ${interfaceName}`);
      console.log('🌈 Done!');
    } catch (e) {
      if (shouldGenerateGenericTypes) {
        spinner.fail(`Failed to generate Substrate generic chaintypes`);
      } else if (wasm) {
        spinner.fail(`Failed to generate chaintypes via runtime wasm file: ${wasm}`);
      } else if (metadata) {
        spinner.fail(`Failed to generate chaintypes via metadata file: ${metadata}`);
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
      })
      .option('wasm', {
        type: 'string',
        describe: 'Runtime wasm file to fetch metadata (.wasm)',
        alias: 'r',
      })
      .option('metadata', {
        type: 'string',
        describe: 'Raw encoded metadata file (.scale)',
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
      })
      .check((argv) => {
        const inputs = ['wsUrl', 'wasm', 'metadata'];
        const providedInputs = inputs.filter((input) => argv[input]);

        if (providedInputs.length > 1) {
          throw new Error(`Please provide only one of the following options: ${inputs.join(', ')}`);
        }

        if (providedInputs.length === 0) {
          throw new Error(`Please provide one of the following options: ${inputs.join(', ')}`);
        }

        return true;
      });
  },
};
