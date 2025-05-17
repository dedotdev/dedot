// @ts-nocheck
import { Client, ClientOptionsWithBytecode, SmoldotBytecode, startWithBytecode } from 'smoldot/no-auto-bytecode';

export { Client };
export type StartWithWorkerOptions = Omit<ClientOptionsWithBytecode, 'bytecode' | 'portToWorker'>;

// Inspired From: // Source Code: https://smol-dot.github.io/smoldot/doc-javascript/#md:usage-with-a-worker
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
