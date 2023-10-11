import * as $ from "@delightfuldot/shape"
import { $Metadata } from "../metadata";

const bool = $.bool;
const Text = $.str;
const Hash = $.FixedHex(32);
const Metadata = $Metadata;
const Bytes = $.Bytes;

export const StorageKey = $.Bytes;
export const StorageData = $.Bytes;
export const Extrinsic = $.PrefixedHex;
export const BlockNumber = $.compact($.u32);

export const BlockHash = Hash;

export const getType = (typeName: string): $.AnyShape => {
  const $type = TypesMap[typeName];
  if(!$type) {
    throw new Error(`Unsupported type - ${typeName}`);
  }

  return $type;
}

const TypesMap: Record<string, $.AnyShape> = {
  Bytes,
  bool,
  Text,
  Hash,
  Metadata,
  StorageKey,
  StorageData,
  BlockHash,
  BlockNumber
}

export default TypesMap;
