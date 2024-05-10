import { noop } from './misc.js';

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
};

export function deferred<T>(): Deferred<T> {
  let done = false;
  let resolve: (value: T) => void = noop;
  let reject: (error?: Error) => void = noop;

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = (value: T) => {
      if (done) return;

      done = true;
      _resolve(value);
    };
    reject = (error?: Error) => {
      if (done) return;

      done = true;
      _reject(error);
    };
  });

  return {
    promise,
    resolve,
    reject,
  };
}
