import { AnyShape, Expand, field, Input, optionalField, Output, Shape } from '../deshape.js';
import { object } from '../extension/index.js';

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
