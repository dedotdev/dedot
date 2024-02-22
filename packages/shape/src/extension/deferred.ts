import { deferred as originalDeferred, Shape } from 'subshape';

export function deferred<I, O>(getShape: (...args: any[]) => Shape<I, O>): Shape<I, O> {
  return originalDeferred(getShape);
}
