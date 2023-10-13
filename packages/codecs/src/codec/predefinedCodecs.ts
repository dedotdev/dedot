import * as $ from '@delightfuldot/shape';
import { $Metadata } from '../metadata';

const bool = $.bool;
const Text = $.str;
const Hash = $.FixedHex(32);
const Metadata = $Metadata;
const Bytes = $.Bytes;

const StorageKey = $.Bytes;
const StorageData = $.Bytes;
const Extrinsic = $.PrefixedHex;
const BlockNumber = $.compact($.u32);

const BlockHash = Hash;

const CodecsMap: Record<string, $.AnyShape> = {
  Bytes,
  bool,
  Text,
  Hash,
  Metadata,
  StorageKey,
  StorageData,
  BlockHash,
  BlockNumber,
};

export { CodecsMap };

export const findPredefinedCodec = (typeName: string): $.AnyShape => {
  const $codec = CodecsMap[typeName];
  if (!$codec) {
    throw new Error(`Unsupported codec - ${typeName}`);
  }

  return $codec;
};
