import { instance as originalInstance, Shape, AssertState } from '../deshape.js';

export function instance<AI extends readonly unknown[], AO extends readonly unknown[], I, O>(
  ctor: new (...args: AO) => O,
  $args: Shape<AI, AO>,
  toArgs: (value: I) => [...AI],
): Shape<I, O> {
  const shaped = originalInstance(ctor, $args, toArgs);

  shaped.subAssert = function (assert: AssertState) {
    $args.subAssert(new AssertState(toArgs(assert.value as I), '#arguments', assert));
  };

  return shaped;
}
