import * as fs from 'fs';
import handlebars from 'handlebars';
import * as path from 'path';
import * as prettier from 'prettier';
import { currentDirname } from './dirname';

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

export const beautifySourceCode = async (source: string): Promise<string> => {
  const prettierOptions = await prettier.resolveConfig(path.resolve(currentDirname(), '../../../../.prettierrc.js'));

  return prettier.format(source, { parser: 'babel-ts', ...prettierOptions });
};

export const compileTemplate = (templateFileName: string, dir?: string) => {
  const templateFilePath = path.resolve(dir || currentDirname(), `../templates/${templateFileName}`);

  return handlebars.compile(fs.readFileSync(templateFilePath, 'utf8'));
};

// TODO add more reserved words
const TS_RESERVED_WORDS = ['new', 'class'];

/**
 * Check if a word is TypeScript/JavaScript reserved
 * @param word
 */
export const isReservedWord = (word: string) => TS_RESERVED_WORDS.includes(word);

const TS_PRIMITIVE_TYPES = [
  'void',
  'undefined',
  'null',
  'number',
  'boolean',
  'bigint',
  'Map',
  'Set',
  'string',
  'any',
  'Array',
  'Record',
];

/**
 * Check if a type is native JS/TS type
 * @param type
 */
export const isNativeType = (type: string) => {
  return TS_PRIMITIVE_TYPES.some((one) => {
    if (typeof one === 'string') {
      return one === type;
    } else {
      return type.match(one);
    }
  });
};
