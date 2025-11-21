import { DedotClient } from '@dedot/api';
import { GeneratedResult, generateTypes, generateTypesFromEndpoint, resolveBlockHash } from '@dedot/codegen';
import { WsProvider } from '@dedot/providers';
import { HexString, stringCamelCase, stringPascalCase } from '@dedot/utils';
import ora from 'ora';
import * as path from 'path';
import { CommandModule } from 'yargs';
import { ParsedResult } from './types.js';
import {
  parseMetadataFromRaw,
  parseMetadataFromWasm,
  parseStaticSubstrate,
  findBlockFromSpecVersion,
} from './utils.js';

type Args = {
  wsUrl?: string;
  output?: string;
  chain?: string;
  dts?: boolean;
  subpath?: boolean;
  wasm?: string;
  metadata?: string;
  at?: string;
  spec?: number;
};

const shortenHash = (hash: string, prefixLen = 6, suffixLen = 6): string => {
  if (hash.length <= prefixLen + suffixLen + 2) return hash;
  return `${hash.slice(0, prefixLen + 2)}...${hash.slice(-suffixLen)}`;
};

export const chaintypes: CommandModule<Args, Args> = {
  command: 'chaintypes',
  describe: 'Generate Types & APIs for Substrate-based chains',
  handler: async (yargs) => {
    let { wsUrl, wasm, metadata, output = '', chain = '', dts = true, subpath = true, at, spec } = yargs;

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

      spinner.start();

      if (parsedResult) {
        const { metadata, runtimeVersion, rpcMethods } = parsedResult;
        const chainName =
          chain || stringCamelCase(runtimeVersion.specName) || (shouldGenerateGenericTypes ? 'substrate' : 'local');

        spinner.text = `Generating ${stringPascalCase(chainName)} generic chaintypes`;
        generatedResult = await generateTypes({
          chain: chainName,
          metadata: metadata.latest,
          rpcMethods,
          runtimeVersion,
          outDir,
          extension,
          useSubPaths: subpath,
        });

        spinner.succeed(`Generated ${stringPascalCase(chainName)} generic chaintypes`);
      } else {
        // Create client once and reuse for both operations
        spinner.text = `Connecting to network: ${wsUrl} ...`;
        const client = await DedotClient.legacy(new WsProvider({ endpoint: wsUrl! }));
        spinner.succeed(`Connected to network: ${wsUrl}`);

        try {
          let blockNumber: number | undefined;

          if (spec) {
            spinner.start();
            spinner.text = `Resolving block hash for spec version ${spec}...`;
            const result = await findBlockFromSpecVersion(client, spec);
            at = result.blockHash;
            blockNumber = result.blockNumber;

            spinner.succeed(`Resolved block hash ${shortenHash(at)} (#${blockNumber}) for spec version ${spec}`);
          }

          spinner.start();

          let atText = '';
          if (at) {
            let blockHash: HexString;

            if (blockNumber === undefined) {
              // at was provided directly by user, resolve it to block hash
              blockHash = await resolveBlockHash(client, at);
              const header = await client.block.header(blockHash);
              blockNumber = header?.number;
            } else {
              // blockNumber is already set from spec resolution, at is the block hash
              blockHash = at as HexString;
            }

            atText = ` at ${shortenHash(blockHash)} (#${blockNumber ?? 'unknown'})`;
          }

          spinner.text = `Generating chaintypes via endpoint: ${wsUrl}${atText}`;
          generatedResult = await generateTypesFromEndpoint({
            chain,
            client,
            outDir,
            extension,
            useSubPaths: subpath,
            at,
          });
          spinner.succeed(`Generated chaintypes via endpoint: ${wsUrl}${atText}`);
        } finally {
          await client.disconnect();
        }
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

      console.error(`Error details: ${(e as Error).message}`);
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
      .option('at', {
        type: 'string',
        describe: 'Block hash or block number to fetch metadata at',
      })
      .option('spec', {
        type: 'number',
        describe: 'Spec version to fetch metadata at (only with --wsUrl)',
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

        if (argv.at && !argv.wsUrl) {
          throw new Error('The --at option can only be used with --wsUrl');
        }

        if (argv.spec && !argv.wsUrl) {
          throw new Error('The --spec option can only be used with --wsUrl');
        }

        if (argv.spec && argv.at) {
          throw new Error('Please provide only one of the following options: --spec, --at');
        }

        return true;
      });
  },
};
