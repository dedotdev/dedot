import * as path from 'path';
import { CommandModule } from 'yargs';
import { generateTypesFromEndpoint } from '@dedot/codegen';

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

    console.log(`- Generating chaintypes via endpoint ${wsUrl!}`);

    const outDir = path.resolve(output, './codegen');
    await generateTypesFromEndpoint(chain, wsUrl!, outDir);

    console.log(`- DONE! Output: ${outDir}`);
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
        // TODO add file input
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
    ); // TODO check to verify inputs
  },
};
