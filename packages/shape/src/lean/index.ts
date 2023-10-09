import {
  AnyShape,
  Expand,
  field,
  Input,
  literalUnion,
  optionalField,
  Output,
  Shape,
  taggedUnion,
  tuple,
  variant,
  result,
  option,
  uint8Array,
  sizedUint8Array
} from 'subshape';
import { array, object } from '../extension';

type StructMembers<T extends AnyShape> = {
  [prop: string]: T;
};

type InputStructShape<T extends AnyShape, A extends StructMembers<T>> = Expand<{ [K in keyof A]: Input<A[K]> }>;
type OutputStructShape<T extends AnyShape, A extends StructMembers<T>> = Expand<{ [K in keyof A]: Output<A[K]> }>;

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

type EnumMembers<V extends AnyShape> = {
  [prop: string]: V | null;
};

type InputEnumShape<V extends AnyShape, A extends EnumMembers<V>> = Expand<
  { [K in keyof A]: { tag: K; value: A[K] extends AnyShape ? Input<A[K]> : never } }[keyof A]
>;

type OutputEnumShape<V extends AnyShape, A extends EnumMembers<V>> = Expand<
  { [K in keyof A]: { tag: K; value: A[K] extends AnyShape ? Output<A[K]> : never } }[keyof A]
>;

export const Enum = <T extends AnyShape, A extends EnumMembers<T>>(
  members: A,
): Shape<InputEnumShape<T, A>, OutputEnumShape<T, A>> => {
  const valueEmptied = Object.values(members).every((one) => !one);

  if (valueEmptied) {
    // @ts-ignore
    return literalUnion(Object.keys(members));
  }

  const fields = Object.keys(members).map((keyName) => {
    if (members[keyName]) {
      return variant(keyName, field('value', members[keyName] as any));
    } else {
      return variant(keyName);
    }
  });

  // @ts-ignore
  return taggedUnion('tag', fields);
};

export const Option = option;
export const Tuple = tuple;
export const Vec = array;
export const Result = result;

export const u8a = uint8Array;
export const sizedU8a = sizedUint8Array;
