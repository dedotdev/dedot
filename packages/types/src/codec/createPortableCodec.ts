import * as $ from '@delightfuldot/shape';
import { Metadata } from '../metadata';

export const $null = $.withMetadata($.metadata('$null'), $.constant(null));

// TODO Remove special characters
export function normalizeName(ident: string) {
  return ident.replace('#', '_');
}

export const createPortableCodec = (metadata: Metadata, typeId: number): $.AnyShape => {
  const def = metadata.types[typeId];

  if (!def) {
    throw new Error(`Type id not found ${typeId}`);
  }

  const { type, path } = def;
  const { tag, value } = type;

  // TODO implement alias
  if (tag === 'Struct') {
    const { fields } = value;

    if (fields.length === 0) {
      return $null;
    } else if (fields[0].name === undefined) {
      if (fields.length === 1) {
        // wrapper
        return createPortableCodec(metadata, fields[0]!.typeId);
      } else {
        return $.Tuple(...fields.map((x) => createPortableCodec(metadata, x.typeId)));
      }
    } else {
      return $.Struct(
        fields.reduce(
          (o, field) => ({
            ...o,
            [normalizeName(field.name!)]: createPortableCodec(metadata, field.typeId),
          }),
          {} as $.StructMembers<$.AnyShape>,
        ),
      );
    }
  } else if (tag === 'Tuple') {
    const { fields } = value;

    if (fields.length === 0) {
      return $null;
    } else if (fields.length === 1) {
      // wrapper
      return createPortableCodec(metadata, fields[0]!);
    } else {
      return $.Tuple(...fields.map((x) => createPortableCodec(metadata, x)));
    }
  } else if (tag === 'Enum') {
    const { members } = value;

    // Handle Optional Field
    if (path[0] === 'Option') {
      const some = members.find((one) => one.name === 'Some');
      if (some) {
        return $.Option(createPortableCodec(metadata, some.fields[0].typeId));
      }
    }

    if (members.length === 0) {
      return $.never as any;
    } else if (members.every((x) => x.fields.length === 0)) {
      const enumMembers: Record<number, string> = {};
      for (const { index, name } of members) {
        enumMembers[index] = normalizeName(name);
      }

      return $.FlatEnum(enumMembers);
    } else {
      const enumMembers: $.EnumMembers<$.AnyShape> = {};
      for (const { fields, name, index } of members) {
        const keyName = normalizeName(name);
        if (fields.length === 0) {
          enumMembers[keyName] = { index };
        } else if (fields[0]!.name === undefined) {
          const $value =
            fields.length === 1
              ? createPortableCodec(metadata, fields[0].typeId)
              : $.Tuple(...fields.map((f) => createPortableCodec(metadata, f.typeId)));
          enumMembers[keyName] = { index, value: $value };
        } else {
          enumMembers[keyName] = {
            index,
            value: $.Struct(
              fields.reduce(
                (o, field) => ({
                  ...o,
                  [normalizeName(field.name!)]: createPortableCodec(metadata, field.typeId),
                }),
                {} as $.StructMembers<$.AnyShape>,
              ),
            ),
          };
        }
      }
      return $.Enum(enumMembers);
    }
  } else if (tag === 'Sequence') {
    const $inner = createPortableCodec(metadata, type.value.typeParam);
    if ($inner === $.u8) {
      return $.U8a;
    } else {
      return $.Vec($inner);
    }
  } else if (tag === 'SizedVec') {
    const $inner = createPortableCodec(metadata, type.value.typeParam);
    if ($inner === $.u8) {
      return $.SizedU8a(type.value.len);
    } else {
      return $.SizedVec($inner, type.value.len);
    }
  } else if (tag === 'Primitive') {
    const kind = type.value.kind;
    if (kind === 'char') {
      return $.str;
    }

    const $codec = $[kind];
    if (!$codec) {
      throw new Error(`Invalid primitive kind: ${kind}`);
    }

    return $codec;
  } else if (tag === 'Compact') {
    return $.compact(createPortableCodec(metadata, type.value.typeParam));
  } else if (tag === 'BitSequence') {
    return $.bitSequence;
  }

  throw Error(`Not support yet! ${JSON.stringify(def, null, 2)}`);
};
