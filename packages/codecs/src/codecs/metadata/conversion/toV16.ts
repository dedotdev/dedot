import { calcRuntimeApiHash } from '@dedot/utils';
import { MetadataV15 } from '../v15.js';
import {
  ConstantDefV16,
  ExtrinsicDefV16,
  MetadataV16,
  PalletDefV16,
  RuntimeApiDefV16,
  StorageEntryV16,
} from '../v16.js';

export const toV16 = (metadataV15: MetadataV15, runtimeVersion?: Record<string, number>): MetadataV16 => {
  console.log(runtimeVersion);

  const { types, pallets, extrinsic, apis, outerEnums, custom } = metadataV15;

  const extrinsicV16 = {
    version: [extrinsic.version],
    addressTypeId: extrinsic.addressTypeId,
    signatureTypeId: extrinsic.signatureTypeId,
    transactionExtensionsByVersion: new Map(),
    transactionExtensions: [],
  } as ExtrinsicDefV16;

  const palletsV16 = pallets.map((p) => ({
    ...p,
    storage: {
      ...p.storage,
      entries: p.storage?.entries.map((e) => ({
        ...e,
        deprecationInfo: { type: 'NotDeprecated' },
      })) as StorageEntryV16[],
    },
    calls: p.calls ? { typeId: p.calls, deprecationInfo: { type: 'NotDeprecated' } } : undefined,
    event: p.event ? { typeId: p.event, deprecationInfo: { type: 'NotDeprecated' } } : undefined,
    error: p.error ? { typeId: p.error, deprecationInfo: { type: 'NotDeprecated' } } : undefined,
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
    version: runtimeVersion ? runtimeVersion[calcRuntimeApiHash(api.name)] : -1,
  })) as RuntimeApiDefV16[];

  return { types, pallets: palletsV16, extrinsic: extrinsicV16, apis: apisV16, outerEnums, custom } as MetadataV16;
};
