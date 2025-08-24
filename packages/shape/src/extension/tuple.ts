import { toU8a } from '@dedot/utils';
import { tuple as originalTuple, Shape, InputTuple, OutputTuple, AnyShape } from '../deshape.js';

function shouldDecodeTuple(input: any) {
  return Array.isArray(input);
}

function decodeTuple($shape: Shape<any>, input: Array<any>) {
  const { args } = $shape.metadata[0];

  const $innerShapes = args!;

  return $innerShapes.map(($innerShape, index) => {
    const inner = input[index];
    try {
      return $innerShape.tryDecode(inner);
    } catch {
      return $innerShape.tryDecode(toU8a(inner));
    }
  });
}

export function tuple<T extends AnyShape[]>(...shapes: [...T]): Shape<InputTuple<T>, OutputTuple<T>> {
  const shaped = originalTuple(...shapes);

  shaped.registerDecoder(shouldDecodeTuple, decodeTuple);

  // @ts-ignore
  return shaped;
}
