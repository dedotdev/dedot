import { noop } from './misc.js';

export function deferred<T>() {
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
