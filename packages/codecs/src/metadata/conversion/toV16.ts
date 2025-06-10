import { calcRuntimeApiHash, ensurePresence } from '@dedot/utils';
import { RuntimeVersion } from '../../codecs/known/index.js';
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
  const { types, pallets, extrinsic, apis, outerEnums, custom } = metadataV15;

  const signedExtensionsByVersion = new Map<number, number[]>();
  signedExtensionsByVersion.set(
    0,
    Array.from({ length: extrinsic.signedExtensions.length }).map((_, i) => i),
  );

  const extrinsicV16 = {
    ...extrinsic,
    versions: [extrinsic.version],
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

  const runtimeVersion = ensurePresence(
    lookupConstant<RuntimeVersion>(metadataV15 as unknown as MetadataLatest, 'system', 'version'),
    'Runtime Version not found in Metadata v15',
  );
  const findRuntimeApiVersion = (apiName: string): number => {
    const [_, version] = runtimeVersion.apis.find(([apiHash]) => apiHash === calcRuntimeApiHash(apiName))!;
    return version;
  };

  const apisV16 = apis.map((api) => ({
    ...api,
    methods: api.methods.map((m) => ({
      ...m,
      deprecationInfo: { type: 'NotDeprecated' },
    })),
    deprecationInfo: { type: 'NotDeprecated' },
    version: findRuntimeApiVersion(api.name),
  })) as RuntimeApiDefV16[];

  return {
    types, // --
    pallets: palletsV16,
    extrinsic: extrinsicV16,
    apis: apisV16,
    outerEnums,
    custom,
  } as MetadataV16;
};
