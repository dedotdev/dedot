import * as fs from 'fs';
import handlebars from 'handlebars';
import * as path from 'path';
import * as process from 'process';
import * as prettier from 'prettier';

export const WRAPPER_TYPE_REGEX = /^(\w+)<(.*)>$/;
export const TUPLE_TYPE_REGEX = /^\[(.*)]$/;

export const commentBlock = (...docs: (string | string[])[]) => {
  const flatLines = docs.flat();
  if (flatLines.length === 0) {
    return '';
  } else {
    return `
/**
${flatLines.map((line) => `* ${line.replaceAll(/\s+/g, ' ').trim()}`).join('\n')}
 **/
      `;
  }
};

export const resolveFilePath = (relativePath: string | string[]) => {
  relativePath = Array.isArray(relativePath) ? relativePath : [relativePath];

  return path.resolve(process.cwd(), ...relativePath);
};

export const beautifySourceCode = async (source: string): Promise<string> => {
  const prettierOptions = await prettier.resolveConfig(resolveFilePath('./.prettierrc.js'));

  return prettier.format(source, { parser: 'babel-ts', ...prettierOptions });
};

export const compileTemplate = (templateFileName: string) => {
  const templateFilePath = resolveFilePath(`packages/codegen/src/templates/${templateFileName}`);

  return handlebars.compile(fs.readFileSync(templateFilePath, 'utf8'));
};

// TODO add more reserved words
const TS_RESERVED_WORDS = ['new', 'class'];

/**
 * Check if a word is TypeScript/JavaScript reserved
 * @param word
 */
export const isReservedWord = (word: string) => TS_RESERVED_WORDS.includes(word);
