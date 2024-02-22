import {
  AnyShape,
  AnyVariant,
  DecodeBuffer,
  Expand,
  field,
  Input,
  Output,
  Shape,
  ShapeDecodeError,
  taggedUnion,
  variant,
} from 'subshape';
import { isHex, isObject, isString, stringCamelCase } from '@polkadot/util';

export type IndexedEnumMember<V extends AnyShape> = { value?: V | null; index: number };

export type EnumMembers<V extends AnyShape> = {
  [prop: string]: V | null | IndexedEnumMember<V>;
};

export type InputEnumShape<V extends AnyShape, A extends EnumMembers<V>> = Expand<
  {
    [K in keyof A]: A[K] extends AnyShape
      ? { tag: K; value: Input<A[K]> }
      : A[K] extends IndexedEnumMember<V>
        ? A[K]['value'] extends AnyShape
          ? { tag: K; value: Input<A[K]['value']> }
          : { tag: K }
        : { tag: K };
  }[keyof A]
>;

export type OutputEnumShape<V extends AnyShape, A extends EnumMembers<V>> = Expand<
  {
    [K in keyof A]: A[K] extends AnyShape
      ? { tag: K; value: Output<A[K]> }
      : A[K] extends IndexedEnumMember<V>
        ? A[K]['value'] extends AnyShape
          ? { tag: K; value: Output<A[K]['value']> }
          : { tag: K }
        : { tag: K };
  }[keyof A]
>;

// TODO type suggestions for customized enum labels
export interface EnumOptions {
  tagKey?: string;
  valueKey?: string;
}

export const Enum = <T extends AnyShape, A extends EnumMembers<T>>(
  members: A,
  options?: EnumOptions,
): Shape<InputEnumShape<T, A>, OutputEnumShape<T, A>> => {
  const tagKey = options?.tagKey || 'tag';
  const valueKey = options?.valueKey || 'value';

  const enumMembers: Record<number, AnyVariant> = {};

  Object.keys(members).forEach((keyName, keyIndex) => {
    if (members[keyName]) {
      const { index, value } = members[keyName] as IndexedEnumMember<T>;
      if (Number.isInteger(index)) {
        if (value) {
          enumMembers[index] = variant(keyName, field(valueKey, value as any));
        } else {
          enumMembers[index] = variant(keyName);
        }
      } else {
        enumMembers[keyIndex] = variant(keyName, field(valueKey, members[keyName] as any));
      }
    } else {
      enumMembers[keyIndex] = variant(keyName);
    }
  });

  const shaped = taggedUnion(tagKey, enumMembers);

  shaped.registerDecoder(
    (input) => shouldDecodeSerdePlainValue(input, { tagKey }),
    (shape, input) => decodeSerdePlainValue(shape, input, { tagKey, valueKey }),
  );

  // @ts-ignore
  return shaped;
};

const shouldDecodeSerdePlainValue = (input: any, { tagKey }: EnumOptions) => {
  return (isString(input) && !isHex(input)) || (isObject(input) && !input[tagKey!]);
};

const decodeSerdePlainValue = ($shape: Shape<any>, input: any, { tagKey, valueKey }: EnumOptions) => {
  const members: Record<number, AnyVariant> = $shape.metadata[0].args![1];
  const variants = Object.values(members);

  if (isString(input)) {
    const targetVariant = variants.find((v) => v.tag === input || stringCamelCase(v.tag) === input);
    if (targetVariant) {
      const shapeMembers = targetVariant.shape.metadata[0].args;

      if (shapeMembers && shapeMembers.length === 0) {
        return { [tagKey!]: targetVariant.tag };
      }
    }
  } else if (isObject(input)) {
    const targetVariant = variants.find((v) => !!input[v.tag] || !!input[stringCamelCase(v.tag)]);

    if (targetVariant) {
      // TODO docs!
      const targetShape = targetVariant.shape.metadata[0].args![0].metadata[0].args![1];
      const value = input[targetVariant.tag] || input[stringCamelCase(targetVariant.tag)];
      return {
        [tagKey!]: targetVariant.tag,
        [valueKey!]: targetShape.tryDecode(value),
      };
    }
  }

  throw new ShapeDecodeError(
    $shape,
    new DecodeBuffer(new Uint8Array()),
    `Cannot decode plain serde input: ${JSON.stringify(input)}`,
  );
};
