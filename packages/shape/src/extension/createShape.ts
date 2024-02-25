import { createShape as originCreateShape, Shape, AssertState } from 'subshape';

const notImplemented = () => {
  throw new Error('subAssert is not implemented!');
};

export function createShape<I, O = I>(
  _shape: ThisType<Shape<I, O>> &
    Pick<Shape<I, O>, 'subEncode' | 'subDecode' | 'staticSize' | 'metadata'> &
    Partial<Pick<Shape<I, O>, 'subAssert'>>,
): Shape<I, O> {
  const { staticSize, subEncode, subDecode, metadata, subAssert } = _shape;

  return originCreateShape({
    staticSize,
    subEncode,
    subDecode,
    metadata,
    subAssert: subAssert || notImplemented,
  });
}
