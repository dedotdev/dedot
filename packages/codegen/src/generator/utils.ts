import * as path from 'path';
import * as process from 'process';
import * as prettier from 'prettier';

export const commentBlock = (docs: string | string[]) => {
  docs = Array.isArray(docs) ? docs : [docs];

  if (!docs || docs.length === 0) {
    return '';
  } else {
    return `
/**
${docs.map((line) => `* ${line.replaceAll(/\s+/g, ' ').trim()}`).join('\n')}
**/
        `;
  }
};

export const resolveFilePath = (relativePath: string | string[]) => {
  relativePath = Array.isArray(relativePath) ? relativePath : [relativePath];

  return path.resolve(process.cwd(), ...relativePath);
};

export const PRETTIER_FORMAT_OPTION = await prettier.resolveConfig(resolveFilePath('./.prettierrc.js'));

export const beautifySourceCode = (source: string): Promise<string> => {
  return prettier.format(source, { parser: 'babel-ts', ...PRETTIER_FORMAT_OPTION });
};
