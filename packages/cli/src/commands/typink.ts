import { generateContractTypes } from '@dedot/codegen';
import { ensureSupportedContractMetadataVersion } from '@dedot/contracts';
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
  describe: 'Generate Types & APIs for ink! smart contracts',
  handler: async (yargs) => {
    const { contract, output = '', metadata, dts = true, subpath = true } = yargs;

    assert(metadata, 'Metadata file is required, -h or --help to known more about the command');

    const outDir = path.resolve(output);
    const metadataFile = path.resolve(metadata);
    const extension = dts ? 'd.ts' : 'ts';

    const spinner = ora().start();

    try {
      spinner.text = `Parsing contract metadata file: ${metadata}`;

      const contractMetadata = JSON.parse((fs.readFileSync(metadataFile, 'utf-8')));
      ensureSupportedContractMetadataVersion(contractMetadata);

      spinner.succeed(`Parsed contract metadata file: ${metadata}`);

      spinner.text = 'Generating contract Types & APIs';
      const { interfaceName, outputFolder } = await generateContractTypes(
        contractMetadata,
        contract,
        outDir,
        extension,
        subpath,
      );
      spinner.succeed('Generated contract Types & APIs');

      console.log(`  ➡ Output directory: file://${outputFolder}`);
      console.log(`  ➡ ContractApi interface: ${interfaceName}`);
      console.log('🌈 Done!');

      spinner.stop();
    } catch (e) {
      spinner.stop();

      spinner.fail(`Failed to generate contract Types & APIs using metadata file: ${metadata}`);
      console.error(e);
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
        describe: 'Custom contract name, default is contract name from metadata',
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
        describe: 'Using subpath for shared packages (e.g: dedot/contracts)',
        alias: 's',
        default: true,
      });
  },
};
