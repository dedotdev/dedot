import { ItemDeprecationInfoDefV16, EnumDeprecationInfoDefV16 } from '@dedot/codecs';
import * as fs from 'fs';
import handlebars from 'handlebars';
import * as path from 'path';
import * as prettier from 'prettier';
import { currentDirname } from './dirname.js';

export const WRAPPER_TYPE_REGEX = /^(\w+)<(.*)>$/;
export const TUPLE_TYPE_REGEX = /^\[(.*)]$/;

export const commentBlock = (...docs: (string | string[])[]) => {
  const flatLines = docs.flat();
  if (flatLines.length === 0 || !flatLines.some((o) => !!o)) {
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
  const prettierOptions = await prettier.resolveConfig(path.resolve(currentDirname(), '../../../.prettierrc.cjs'));

  return prettier.format(source, { parser: 'babel-ts', ...prettierOptions });
};

export const compileTemplate = (templateFile: string) => {
  const templateFilePath = path.resolve(currentDirname(), templateFile);

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

/**
 * Generate deprecation comment from ItemDeprecationInfoDefV16
 *
 * @param deprecationInfo - The deprecation information for the item
 */
export const getDeprecationComment = (deprecationInfo: ItemDeprecationInfoDefV16 | undefined): string[] => {
  if (!deprecationInfo) {
    return [];
  }

  switch (deprecationInfo.type) {
    case 'NotDeprecated':
      return [];
    case 'DeprecatedWithoutNote':
      return ['@deprecated This item is deprecated without note'];
    case 'Deprecated': {
      const { note, since } = deprecationInfo.value;
      const comment = [`@deprecated ${note}`];
      if (since) {
        comment.push(`@since ${since}`);
      }

      return comment;
    }
    default:
      return [];
  }
};

/**
 * Generate deprecation comment for enum variant from EnumDeprecationInfoDefV16
 *
 * @param deprecationInfo - The deprecation information for the enum
 */
export const getVariantDeprecationComment = (
  deprecationInfo: EnumDeprecationInfoDefV16 | undefined,
  variantIndex: number,
): string[] => {
  if (!deprecationInfo || !deprecationInfo[0]) return [];

  const variantDeprecation = deprecationInfo[0].get(variantIndex);

  if (!variantDeprecation) return [];

  switch (variantDeprecation.type) {
    case 'DeprecatedWithoutNote':
      return ['@deprecated This variant is deprecated without note'];
    case 'Deprecated': {
      const { note, since } = variantDeprecation.value;
      const comment = [`@deprecated ${note}`];
      if (since) {
        comment.push(`@since ${since}`);
      }
      return comment;
    }
    default:
      return [];
  }
};
