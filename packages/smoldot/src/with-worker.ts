// @ts-nocheck
import {
  type Client,
  type ClientOptionsWithBytecode,
  type SmoldotBytecode,
  startWithBytecode,
} from 'smoldot/no-auto-bytecode';

export { Client };
export type StartWithWorkerOptions = Omit<ClientOptionsWithBytecode, 'bytecode' | 'portToWorker'>;

/**
 * Initializes a smoldot client that runs in a Web Worker.
 *
 * Inspired By: https://smol-dot.github.io/smoldot/doc-javascript/#md:usage-with-a-worker
 *
 * @param worker - Web Worker instance created from '@dedot/smoldot/worker'
 * @param options - Optional configuration options for the smoldot client
 * @returns A smoldot Client instance
 *
 * @example
 * import { startWithWorker } from '@dedot/smoldot/with-worker';
 * import SmoldotWorker from '@dedot/smoldot/worker?worker';
 *
 * // Initialize smoldot with a worker
 * const smoldot = startWithWorker(new SmoldotWorker());
 *
 * // Add a chain
 * const chain = smoldot.addChain({
 *   chainSpec: '...' // Your chain specification
 * });
 */
export const startWithWorker = (worker: Worker, options?: StartWithWorkerOptions): Client => {
  const bytecode = new Promise<SmoldotBytecode>((resolve) => {
    worker.onmessage = (event) => resolve(event.data);
  });

  const { port1, port2 } = new MessageChannel();
  worker.postMessage(port1, [port1]);

  return startWithBytecode({
    bytecode,
    portToWorker: port2,
    ...options,
  });
};
