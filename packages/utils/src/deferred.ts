import { noop } from './misc.js';

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
};

export function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = noop;
  let reject: (error?: Error) => void = noop;

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}
