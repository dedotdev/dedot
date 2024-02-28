import * as path from 'path';
import { CommandModule } from 'yargs';
import { generateTypesFromChain } from '@dedot/codegen';

type Args = {
  wsUrl?: string;
  output?: string;
  chain?: string;
};

export const chaintypes: CommandModule<Args, Args> = {
  command: 'chaintypes',
  describe: 'Generate chain types & APIs for a Substrate-based blockchain',
  handler: async (yargs) => {
    const { wsUrl, output = '', chain = '' } = yargs;

    const outputDir = path.resolve(output, './codegen');

    await generateTypesFromChain({ chain }, wsUrl!, outputDir);
  },
  builder: (yargs) => {
    return yargs
      .option('wsUrl', {
        type: 'string',
        describe: 'Websocket Url to fetch metadata',
        alias: 'w',
      })
      .option('file', {
        type: 'string',
        describe: 'Path to metadata file',
        alias: 'f',
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
      }); // TODO check to verify inputs
  },
};
