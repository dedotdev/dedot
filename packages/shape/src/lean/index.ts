import {
  AnyShape,
  Expand,
  field,
  Input,
  literalUnion,
  option,
  optionalField,
  Output,
  result,
  Shape,
  sizedArray,
  sizedUint8Array,
  taggedUnion,
  tuple,
  uint8Array,
  variant,
} from 'subshape';
import * as $ from '../extension';
import { array, object } from '../extension';

export type StructMembers<T extends AnyShape> = {
  [prop: string]: T;
};

export type InputStructShape<T extends AnyShape, A extends StructMembers<T>> = Expand<{ [K in keyof A]: Input<A[K]> }>;
export type OutputStructShape<T extends AnyShape, A extends StructMembers<T>> = Expand<{
  [K in keyof A]: Output<A[K]>;
}>;

export const Struct = <T extends AnyShape, A extends StructMembers<T>>(
  members: A,
): Shape<InputStructShape<T, A>, OutputStructShape<T, A>> => {
  const fields: Shape<any>[] = Object.keys(members).map((keyName) => {
    const member = members[keyName];
    const [metadata] = member.metadata;

    const isOptional = metadata.name === '$.option';

    return isOptional ? optionalField(keyName, metadata.args![0]) : field(keyName, member);
  });

  // @ts-ignore
  return object(...fields);
};

export type IndexedEnumMember<V extends AnyShape> = { value?: V | null; index: number };

export type EnumMembers<V extends AnyShape> = {
  [prop: string]: V | null | IndexedEnumMember<V>;
};

export type InputEnumShape<V extends AnyShape, A extends EnumMembers<V>> = Expand<
  {
    [K in keyof A]: {
      tag: K;
      value: A[K] extends AnyShape
        ? Input<A[K]>
        : A[K] extends IndexedEnumMember<V>
        ? Input<A[K]['value'] extends AnyShape ? A[K]['value'] : Shape<never>>
        : never;
    };
  }[keyof A]
>;

export type OutputEnumShape<V extends AnyShape, A extends EnumMembers<V>> = Expand<
  {
    [K in keyof A]: {
      tag: K;
      value: A[K] extends AnyShape
        ? Output<A[K]>
        : A[K] extends IndexedEnumMember<V>
        ? Output<A[K]['value'] extends AnyShape ? A[K]['value'] : Shape<never>>
        : never;
    };
  }[keyof A]
>;

export const Enum = <T extends AnyShape, A extends EnumMembers<T>>(
  members: A,
): Shape<InputEnumShape<T, A>, OutputEnumShape<T, A>> => {
  const enumMembers: Record<number, $.AnyVariant> = {};

  Object.keys(members).forEach((keyName, keyIndex) => {
    if (members[keyName]) {
      const { index, value } = members[keyName] as IndexedEnumMember<T>;
      if (Number.isInteger(index)) {
        if (value) {
          enumMembers[index] = variant(keyName, field('value', value as any));
        } else {
          enumMembers[index] = variant(keyName);
        }
      } else {
        enumMembers[keyIndex] = variant(keyName, field('value', members[keyName] as any));
      }
    } else {
      enumMembers[keyIndex] = variant(keyName);
    }
  });

  // @ts-ignore
  return taggedUnion('tag', enumMembers);
};

export const FlatEnum = literalUnion;

export const Option = option;
export const Tuple = tuple;
export const Vec = array;
export const SizedVec = sizedArray;
export const U8a = uint8Array;
export const SizedU8a = sizedUint8Array;

export const Result = result;
