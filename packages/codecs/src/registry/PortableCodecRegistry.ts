import { Type, TypeId } from '@delightfuldot/codecs';
import * as $ from '@delightfuldot/shape';
import { normalizeName } from '@delightfuldot/utils';
import { CodecRegistry } from './CodecRegistry';

const KNOWN_CODECS = ['AccountId32'];

export class PortableCodecRegistry {
  readonly types: Record<TypeId, Type>;
  readonly #cache: Map<TypeId, $.AnyShape>;
  readonly #registry: CodecRegistry;

  constructor(types: Type[] | Record<TypeId, Type>, registry: CodecRegistry) {
    this.#registry = registry;

    if (Array.isArray(types)) {
      this.types = types.reduce((o, one) => {
        o[one.id] = one;
        return o;
      }, {} as Record<TypeId, Type>);
    } else {
      this.types = types;
    }

    this.#cache = new Map();
  }

  findCodec(typeId: TypeId): $.AnyShape {
    const typeDef = this.types[typeId];
    if (typeDef && typeDef.path.length > 0) {
      try {
        const codecName = typeDef.path.at(-1)!;
        if (KNOWN_CODECS.includes(codecName)) {
          const $knownCodec = this.#registry.findCodec(codecName);
          return $knownCodec;
        }
      } catch (e) {
        // ignore
      }
    }

    if (this.#cache.has(typeId)) {
      return this.#cache.get(typeId)!;
    }

    // TODO check this recursion issue again, add docs!
    this.#cache.set(typeId, $.Bytes);

    const $codec = this.#createCodec(typeId);
    this.#cache.set(typeId, $codec);

    return $codec;
  }

  // TODO refactor this!
  #createCodec = (typeId: TypeId): $.AnyShape => {
    const def = this.types[typeId];

    if (!def) {
      throw new Error(`Type id not found ${typeId}`);
    }

    const { type, path } = def;
    const { tag, value } = type;

    // TODO implement alias
    if (tag === 'Struct') {
      const { fields } = value;

      if (fields.length === 0) {
        return $.Null;
      } else if (fields[0].name === undefined) {
        if (fields.length === 1) {
          return this.findCodec(fields[0]!.typeId);
        } else {
          return $.Tuple(...fields.map((x) => this.findCodec(x.typeId)));
        }
      } else {
        return $.Struct(
          fields.reduce(
            (o, field) => ({
              ...o,
              [normalizeName(field.name!)]: this.findCodec(field.typeId),
            }),
            {} as $.StructMembers<$.AnyShape>,
          ),
        );
      }
    } else if (tag === 'Tuple') {
      const { fields } = value;

      if (fields.length === 0) {
        return $.Null;
      } else if (fields.length === 1) {
        // wrapper
        return this.findCodec(fields[0]!);
      } else {
        return $.Tuple(...fields.map((x) => this.findCodec(x)));
      }
    } else if (tag === 'Enum') {
      const { members } = value;

      // Handle optional field
      if (path[0] === 'Option') {
        const some = members.find((one) => one.name === 'Some');
        if (some) {
          const $codec = this.findCodec(some.fields[0].typeId);
          if ($codec.metadata[0].name === '$.bool') {
            return $.optionBool;
          } else {
            return $.Option($codec);
          }
        }
      }

      if (members.length === 0) {
        return $.never as any;
      } else if (members.every((x) => x.fields.length === 0)) {
        const enumMembers: Record<number, string> = {};
        for (const { index, name } of members) {
          enumMembers[index] = name;
        }

        return $.FlatEnum(enumMembers);
      } else {
        const enumMembers: $.EnumMembers<$.AnyShape> = {};
        for (const { fields, name, index } of members) {
          const keyName = name;
          if (fields.length === 0) {
            enumMembers[keyName] = { index };
          } else if (fields[0]!.name === undefined) {
            const $value =
              fields.length === 1
                ? this.findCodec(fields[0].typeId)
                : $.Tuple(...fields.map((f) => this.findCodec(f.typeId)));
            enumMembers[keyName] = { index, value: $value };
          } else {
            enumMembers[keyName] = {
              index,
              value: $.Struct(
                fields.reduce(
                  (o, field) => ({
                    ...o,
                    [normalizeName(field.name!)]: this.findCodec(field.typeId),
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
      const $inner = this.findCodec(type.value.typeParam);
      if ($inner === $.u8) {
        return $.PrefixedHex;
      } else {
        return $.Vec($inner);
      }
    } else if (tag === 'SizedVec') {
      const $inner = this.findCodec(type.value.typeParam);
      if ($inner === $.u8) {
        return $.FixedHex(type.value.len);
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
      return $.compact(this.findCodec(type.value.typeParam));
    } else if (tag === 'BitSequence') {
      return $.bitSequence;
    }

    throw Error(`Not support yet! ${JSON.stringify(def, null, 2)}`);
  };
}
