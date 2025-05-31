import { assert, stringCamelCase } from '@dedot/utils';
import { PortableRegistry } from '../../registry/PortableRegistry.js';
import { MetadataLatest } from './Metadata.js';

/**
 * Look up a constant in the metadata
 *
 * @param metadata - Metadata object
 * @param pallet - Pallet name
 * @param constant - Constant name
 * @returns Constant value
 */
export function lookupConstant<T extends any = any>(metadata: MetadataLatest, pallet: string, constant: string): T {
  const registry = new PortableRegistry(metadata);
  const targetPallet = metadata.pallets.find((p) => stringCamelCase(p.name) === pallet);

  assert(targetPallet, `Pallet not found: ${pallet}`);

  const constantDef = targetPallet.constants.find((one) => stringCamelCase(one.name) === constant);

  assert(constantDef, `Constant ${constant} not found in pallet ${pallet}`);

  const $codec = registry.findCodec(constantDef.typeId);

  return $codec.tryDecode(constantDef.value) as T;
}
