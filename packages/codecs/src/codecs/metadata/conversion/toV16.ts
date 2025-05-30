import { calcRuntimeApiHash } from '@dedot/utils';
import { RuntimeVersion } from '../../known/index.js';
import { MetadataLatest } from '../Metadata.js';
import { lookupConstant } from '../utils.js';
import { MetadataV15 } from '../v15.js';
import {
  ConstantDefV16,
  ExtrinsicDefV16,
  MetadataV16,
  PalletDefV16,
  RuntimeApiDefV16,
  StorageEntryV16,
} from '../v16.js';

export const toV16 = (metadataV15: MetadataV15): MetadataV16 => {
  const runtimeVersion = lookupConstant<RuntimeVersion>(metadataV15 as unknown as MetadataLatest, 'system', 'version');

  const { types, pallets, extrinsic, apis, outerEnums, custom } = metadataV15;

  const signedExtensionsByVersion = new Map<number, number[]>();
  signedExtensionsByVersion.set(
    0,
    Array.from({ length: extrinsic.signedExtensions.length }).map((_, i) => i),
  );

  const extrinsicV16 = {
    ...extrinsic,
    version: [extrinsic.version],
    signedExtensionsByVersion,
  } as ExtrinsicDefV16;

  const palletsV16 = pallets.map((p) => ({
    ...p,
    storage: p.storage
      ? {
          ...p.storage,
          entries: p.storage.entries.map((e) => ({
            ...e,
            deprecationInfo: { type: 'NotDeprecated' },
          })) as StorageEntryV16[],
        }
      : undefined,
    calls: p.calls ? { typeId: p.calls, deprecationInfo: [new Map()] } : undefined,
    event: p.event ? { typeId: p.event, deprecationInfo: [new Map()] } : undefined,
    error: p.error ? { typeId: p.error, deprecationInfo: [new Map()] } : undefined,
    constants: p.constants.map((c) => ({ ...c, deprecationInfo: { type: 'NotDeprecated' } })) as ConstantDefV16[],
    associatedTypes: [],
    viewFunctions: [],
    deprecationInfo: { type: 'NotDeprecated' },
  })) as PalletDefV16[];

  const apisV16 = apis.map((api) => ({
    ...api,
    methods: api.methods.map((m) => ({
      ...m,
      deprecationInfo: { type: 'NotDeprecated' },
    })),
    deprecationInfo: { type: 'NotDeprecated' },
    version: runtimeVersion
      ? runtimeVersion.apis.find(([apiHash]) => apiHash === calcRuntimeApiHash(api.name))?.at(1)
      : -1,
  })) as RuntimeApiDefV16[];

  return { types, pallets: palletsV16, extrinsic: extrinsicV16, apis: apisV16, outerEnums, custom } as MetadataV16;
};
