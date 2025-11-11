import { LegacyClient } from '@dedot/api';
import { ItemDeprecationInfoDefV16, EnumDeprecationInfoDefV16 } from '@dedot/codecs';
import { DedotError } from '@dedot/utils';
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
  // return source;
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
    case 'DeprecatedWithoutNote':
      return ['@deprecated'];
    case 'Deprecated': {
      const { note, since } = deprecationInfo.value;
      return [`@deprecated ${note}${since ? ` (since ${since})` : ''}`];
    }
    case 'NotDeprecated':
    default:
      return [];
  }
};

/**
 * Generate deprecation comment for enum variant from EnumDeprecationInfoDefV16
 *
 * @param deprecationInfo - The deprecation information for the enum
 * @param variantIndex
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
      return ['@deprecated'];
    case 'Deprecated': {
      const { note, since } = variantDeprecation.value;
      return [`@deprecated ${note}${since ? ` (since ${since})` : ''}`];
    }
    default:
      return [];
  }
};

/**
 * Resolve block hash from either a block hash or block number
 * @param client - The API client
 * @param at - Block hash (0x...) or block number (number)
 * @returns The resolved block hash
 */
export async function resolveBlockHash(client: LegacyClient, at: string): Promise<`0x${string}`> {
  // Check if it's a hex string (block hash)
  if (at.startsWith('0x')) {
    return at as `0x${string}`;
  }

  // Try to parse as a number (block height)
  const blockNumber = parseInt(at, 10);
  if (isNaN(blockNumber)) {
    throw new DedotError(`Invalid block specifier: ${at}. Must be a block hash (0x...) or block number.`);
  }

  // Resolve block number to block hash
  const blockHash = await client.rpc.chain_getBlockHash(blockNumber);
  if (!blockHash) {
    throw new DedotError(`Block not found at height: ${blockNumber}`);
  }

  return blockHash;
}
