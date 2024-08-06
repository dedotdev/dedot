import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { chaintypes, typink } from './commands/index.js';

export const dedot = (): void => {
  yargs(hideBin(process.argv))
    .scriptName('dedot')
    .showHelpOnFail(true)
    .command(chaintypes)
    .command(typink)
    .version(false)
    .help('help', 'Show help instructions')
    .alias('h', 'help')
    .alias('v', 'version')
    .epilog(`//-- decode the dots - website: https://dedot.dev --//`)
    .strictCommands()
    .demandCommand(1).argv;
};
