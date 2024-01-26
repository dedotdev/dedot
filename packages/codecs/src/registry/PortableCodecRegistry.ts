import { PortableType, TypeId } from '@delightfuldot/codecs';
import * as $ from '@delightfuldot/shape';
import { EnumOptions } from '@delightfuldot/shape';
import { normalizeName } from '@delightfuldot/utils';
import { CodecRegistry } from './CodecRegistry';
import { stringPascalCase } from '@polkadot/util';

const KNOWN_CODECS = ['AccountId32', 'Header', 'Digest', 'DigestItem', 'Data', 'MultiAddress', 'Era'];

/**
 * Codec registry for portable types from metadata
 */
export class PortableCodecRegistry {
  readonly types: Record<TypeId, PortableType>;
  readonly #cache: Map<TypeId, $.AnyShape>;
  readonly #registry: CodecRegistry;

  constructor(types: PortableType[] | Record<TypeId, PortableType>, registry: CodecRegistry) {
    this.#registry = registry;

    if (Array.isArray(types)) {
      this.types = types.reduce(
        (o, one) => {
          o[one.id] = one;
          return o;
        },
        {} as Record<TypeId, PortableType>,
      );
    } else {
      this.types = types;
    }

    this.#cache = new Map();
  }

  findType(typeId: TypeId): PortableType {
    const type = this.types[typeId];
    if (!type) {
      throw new Error(`Cannot find portable type for id: ${typeId}`);
    }

    return type;
  }

  findCodec(typeId: TypeId): $.AnyShape {
    const typeDef = this.findType(typeId);
    if (typeDef && typeDef.path.length > 0) {
      try {
        const codecName = typeDef.path.at(-1)!;
        if (KNOWN_CODECS.includes(codecName)) {
          return this.#registry.findCodec(codecName);
        }
      } catch (e) {
        // ignore
      }
    }

    if (this.#cache.has(typeId)) {
      return this.#cache.get(typeId)!;
    }

    // A placeholder codec for typeId so if this typeId is used in the `#createCodec`
    // the recursion will be resolved
    this.#cache.set(typeId, $.Bytes);

    const $codec = this.#createCodec(typeId);
    this.#cache.set(typeId, $codec);

    return $codec;
  }

  // Create codec for a portable type from its type definition
  // TODO refactor this!
  #createCodec = (typeId: TypeId): $.AnyShape => {
    const def = this.types[typeId];

    if (!def) {
      throw new Error(`Type id not found ${typeId}`);
    }

    const { type, path } = def;
    const { tag, value } = type;

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
      if (path.join('::') === 'Option') {
        const some = members.find((one) => one.name === 'Some');
        if (some) {
          const $codec = this.findCodec(some.fields[0].typeId);
          if ($codec.metadata[0].name === '$.bool') {
            return $.optionBool;
          } else {
            return $.Option($codec);
          }
        }
      } else if (path.join('::') === 'Result') {
        const ok = members.find((one) => one.name === 'Ok');
        const err = members.find((one) => one.name === 'Err');
        if (ok && err) {
          const $OkCodec = this.findCodec(ok.fields[0].typeId);
          const $ErrCodec = this.findCodec(err.fields[0].typeId);

          return $.Result($OkCodec, $ErrCodec);
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
          const keyName = stringPascalCase(name);
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
        return $.Enum(enumMembers, this.getEnumOptions(path));
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

  /**
   * Custom enum labels for different types
   *
   * @param path
   */
  getEnumOptions(path: string[]): EnumOptions {
    const fullPath = path.join('::');

    if (fullPath.endsWith('RuntimeEvent')) {
      return {
        tagKey: 'pallet',
        valueKey: 'palletEvent',
      };
    } else if (fullPath.endsWith('::pallet::Event')) {
      return {
        tagKey: 'name',
        valueKey: 'data',
      };
    }

    return {
      tagKey: 'tag',
      valueKey: 'value',
    };
  }
}
