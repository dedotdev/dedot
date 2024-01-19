import { MetadataV15 } from '../v15';
import { MetadataV14 } from '../v14';

export const toV15 = (metadataV14: MetadataV14): MetadataV15 => {
  const { types, pallets: palletsV14, extrinsic: extrinsicV14, runtimeType } = metadataV14;
  const extrinsicV14Type = types[extrinsicV14.typeId];
  const [address, call, signature, extra] = extrinsicV14Type.params;
  const extrinsic = {
    ...extrinsicV14,
    addressTypeId: address.typeId!,
    callTypeId: call.typeId!,
    signatureTypeId: signature.typeId!,
    extraTypeId: extra.typeId!,
  };

  const pallets = palletsV14.map((p) => ({ ...p, docs: [] }));
  const frameSystemEventRecord = types.find(({ path }) => path.join('::') === 'frame_system::EventRecord')!;

  return {
    types,
    pallets,
    extrinsic,
    runtimeType,
    apis: [],
    outerEnums: {
      callEnumTypeId: call.typeId!,
      eventEnumTypeId: frameSystemEventRecord.params[0].typeId!,
      // TODO fix me, currently there is not a type for RuntimeError in V14 metadata
      errorEnumTypeId: -1,
    },
    custom: { map: new Map() },
  };
};
