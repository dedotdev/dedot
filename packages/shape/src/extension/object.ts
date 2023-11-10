import { isHex, isString, isU8a } from '@polkadot/util';
import {
  AnyShape,
  InputObject,
  object as originalObject,
  ObjectMembers,
  OutputObject,
  Shape,
  optionalField,
} from 'subshape';

function shouldDecodeObject(input: any) {
  // TODO check if the shape is actually an $.object

  if (isHex(input) || isU8a(input) || isString(input)) {
    return false;
  }

  return true;
}

function decodeObject($shape: Shape<any>, input: any) {
  const { args } = $shape.metadata[0];

  return args!
    .map((one) => one.metadata[0])
    .reduce((o, { factory, args: [name, field] }) => {
      const fieldInput = input[name];
      const isOptional = factory === optionalField;

      if (isOptional && (fieldInput === null || fieldInput === undefined)) {
        o[name] = undefined;
      } else {
        o[name] = field.tryDecode(fieldInput);
      }

      return o;
    }, {} as any);
}

export function object<T extends AnyShape[]>(...members: ObjectMembers<T>): Shape<InputObject<T>, OutputObject<T>> {
  const shaped = originalObject(...members);

  shaped.registerDecoder(shouldDecodeObject, decodeObject);

  return shaped;
}
