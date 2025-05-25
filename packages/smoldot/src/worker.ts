// @ts-nocheck
// Inspired By: https://smol-dot.github.io/smoldot/doc-javascript/#md:usage-with-a-worker
import { compileBytecode } from 'smoldot/bytecode';
import { run } from 'smoldot/worker';

compileBytecode().then((bytecode) => postMessage(bytecode));
onmessage = (msg) => run(msg.data);
