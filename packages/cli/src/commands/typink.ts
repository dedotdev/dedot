import { generateContractTypes } from '@dedot/codegen';
import { assert } from '@dedot/utils';
import * as fs from 'node:fs';
import ora from 'ora';
import * as path from 'path';
import { CommandModule } from 'yargs';

type Args = {
  contract?: string;
  output?: string;
  metadata?: string;
  dts?: boolean;
  subpath?: boolean;
};

export const typink: CommandModule<Args, Args> = {
  command: 'typink',
  describe: 'Generate types & APIs for a ink! smart contracts',
  handler: async (yargs) => {
    const { contract, output = '', metadata, dts = true, subpath = true } = yargs;

    assert(metadata, 'Metadata file is required, -h or --help to known more about the command');

    const outDir = path.resolve(output);
    const metadataFile = path.resolve(metadata);
    const extension = dts ? 'd.ts' : 'ts';

    const spinner = ora().start();

    spinner.text = `Parsing metadata via file ${metadata}`;
    try {
      const rawMetadata = fs.readFileSync(metadataFile, 'utf-8');
      spinner.succeed(`Parsed metadata via file ${metadata}`);
      spinner.text = `Generating contract types via metadata ${metadata}`;
      await generateContractTypes(rawMetadata, contract, outDir, extension, subpath);
      spinner.succeed(`Generated contract types via metadata ${metadata}`);
      spinner.stop();

      console.log(`🚀 Output: ${outDir}`);
    } catch (e) {
      spinner.stop();

      console.error(`✖ ${(e as Error).message}`);
      spinner.fail(`Failed to generate contract types via metadata ${metadata}`);
    }
  },
  builder: (yargs) => {
    return yargs
      .option('metadata', {
        type: 'string',
        describe: 'Path to contract metadata file (.json, .contract)',
        alias: 'm',
        demandOption: true,
      })
      .option('output', {
        type: 'string',
        describe: 'Output folder to put generated files',
        alias: 'o',
      })
      .option('contract', {
        type: 'string',
        describe: 'Contract name',
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
      });
  },
};
