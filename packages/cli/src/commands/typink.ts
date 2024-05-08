import { generateContractTypesFromMetadata } from '@dedot/codegen';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommandModule } from 'yargs';

type Args = {
  contract?: string;
  output?: string;
  metadata?: string;
  dts?: boolean;
};

export const typink: CommandModule<Args, Args> = {
  command: 'typink',
  describe: 'Generate contract types & APIs for a Substrate-based blockchain',
  handler: async (yargs) => {
    const { contract, output = '', metadata = '', dts = true } = yargs;

    if (!metadata) return;

    const outDir = path.resolve(output);
    const metadataFile = path.resolve(metadata);
    const extension = dts ? 'd.ts' : 'ts';

    const rawMetadata = fs.readFileSync(metadataFile, 'utf-8');

    console.log(`- Generating contract types via metadata ${metadata}`);
    await generateContractTypesFromMetadata(rawMetadata, contract, outDir, extension);

    console.log(`- DONE! Output: ${outDir}`);
  },

  builder: (yargs) => {
    return yargs
      .option('metadata', {
        type: 'string',
        describe: 'Path to contract metadata file (.json, .contract)',
        alias: 'm',
        requiresArg: true,
      })
      .option('contract', {
        type: 'string',
        describe: 'Contract name',
        alias: 'c',
      })
      .option('output', {
        type: 'string',
        describe: 'Output folder to put generated files',
        alias: 'o',
      })
      .option('dts', {
        type: 'boolean',
        describe: 'Generate .d.ts files',
        alias: 'd',
        default: true,
      });
  },
};
