import { Metadata, TypeDef, Field } from '@dedot/codecs';
import { assert } from '@dedot/utils';
import { UndeterminedSizeType } from './errors';

export function ensureSubTypes(size: number, metadata: Metadata, _map: Map<number, number>) {
  if (_map.get(size)) return;

  const { types } = metadata.latest;
  const nextId = types.at(-1)!.id + 1;

  types.push({
    id: nextId,
    params: [],
    path: [],
    docs: [],
    typeDef: {
      type: 'SizedVec',
      // typeParam = 2 is u8
      value: { len: size, typeParam: 2 },
    },
  });

  _map.set(size, nextId);
}

export function reduceFieldSize(
  fields: Field[],
  metadata: Metadata,
  _map = new Map<number, number>(),
  _set = new Set<number>(),
) {
  const {types} = metadata.latest;

  try {
    const size = fields.reduce((sum, { typeId }) => sum + howManyBytesItTake(typeId, metadata), 0);

    if (size === 0) return fields;

    ensureSubTypes(size, metadata, _map);

    return [{ typeId: _map.get(size)!, docs: [] }];
  } catch (e) {
    return fields.map(({ typeId }) => {
      try {

        const size = howManyBytesItTake(typeId, metadata);

        if (size === 0 || isPrimitive(types[typeId].typeDef)) return { typeId, docs: [] };

        ensureSubTypes(size, metadata, _map);

        return { typeId: _map.get(size)!, docs: [] };
      } catch {
        reduceTokenSize(typeId, metadata, _map, _set);

        return { typeId, docs: [] };
      }
    });
  }
}

// Cannot think a better name, for now.
// Using mainly to reduce the size of useless pallet events.
export function reduceTokenSize(
  typeId: number,
  metadata: Metadata,
  _map = new Map<number, number>(),
  _set = new Set<number>(),
) {
  if (_set.has(typeId)) return;
  _set.add(typeId);

  const { types } = metadata.latest;
  const { typeDef } = types[typeId];
  const { type, value } = typeDef;

  switch (type) {
    case 'Struct':
      value.fields = reduceFieldSize(value.fields, metadata, _map, _set) as any;

      break;
    case 'Enum':
      value.members = value.members.map(({ fields, index }, idx) => ({
        name: `${idx}`,
        fields: reduceFieldSize(fields, metadata, _map, _set) as any,
        index,
        docs: [],
      }));

      break;
    case 'Sequence':
    case 'SizedVec':
      try {
        if (isPrimitive(types[value.typeParam].typeDef)) return;

        const size = howManyBytesItTake(value.typeParam, metadata);

        if (size === 0) return;

        ensureSubTypes(size, metadata, _map);

        value.typeParam = _map.get(size)!;
      } catch {
        reduceTokenSize(value.typeParam, metadata, _map, _set);
      }

      break;
    case 'Tuple':
      try {
        const size = howManyBytesItTake(typeId, metadata);

        if (size === 0) return;

        ensureSubTypes(size, metadata, _map);

        value.fields = [_map.get(size)!];
      } catch (e) {
        const undeterminedTypes: number[] = [];

        let size = 0;
        value.fields.forEach((typeId) => {
          try {
            size += howManyBytesItTake(typeId, metadata);
          } catch (e) {
            undeterminedTypes.push(typeId);
          }
        });

        if (size !== 0) {
          ensureSubTypes(size, metadata, _map);

          value.fields = [...undeterminedTypes, _map.get(size)!];
        }
        // Worst case
        else {
          value.fields.forEach((typeId) => reduceTokenSize(typeId, metadata, _map, _set));
        }
      }

      break;
    case 'Primitive':
    case 'Compact':
    case 'BitSequence':
    // Have nothing to reduce =))
  }
}

export function isPrimitive({ type }: TypeDef) {
  return type === 'Primitive';
}

export function isFlatEnum({ type, value }: TypeDef) {
  assert(type === 'Enum', 'A Enum typeDef is expected!');

  return value.members.every((member) => member.fields.length === 0);
}

export function howManyBytesItTake(typeId: number, metadata: Metadata): number {
  const { typeDef } = metadata.latest.types[typeId];
  const { type, value } = typeDef;

  switch (type) {
    case 'Struct':
      return value.fields.reduce((a, { typeId }) => a + howManyBytesItTake(typeId, metadata), 0);
    case 'Enum':
      if (isFlatEnum(typeDef)) {
        return 1;
      }

      throw new UndeterminedSizeType(typeDef);
    case 'SizedVec':
      return value.len * howManyBytesItTake(value.typeParam, metadata);
    case 'Tuple':
      return value.fields.reduce((a, typeId) => a + howManyBytesItTake(typeId, metadata), 0);
    case 'Primitive':
      switch (value.kind) {
        case 'bool':
        case 'char':
        case 'u8':
        case 'i8':
          return 1;
        case 'u16':
        case 'i16':
          return 2;
        case 'u32':
        case 'i32':
          return 4;
        case 'u64':
        case 'i64':
          return 8;
        case 'u128':
        case 'i128':
          return 16;
        case 'u256':
        case 'i256':
          return 32;
        case 'str':
          throw new UndeterminedSizeType(typeDef);
      }
    case 'Compact':
    case 'BitSequence':
    case 'Sequence':
      throw new UndeterminedSizeType(typeDef);
  }
}

export function addToMap<K, V>(map: Map<K, Set<V>>, key: K, value?: V) {
  if (!value) {
    map.set(key, new Set<V>());
  } else {
    if (map.has(key)) {
      map.get(key)!.add(value);
    } else {
      map.set(key, new Set<V>([value]));
    }
  }
}
